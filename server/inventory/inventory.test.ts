import assert from "node:assert/strict";
import { test } from "node:test";
import { InMemoryInventoryRepository, availabilityOf, planReservation } from "./memory-repository.js";
import { seedLevels, seedProducts } from "./seed-data.js";
import type { InventoryLevel, Product } from "./types.js";

const NOW = new Date("2026-07-04T00:00:00.000Z");

function seededRepo() {
  return new InMemoryInventoryRepository({ products: seedProducts(), levels: seedLevels() });
}

/** A minimal one-product repo with a controllable single-size stock. */
function tinyRepo(onHand: number, threshold = 1) {
  const product: Product = {
    product_id: "p_test",
    sku: "T-1",
    name: "Test tee",
    category: "top",
    price_yen: 1000,
    colors: ["white"],
    style_tags: ["casual"],
    body_template_tags: [],
    seasonal_rank: 5,
    location: { area: "Z", shelf: "Z-01" },
    image_url: "",
    vton_reference_image_url: "",
    vton_prompt: "",
    active: true,
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString()
  };
  const level: InventoryLevel = {
    product_id: "p_test",
    levels: { M: { on_hand: onHand, reserved: 0 } },
    restock_threshold: threshold,
    updated_at: NOW.toISOString()
  };
  return new InMemoryInventoryRepository({ products: [product], levels: [level] });
}

test("availabilityOf derives available = on_hand - reserved (never negative)", () => {
  const level: InventoryLevel = {
    product_id: "x",
    levels: { M: { on_hand: 5, reserved: 2 }, L: { on_hand: 1, reserved: 3 } },
    restock_threshold: 1,
    updated_at: NOW.toISOString()
  };
  const bySize = Object.fromEntries(availabilityOf(level).map((a) => [a.size, a.available]));
  assert.equal(bySize.M, 3);
  assert.equal(bySize.L, 0, "reserved exceeding on_hand clamps to 0, not negative");
});

test("planReservation is all-or-nothing and reports every short line", () => {
  const levels = new Map<string, InventoryLevel>([
    ["a", { product_id: "a", levels: { M: { on_hand: 2, reserved: 0 } }, restock_threshold: 1, updated_at: "" }],
    ["b", { product_id: "b", levels: { M: { on_hand: 1, reserved: 1 } }, restock_threshold: 1, updated_at: "" }]
  ]);
  const ok = planReservation([{ product_id: "a", size: "M", qty: 2 }], levels);
  assert.deepEqual(ok, { ok: true });

  const bad = planReservation(
    [
      { product_id: "a", size: "M", qty: 2 },
      { product_id: "b", size: "M", qty: 1 }
    ],
    levels
  );
  assert.equal(bad.ok, false);
  if (!bad.ok) {
    assert.equal(bad.shortfalls.length, 1);
    assert.equal(bad.shortfalls[0].product_id, "b");
    assert.equal(bad.shortfalls[0].available, 0);
  }
});

test("search: category + avoid_color + price filters and in_stock_only", async () => {
  const repo = seededRepo();
  const results = await repo.search({
    categories: ["outerwear"],
    avoid_colors: ["black"],
    max_price_yen: 10000,
    in_stock_only: true,
    limit: 50
  });
  assert.ok(results.length > 0);
  for (const r of results) {
    assert.equal(r.product.category, "outerwear");
    assert.ok(!r.product.colors.includes("black"));
    assert.ok(r.product.price_yen <= 10000);
    assert.ok(r.total_available > 0);
  }
});

test("search: size filter narrows availability to that size", async () => {
  const repo = seededRepo();
  const results = await repo.search({ categories: ["shoes"], size: "38", in_stock_only: true, limit: 50 });
  for (const r of results) {
    assert.ok(r.availability.every((a) => a.size === "38"));
    assert.ok(r.total_available > 0);
  }
});

test("reserve holds stock: available drops, on_hand unchanged until purchase", async () => {
  const repo = tinyRepo(3);
  const res = await repo.reserve({ session_id: "s1", items: [{ product_id: "p_test", size: "M", qty: 2 }] }, "r1", NOW);
  assert.equal(res.ok, true);
  const level = await repo.getLevel("p_test");
  assert.equal(level!.levels.M!.on_hand, 3, "on_hand only drops on confirmed purchase");
  assert.equal(level!.levels.M!.reserved, 2);
  assert.equal(availabilityOf(level!)[0].available, 1);
});

