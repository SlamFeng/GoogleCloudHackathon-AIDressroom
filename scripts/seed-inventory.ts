/**
 * Seed the Firestore inventory collections from `server/inventory/seed-data.ts`.
 *
 * Targets whatever the Firestore SDK is configured for:
 *   - local emulator when FIRESTORE_EMULATOR_HOST is set
 *   - real Cloud Firestore when GOOGLE_CLOUD_PROJECT (+ credentials) is set
 *
 * Idempotent: uses set(), so re-running overwrites docs to the seed baseline.
 *
 * Run: npm run seed:inventory
 */
import { Firestore } from "@google-cloud/firestore";
import { inventorySeed } from "../server/inventory/seed-data.js";

async function main() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  const emulator = process.env.FIRESTORE_EMULATOR_HOST;
  if (!projectId && !emulator) {
    throw new Error(
      "Set GOOGLE_CLOUD_PROJECT (real Firestore) or FIRESTORE_EMULATOR_HOST (local emulator) before seeding."
    );
  }

  const db = new Firestore(projectId ? { projectId } : undefined);
  console.log(`Seeding ${inventorySeed.length} products → ${emulator ? `emulator ${emulator}` : `project ${projectId}`}`);

  let batch = db.batch();
  let ops = 0;
  for (const { product, level } of inventorySeed) {
    batch.set(db.collection("products").doc(product.product_id), product);
    batch.set(db.collection("inventory").doc(product.product_id), level);
    ops += 2;
    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();

  console.log("Inventory seed complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
