import { Firestore, type CollectionReference, type Transaction } from "@google-cloud/firestore";
import type { InventoryRepository } from "./repository.js";
import { planReservation } from "./memory-repository.js";
import { isLowStock, projectSearch } from "./query-helpers.js";
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
  StockCount
} from "./types.js";

const PRODUCTS = "products";
const INVENTORY = "inventory";
const RESERVATIONS = "reservations";

/**
 * Firestore-backed inventory. One document per product in `inventory/{id}` holds
 * every size, so a reservation locks exactly one doc per line item inside a
 * `runTransaction` — giving the same no-oversell guarantee as the in-memory
 * backend. Reads happen before writes (a transaction requirement).
 *
 * Respects `FIRESTORE_EMULATOR_HOST` automatically, so the same code path runs
 * against the local emulator and against real Cloud Firestore.
 */
export class FirestoreInventoryRepository implements InventoryRepository {
  private readonly db: Firestore;

  constructor(options?: { projectId?: string; firestore?: Firestore }) {
    this.db = options?.firestore ?? new Firestore(options?.projectId ? { projectId: options.projectId } : undefined);
  }

  private products(): CollectionReference<Product> {
    return this.db.collection(PRODUCTS) as CollectionReference<Product>;
  }
  private inventory(): CollectionReference<InventoryLevel> {
    return this.db.collection(INVENTORY) as CollectionReference<InventoryLevel>;
  }
  private reservations(): CollectionReference<Reservation> {
    return this.db.collection(RESERVATIONS) as CollectionReference<Reservation>;
  }

  async listProducts(filter?: { includeInactive?: boolean }): Promise<Product[]> {
    const snap = await this.products().get();
    const all = snap.docs.map((d) => d.data());
    return filter?.includeInactive ? all : all.filter((p) => p.active);
  }

  async getProduct(productId: string): Promise<Product | null> {
    const doc = await this.products().doc(productId).get();
    return doc.exists ? (doc.data() as Product) : null;
  }

  async upsertProduct(product: Product): Promise<Product> {
    await this.products().doc(product.product_id).set(product);
    return product;
  }

  async deactivateProduct(productId: string): Promise<boolean> {
    const ref = this.products().doc(productId);
    const doc = await ref.get();
    if (!doc.exists) return false;
    await ref.update({ active: false, updated_at: new Date().toISOString() });
    return true;
  }

  async getLevel(productId: string): Promise<InventoryLevel | null> {
    const doc = await this.inventory().doc(productId).get();
    return doc.exists ? (doc.data() as InventoryLevel) : null;
  }

  async listLevels(): Promise<InventoryLevel[]> {
    const snap = await this.inventory().get();
    return snap.docs.map((d) => d.data());
  }

  async search(query: InventorySearchQuery): Promise<ProductAvailability[]> {
    const [products, levels] = await Promise.all([this.listProducts(), this.listLevels()]);
    const levelByProduct = new Map(levels.map((l) => [l.product_id, l]));
    return projectSearch(products, levelByProduct, query);
  }

  async lowStock(): Promise<Array<{ product: Product; level: InventoryLevel }>> {
    const [products, levels] = await Promise.all([this.listProducts(), this.listLevels()]);
    const productById = new Map(products.map((p) => [p.product_id, p]));
    const out: Array<{ product: Product; level: InventoryLevel }> = [];
    for (const level of levels) {
      const product = productById.get(level.product_id);
      if (product && isLowStock(level)) out.push({ product, level });
    }
    return out;
  }

  async reserve(input: ReserveInput, reservationId: string, now: Date): Promise<ReserveResult> {
    const productIds = [...new Set(input.items.map((i) => i.product_id))];
    return this.db.runTransaction(async (tx): Promise<ReserveResult> => {
      const levelRefs = productIds.map((id) => this.inventory().doc(id));
      const productRefs = productIds.map((id) => this.products().doc(id));
      const levelDocs = await tx.getAll(...levelRefs);
      const productDocs = await tx.getAll(...productRefs);

      const levelByProduct = new Map<string, InventoryLevel>();
      for (let i = 0; i < productIds.length; i += 1) {
        if (!productDocs[i].exists || !levelDocs[i].exists) {
          const missing = input.items.find((it) => it.product_id === productIds[i])!;
          return {
            ok: false,
            reason: "unknown_product",
            shortfalls: [{ product_id: missing.product_id, size: missing.size, requested: missing.qty, available: 0 }]
          };
        }
        levelByProduct.set(productIds[i], levelDocs[i].data() as InventoryLevel);
      }

      const plan = planReservation(input.items, levelByProduct);
      if (!plan.ok) return { ok: false, reason: "insufficient_stock", shortfalls: plan.shortfalls };

      const iso = now.toISOString();
      for (const item of input.items) {
        const level = levelByProduct.get(item.product_id)!;
        const count = ensureSize(level, item.size);
        count.reserved += item.qty;
        level.updated_at = iso;
      }
      for (const [id, level] of levelByProduct) tx.set(this.inventory().doc(id), level);

      const ttlSec = input.ttl_sec ?? 900;
      const reservation: Reservation = {
        reservation_id: reservationId,
        session_id: input.session_id,
        items: input.items,
        status: "held",
        created_at: iso,
        expires_at: new Date(now.getTime() + ttlSec * 1000).toISOString(),
        confirmed_at: null
      };
      tx.set(this.reservations().doc(reservationId), reservation);
      return { ok: true, reservation };
    });
  }

