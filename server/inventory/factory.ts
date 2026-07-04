import { InMemoryInventoryRepository } from "./memory-repository.js";
import type { InventoryRepository } from "./repository.js";
import { seedLevels, seedProducts } from "./seed-data.js";
import { InventoryService } from "./service.js";

export type InventoryBackend = "memory" | "firestore";

export function resolveBackend(): InventoryBackend {
  const value = (process.env.INVENTORY_BACKEND ?? "memory").toLowerCase();
  return value === "firestore" ? "firestore" : "memory";
}

function reservationTtlSec(): number {
  const parsed = Number(process.env.INVENTORY_RESERVATION_TTL_SEC);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 900;
}

export async function createInventoryRepository(backend = resolveBackend()): Promise<InventoryRepository> {
  if (backend === "firestore") {
    // Lazy-load so `memory` mode never pulls in the Firestore SDK / credentials.
    const { FirestoreInventoryRepository } = await import("./firestore-repository.js");
    return new FirestoreInventoryRepository({ projectId: process.env.GOOGLE_CLOUD_PROJECT });
  }
  return new InMemoryInventoryRepository({
    products: seedProducts(),
    levels: seedLevels(),
    defaultTtlSec: reservationTtlSec()
  });
}

let singleton: Promise<InventoryService> | null = null;

/** Process-wide inventory service. Memory backend is seeded; Firestore is assumed already seeded. */
export function getInventoryService(): Promise<InventoryService> {
  if (!singleton) {
    singleton = createInventoryRepository().then((repo) => new InventoryService(repo));
  }
  return singleton;
}
