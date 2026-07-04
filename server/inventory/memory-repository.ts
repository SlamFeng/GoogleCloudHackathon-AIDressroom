import type { InventoryRepository } from "./repository.js";
import { availabilityOf, isLowStock, projectSearch } from "./query-helpers.js";
import type {
  InventoryLevel,
  InventorySearchQuery,
  Product,
  ProductAvailability,
  Reservation,
  ReservationItem,
  ReservationShortfall,
  ReservationStatus,
  ReserveInput,
  ReserveResult,
  RestockInput,
  StockCount
} from "./types.js";

// Re-exported for tests and callers that import availability math from here.
export { availabilityOf };

const DEFAULT_TTL_SEC = 900;

/**
 * In-memory inventory backend for local dev and tests.
 *
 * Atomicity guarantee: every mutating method performs its read-check-write in a
 * single synchronous block with no `await` inside. On Node's single-threaded
 * event loop that block runs to completion before any other reserve/confirm can
 * start, so two sessions racing for the last unit can never both succeed — the
 * same invariant Firestore gives us via `runTransaction`.
 */
export class InMemoryInventoryRepository implements InventoryRepository {
  private readonly products = new Map<string, Product>();
  private readonly levels = new Map<string, InventoryLevel>();
  private readonly reservations = new Map<string, Reservation>();
  private readonly defaultTtlSec: number;

  constructor(seed?: { products?: Product[]; levels?: InventoryLevel[]; defaultTtlSec?: number }) {
    this.defaultTtlSec = seed?.defaultTtlSec ?? DEFAULT_TTL_SEC;
    for (const product of seed?.products ?? []) this.products.set(product.product_id, structuredClone(product));
    for (const level of seed?.levels ?? []) this.levels.set(level.product_id, structuredClone(level));
  }

  async listProducts(filter?: { includeInactive?: boolean }): Promise<Product[]> {
    const all = [...this.products.values()];
    const visible = filter?.includeInactive ? all : all.filter((p) => p.active);
    return visible.map((p) => structuredClone(p));
  }

  async getProduct(productId: string): Promise<Product | null> {
    const product = this.products.get(productId);
    return product ? structuredClone(product) : null;
  }

  async upsertProduct(product: Product): Promise<Product> {
    this.products.set(product.product_id, structuredClone(product));
    return structuredClone(product);
  }

  async deactivateProduct(productId: string): Promise<boolean> {
    const product = this.products.get(productId);
    if (!product) return false;
    product.active = false;
    product.updated_at = new Date().toISOString();
    return true;
  }

  async getLevel(productId: string): Promise<InventoryLevel | null> {
    const level = this.levels.get(productId);
    return level ? structuredClone(level) : null;
  }

  async listLevels(): Promise<InventoryLevel[]> {
    return [...this.levels.values()].map((l) => structuredClone(l));
  }

  async search(query: InventorySearchQuery): Promise<ProductAvailability[]> {
    const products = [...this.products.values()].map((p) => structuredClone(p));
    const levelByProduct = new Map([...this.levels.entries()].map(([id, l]) => [id, structuredClone(l)]));
    return projectSearch(products, levelByProduct, query);
  }

  async lowStock(): Promise<Array<{ product: Product; level: InventoryLevel }>> {
    const out: Array<{ product: Product; level: InventoryLevel }> = [];
    for (const level of this.levels.values()) {
      const product = this.products.get(level.product_id);
      if (!product || !product.active) continue;
      if (isLowStock(level)) {
        out.push({ product: structuredClone(product), level: structuredClone(level) });
      }
    }
    return out;
  }

  async reserve(input: ReserveInput, reservationId: string, now: Date): Promise<ReserveResult> {
    // --- atomic critical section: no `await` from here to the return ---
    const relevantLevels = new Map<string, InventoryLevel>();
    for (const item of input.items) {
      const level = this.levels.get(item.product_id);
      if (!this.products.has(item.product_id) || !level) {
        return {
          ok: false,
          reason: "unknown_product",
          shortfalls: [{ product_id: item.product_id, size: item.size, requested: item.qty, available: 0 }]
        };
      }
      relevantLevels.set(item.product_id, level);
    }

    const plan = planReservation(input.items, relevantLevels);
    if (!plan.ok) {
      return { ok: false, reason: "insufficient_stock", shortfalls: plan.shortfalls };
    }

    const iso = now.toISOString();
    for (const item of input.items) {
      const level = relevantLevels.get(item.product_id)!;
      const count = ensureSize(level, item.size);
      count.reserved += item.qty;
      level.updated_at = iso;
    }

    const ttlSec = input.ttl_sec ?? this.defaultTtlSec;
    const reservation: Reservation = {
      reservation_id: reservationId,
      session_id: input.session_id,
      items: structuredClone(input.items),
      status: "held",
      created_at: iso,
      expires_at: new Date(now.getTime() + ttlSec * 1000).toISOString(),
      confirmed_at: null
    };
    this.reservations.set(reservationId, reservation);
    return { ok: true, reservation: structuredClone(reservation) };
  }