test("reserve fails cleanly when stock is insufficient", async () => {
  const repo = tinyRepo(1);
  const res = await repo.reserve({ session_id: "s1", items: [{ product_id: "p_test", size: "M", qty: 2 }] }, "r1", NOW);
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.reason, "insufficient_stock");
    assert.equal(res.shortfalls[0].available, 1);
  }
});

test("reserve reports unknown_product without mutating anything", async () => {
  const repo = tinyRepo(1);
  const res = await repo.reserve({ session_id: "s1", items: [{ product_id: "ghost", size: "M", qty: 1 }] }, "r1", NOW);
  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.reason, "unknown_product");
});

test("no oversell: two concurrent reservations race for the last unit, exactly one wins", async () => {
  const repo = tinyRepo(1);
  const [a, b] = await Promise.all([
    repo.reserve({ session_id: "sa", items: [{ product_id: "p_test", size: "M", qty: 1 }] }, "ra", NOW),
    repo.reserve({ session_id: "sb", items: [{ product_id: "p_test", size: "M", qty: 1 }] }, "rb", NOW)
  ]);
  const winners = [a, b].filter((r) => r.ok).length;
  assert.equal(winners, 1, "exactly one reservation may hold the single unit");

  const level = await repo.getLevel("p_test");
  assert.equal(level!.levels.M!.reserved, 1, "reserved never exceeds on_hand");
  assert.equal(availabilityOf(level!)[0].available, 0);
});

test("confirmPurchase decrements on_hand and clears the reservation hold", async () => {
  const repo = tinyRepo(3);
  await repo.reserve({ session_id: "s1", items: [{ product_id: "p_test", size: "M", qty: 2 }] }, "r1", NOW);
  const confirmed = await repo.confirmPurchase("r1", NOW);
  assert.equal(confirmed!.status, "confirmed");
  const level = await repo.getLevel("p_test");
  assert.equal(level!.levels.M!.on_hand, 1, "purchase really decrements on_hand");
  assert.equal(level!.levels.M!.reserved, 0, "hold is released on purchase");
});

test("release returns held stock to available", async () => {
  const repo = tinyRepo(2);
  await repo.reserve({ session_id: "s1", items: [{ product_id: "p_test", size: "M", qty: 2 }] }, "r1", NOW);
  const released = await repo.release("r1", "released", NOW);
  assert.equal(released!.status, "released");
  const level = await repo.getLevel("p_test");
  assert.equal(level!.levels.M!.reserved, 0);
  assert.equal(availabilityOf(level!)[0].available, 2);
});

test("sweepExpired releases only holds past their expiry", async () => {
  const repo = tinyRepo(2, 0);
  await repo.reserve(
    { session_id: "s1", items: [{ product_id: "p_test", size: "M", qty: 1 }], ttl_sec: 60 },
    "r_short",
    NOW
  );
  const later = new Date(NOW.getTime() + 120 * 1000);
  const swept = await repo.sweepExpired(later);
  assert.deepEqual(swept, ["r_short"]);
  const reservation = await repo.getReservation("r_short");
  assert.equal(reservation!.status, "expired");
  const level = await repo.getLevel("p_test");
  assert.equal(availabilityOf(level!)[0].available, 2, "expired hold is returned to stock");
});

test("restock adds on_hand; setStock sets absolute values, preserving reserved", async () => {
  const repo = tinyRepo(1);
  await repo.reserve({ session_id: "s1", items: [{ product_id: "p_test", size: "M", qty: 1 }] }, "r1", NOW);

  const restocked = await repo.restock({ product_id: "p_test", additions: { M: 5 } }, NOW);
  assert.equal(restocked!.levels.M!.on_hand, 6);
  assert.equal(restocked!.levels.M!.reserved, 1, "restock does not touch existing holds");

  const set = await repo.setStock("p_test", { M: 2 }, NOW);
  assert.equal(set!.levels.M!.on_hand, 2);
  assert.equal(set!.levels.M!.reserved, 1, "setStock keeps reserved intact");
});

test("lowStock flags products at or below their restock threshold", async () => {
  const repo = tinyRepo(2, 2);
  const before = await repo.lowStock();
  assert.equal(before.length, 1, "available (2) <= threshold (2) is low");
  await repo.restock({ product_id: "p_test", additions: { M: 5 } }, NOW);
  const after = await repo.lowStock();
  assert.equal(after.length, 0);
});

test("deactivateProduct hides it from search", async () => {
  const repo = seededRepo();
  await repo.deactivateProduct("p_top_001");
  const results = await repo.search({ in_stock_only: false, limit: 200 });
  assert.ok(!results.some((r) => r.product.product_id === "p_top_001"));
});
