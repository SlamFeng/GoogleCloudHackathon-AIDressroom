import type {
  InventoryLevel,
  InventorySearchQuery,
  Product,
  ProductAvailability,
  Reservation,
  ReservationStatus,
  ReserveInput,
  ReserveResult,
  RestockInput
} from "./types.js";

/**
 * Storage-agnostic contract for the inventory subsystem. The in-memory
 * implementation backs local dev and tests; the Firestore implementation backs
 * Cloud Run. Business logic (service.ts), Agent tools, and the ops API depend
 * only on this interface, never on a concrete backend.
 *
 * Mutating operations that touch stock (`reserve`, `confirmPurchase`, `release`,
 * `restock`, `setStock`) MUST be atomic per product so concurrent sessions can
 * never oversell. In-memory relies on a synchronous critical section; Firestore
 * relies on `runTransaction`.
 */
export interface InventoryRepository {
  // --- Product master data ---
  listProducts(filter?: { includeInactive?: boolean }): Promise<Product[]>;
  getProduct(productId: string): Promise<Product | null>;
  upsertProduct(product: Product): Promise<Product>;
  deactivateProduct(productId: string): Promise<boolean>;

  // --- Inventory levels ---
  getLevel(productId: string): Promise<InventoryLevel | null>;
  listLevels(): Promise<InventoryLevel[]>;

  // --- Read models ---
  search(query: InventorySearchQuery): Promise<ProductAvailability[]>;
  lowStock(): Promise<Array<{ product: Product; level: InventoryLevel }>>;

  // --- Reservation lifecycle (atomic) ---
  reserve(input: ReserveInput, reservationId: string, now: Date): Promise<ReserveResult>;
  confirmPurchase(reservationId: string, now: Date): Promise<Reservation | null>;
  release(reservationId: string, status: Extract<ReservationStatus, "released" | "expired">, now: Date): Promise<Reservation | null>;

  // --- Stock operations (atomic) ---
  restock(input: RestockInput, now: Date): Promise<InventoryLevel | null>;
  setStock(productId: string, onHandBySize: Record<string, number>, now: Date): Promise<InventoryLevel | null>;

  // --- Reservation reads / maintenance ---
  getReservation(reservationId: string): Promise<Reservation | null>;
  listReservations(filter?: { session_id?: string; status?: ReservationStatus }): Promise<Reservation[]>;
  /** Release every `held` reservation whose `expires_at` is before `now`. Returns the released ids. */
  sweepExpired(now: Date): Promise<string[]>;
}