  async confirmPurchase(reservationId: string, now: Date): Promise<Reservation | null> {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) return null;
    if (reservation.status !== "held") return structuredClone(reservation);

    const iso = now.toISOString();
    for (const item of reservation.items) {
      const level = this.levels.get(item.product_id);
      if (!level) continue;
      const count = ensureSize(level, item.size);
      count.reserved = Math.max(0, count.reserved - item.qty);
      count.on_hand = Math.max(0, count.on_hand - item.qty);
      level.updated_at = iso;
    }
    reservation.status = "confirmed";
    reservation.confirmed_at = iso;
    return structuredClone(reservation);
  }

  async release(
    reservationId: string,
    status: Extract<ReservationStatus, "released" | "expired">,
    now: Date
  ): Promise<Reservation | null> {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) return null;
    if (reservation.status !== "held") return structuredClone(reservation);

    const iso = now.toISOString();
    for (const item of reservation.items) {
      const level = this.levels.get(item.product_id);
      if (!level) continue;
      const count = ensureSize(level, item.size);
      count.reserved = Math.max(0, count.reserved - item.qty);
      level.updated_at = iso;
    }
    reservation.status = status;
    return structuredClone(reservation);
  }

  async restock(input: RestockInput, now: Date): Promise<InventoryLevel | null> {
    if (!this.products.has(input.product_id)) return null;
    const level = this.ensureLevel(input.product_id);
    const iso = now.toISOString();
    for (const [size, delta] of Object.entries(input.additions)) {
      const count = ensureSize(level, size);
      count.on_hand = Math.max(0, count.on_hand + delta);
    }
    if (input.restock_threshold !== undefined) level.restock_threshold = input.restock_threshold;
    level.updated_at = iso;
    return structuredClone(level);
  }

  async setStock(productId: string, onHandBySize: Record<string, number>, now: Date): Promise<InventoryLevel | null> {
    if (!this.products.has(productId)) return null;
    const level = this.ensureLevel(productId);
    const iso = now.toISOString();
    for (const [size, onHand] of Object.entries(onHandBySize)) {
      const count = ensureSize(level, size);
      count.on_hand = Math.max(0, onHand);
    }
    level.updated_at = iso;
    return structuredClone(level);
  }

  async getReservation(reservationId: string): Promise<Reservation | null> {
    const reservation = this.reservations.get(reservationId);
    return reservation ? structuredClone(reservation) : null;
  }

  async listReservations(filter?: { session_id?: string; status?: ReservationStatus }): Promise<Reservation[]> {
    return [...this.reservations.values()]
      .filter((r) => (filter?.session_id ? r.session_id === filter.session_id : true))
      .filter((r) => (filter?.status ? r.status === filter.status : true))
      .map((r) => structuredClone(r));
  }

  async sweepExpired(now: Date): Promise<string[]> {
    const released: string[] = [];
    for (const reservation of this.reservations.values()) {
      if (reservation.status !== "held") continue;
      if (new Date(reservation.expires_at).getTime() <= now.getTime()) {
        await this.release(reservation.reservation_id, "expired", now);
        released.push(reservation.reservation_id);
      }
    }
    return released;
  }

  private ensureLevel(productId: string): InventoryLevel {
    let level = this.levels.get(productId);
    if (!level) {
      level = { product_id: productId, levels: {}, restock_threshold: 2, updated_at: new Date().toISOString() };
      this.levels.set(productId, level);
    }
    return level;
  }
}

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

function ensureSize(level: InventoryLevel, size: string): StockCount {
  let count = level.levels[size];
  if (!count) {
    count = { on_hand: 0, reserved: 0 };
    level.levels[size] = count;
  }
  return count;
}

/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ RESERVATION POLICY — the heart of "no oversell". Swap this to change how  │
 * │ the store treats partially-available carts.                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Pure function: given the requested items and a snapshot of their inventory
 * levels, decide whether the reservation can be honored. Current policy is
 * ALL-OR-NOTHING — if any single line can't be fully covered by `available`
 * (= on_hand - reserved), the whole reservation fails and every short line is
 * reported so the Agent can swap that item.
 *
 * Alternative policies you might prefer: partial fulfillment (reserve what's
 * there, report the rest), or backorder (allow available to go negative up to a
 * cap). If you change the return contract, update ReserveResult + the tests.
 */
export function planReservation(
  requested: ReservationItem[],
  levels: Map<string, InventoryLevel>
): { ok: true } | { ok: false; shortfalls: ReservationShortfall[] } {
  const shortfalls: ReservationShortfall[] = [];
  for (const item of requested) {
    const level = levels.get(item.product_id);
    const count = level?.levels[item.size];
    const available = count ? Math.max(0, count.on_hand - count.reserved) : 0;
    if (available < item.qty) {
      shortfalls.push({ product_id: item.product_id, size: item.size, requested: item.qty, available });
    }
  }
  return shortfalls.length === 0 ? { ok: true } : { ok: false, shortfalls };
}