  async confirmPurchase(reservationId: string, now: Date): Promise<Reservation | null> {
    return this.mutateReservation(reservationId, now, (reservation, tx) =>
      this.applyReservationClose(reservation, tx, now, "confirmed")
    );
  }

  async release(
    reservationId: string,
    status: Extract<ReservationStatus, "released" | "expired">,
    now: Date
  ): Promise<Reservation | null> {
    return this.mutateReservation(reservationId, now, (reservation, tx) =>
      this.applyReservationClose(reservation, tx, now, status)
    );
  }

  async restock(input: RestockInput, now: Date): Promise<InventoryLevel | null> {
    return this.db.runTransaction(async (tx) => {
      const productDoc = await tx.get(this.products().doc(input.product_id));
      if (!productDoc.exists) return null;
      const ref = this.inventory().doc(input.product_id);
      const doc = await tx.get(ref);
      const level = doc.exists ? (doc.data() as InventoryLevel) : emptyLevel(input.product_id, now);
      for (const [size, delta] of Object.entries(input.additions)) {
        const count = ensureSize(level, size);
        count.on_hand = Math.max(0, count.on_hand + delta);
      }
      if (input.restock_threshold !== undefined) level.restock_threshold = input.restock_threshold;
      level.updated_at = now.toISOString();
      tx.set(ref, level);
      return level;
    });
  }

  async setStock(productId: string, onHandBySize: Record<string, number>, now: Date): Promise<InventoryLevel | null> {
    return this.db.runTransaction(async (tx) => {
      const productDoc = await tx.get(this.products().doc(productId));
      if (!productDoc.exists) return null;
      const ref = this.inventory().doc(productId);
      const doc = await tx.get(ref);
      const level = doc.exists ? (doc.data() as InventoryLevel) : emptyLevel(productId, now);
      for (const [size, onHand] of Object.entries(onHandBySize)) {
        const count = ensureSize(level, size);
        count.on_hand = Math.max(0, onHand);
      }
      level.updated_at = now.toISOString();
      tx.set(ref, level);
      return level;
    });
  }

  async getReservation(reservationId: string): Promise<Reservation | null> {
    const doc = await this.reservations().doc(reservationId).get();
    return doc.exists ? (doc.data() as Reservation) : null;
  }

  async listReservations(filter?: { session_id?: string; status?: ReservationStatus }): Promise<Reservation[]> {
    let query: FirebaseFirestore.Query<Reservation> = this.reservations();
    if (filter?.session_id) query = query.where("session_id", "==", filter.session_id);
    if (filter?.status) query = query.where("status", "==", filter.status);
    const snap = await query.get();
    return snap.docs.map((d) => d.data());
  }

  async sweepExpired(now: Date): Promise<string[]> {
    const held = await this.listReservations({ status: "held" });
    const expired = held.filter((r) => new Date(r.expires_at).getTime() <= now.getTime());
    const released: string[] = [];
    for (const reservation of expired) {
      const result = await this.release(reservation.reservation_id, "expired", now);
      if (result) released.push(reservation.reservation_id);
    }
    return released;
  }

  // --- transaction helpers ---

  private async mutateReservation(
    reservationId: string,
    now: Date,
    apply: (reservation: Reservation, tx: Transaction) => Promise<Reservation | null> | Reservation | null
  ): Promise<Reservation | null> {
    return this.db.runTransaction(async (tx) => {
      const resvRef = this.reservations().doc(reservationId);
      const resvDoc = await tx.get(resvRef);
      if (!resvDoc.exists) return null;
      const reservation = resvDoc.data() as Reservation;
      if (reservation.status !== "held") return reservation;
      return apply(reservation, tx);
    });
  }

  private async applyReservationClose(
    reservation: Reservation,
    tx: Transaction,
    now: Date,
    status: ReservationStatus
  ): Promise<Reservation> {
    const iso = now.toISOString();
    const ids = [...new Set(reservation.items.map((i) => i.product_id))];
    const docs = await tx.getAll(...ids.map((id) => this.inventory().doc(id)));
    const levelByProduct = new Map<string, InventoryLevel>();
    for (let i = 0; i < ids.length; i += 1) {
      if (docs[i].exists) levelByProduct.set(ids[i], docs[i].data() as InventoryLevel);
    }

    for (const item of reservation.items) {
      const level = levelByProduct.get(item.product_id);
      if (!level) continue;
      const count = ensureSize(level, item.size);
      count.reserved = Math.max(0, count.reserved - item.qty);
      if (status === "confirmed") count.on_hand = Math.max(0, count.on_hand - item.qty);
      level.updated_at = iso;
    }
    for (const [id, level] of levelByProduct) tx.set(this.inventory().doc(id), level);

    reservation.status = status;
    reservation.confirmed_at = status === "confirmed" ? iso : reservation.confirmed_at;
    tx.set(this.reservations().doc(reservation.reservation_id), reservation);
    return reservation;
  }
}

function ensureSize(level: InventoryLevel, size: string): StockCount {
  let count = level.levels[size];
  if (!count) {
    count = { on_hand: 0, reserved: 0 };
    level.levels[size] = count;
  }
  return count;
}

function emptyLevel(productId: string, now: Date): InventoryLevel {
  return { product_id: productId, levels: {}, restock_threshold: 2, updated_at: now.toISOString() };
}
