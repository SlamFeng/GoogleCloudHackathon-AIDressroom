import { randomUUID } from "node:crypto";
import type { InventoryRepository } from "./repository.js";
import type {
  InventoryLevel,
  InventorySearchQuery,
  Product,
  ProductAvailability,
  Reservation,
  ReservationStatus,
  ReserveInput,
  ReserveResult,
  RestockInput,
  StoreLocation
} from "./types.js";

export interface StoreRouteStop {
  product_id: string;
  name: string;
  area: string;
  shelf: string;
}

export interface StoreRoute {
  stops: StoreRouteStop[];
  summary: string;
}

export interface InventoryServiceOptions {
  /** Injectable clock so reservation timing is testable. */
  now?: () => Date;
  /** Injectable id generator so reservation ids are testable. */
  newReservationId?: () => string;
}

/**
 * Business layer over an InventoryRepository. Stateless except for the optional
 * TTL sweeper; both the ops HTTP API and the Agent tools call these methods so
 * the reservation/stock rules live in exactly one place.
 */
export class InventoryService {
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly repo: InventoryRepository,
    private readonly options: InventoryServiceOptions = {}
  ) {}

  private now(): Date {
    return this.options.now?.() ?? new Date();
  }

  private newReservationId(): string {
    return this.options.newReservationId?.() ?? `resv_${randomUUID().slice(0, 12)}`;
  }

  // --- reads ---
  search(query: InventorySearchQuery): Promise<ProductAvailability[]> {
    return this.repo.search(query);
  }

  getProduct(productId: string): Promise<Product | null> {
    return this.repo.getProduct(productId);
  }

  listProducts(includeInactive = false): Promise<Product[]> {
    return this.repo.listProducts({ includeInactive });
  }

  getLevel(productId: string): Promise<InventoryLevel | null> {
    return this.repo.getLevel(productId);
  }

  listLevels(): Promise<InventoryLevel[]> {
    return this.repo.listLevels();
  }

  lowStock() {
    return this.repo.lowStock();
  }

  listReservations(filter?: { session_id?: string; status?: ReservationStatus }) {
    return this.repo.listReservations(filter);
  }

  getReservation(reservationId: string) {
    return this.repo.getReservation(reservationId);
  }

  // --- reservation lifecycle ---
  reserve(input: ReserveInput): Promise<ReserveResult> {
    return this.repo.reserve(input, this.newReservationId(), this.now());
  }

  confirmPurchase(reservationId: string): Promise<Reservation | null> {
    return this.repo.confirmPurchase(reservationId, this.now());
  }

  release(reservationId: string): Promise<Reservation | null> {
    return this.repo.release(reservationId, "released", this.now());
  }

  // --- staff / ops stock operations ---
  async addProduct(product: Omit<Product, "created_at" | "updated_at" | "active"> & { active?: boolean }): Promise<Product> {
    const iso = this.now().toISOString();
    return this.repo.upsertProduct({
      ...product,
      active: product.active ?? true,
      created_at: iso,
      updated_at: iso
    });
  }

  async editProduct(productId: string, patch: Partial<Product>): Promise<Product | null> {
    const existing = await this.repo.getProduct(productId);
    if (!existing) return null;
    return this.repo.upsertProduct({
      ...existing,
      ...patch,
      product_id: existing.product_id,
      created_at: existing.created_at,
      updated_at: this.now().toISOString()
    });
  }

  removeProduct(productId: string): Promise<boolean> {
    return this.repo.deactivateProduct(productId);
  }

  restock(input: RestockInput): Promise<InventoryLevel | null> {
    return this.repo.restock(input, this.now());
  }

  setStock(productId: string, onHandBySize: Record<string, number>): Promise<InventoryLevel | null> {
    return this.repo.setStock(productId, onHandBySize, this.now());
  }

  // --- pickup route ---
  async buildStoreRoute(productIds: string[]): Promise<StoreRoute> {
    const stops: StoreRouteStop[] = [];
    for (const id of productIds) {
      const product = await this.repo.getProduct(id);
      if (!product) continue;
      stops.push({ product_id: id, name: product.name, ...product.location });
    }
    stops.sort(byLocation);
    return {
      stops,
      summary: stops.length
        ? `Pickup route: ${stops.map((s) => `${s.area}${s.shelf ? ` (${s.shelf})` : ""}`).join(" → ")}`
        : "No located items to route."
    };
  }

  // --- TTL sweeper ---
  startExpirySweeper(intervalMs = 60_000): void {
    if (this.sweepTimer) return;
    this.sweepTimer = setInterval(() => {
      void this.repo.sweepExpired(this.now());
    }, intervalMs);
    // Do not keep the process alive just for the sweeper.
    this.sweepTimer.unref?.();
  }

  stopExpirySweeper(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
  }

  sweepExpiredNow(): Promise<string[]> {
    return this.repo.sweepExpired(this.now());
  }
}

function byLocation(a: { area: string; shelf: string }, b: { area: string; shelf: string }): number {
  if (a.area !== b.area) return a.area.localeCompare(b.area);
  return a.shelf.localeCompare(b.shelf);
}

export type { StoreLocation };
