import type {
  InventoryLevel,
  InventorySearchQuery,
  Product,
  ProductAvailability,
  SizeAvailability
} from "./types.js";

/** Derive per-size availability. `available = on_hand - reserved`, clamped at 0. */
export function availabilityOf(level: InventoryLevel): SizeAvailability[] {
  return Object.entries(level.levels).map(([size, count]) => ({
    size,
    on_hand: count.on_hand,
    reserved: count.reserved,
    available: Math.max(0, count.on_hand - count.reserved)
  }));
}

/** Pure product-attribute filter (no stock check). */
export function matchesFilters(product: Product, query: InventorySearchQuery): boolean {
  if (query.categories?.length && !query.categories.includes(product.category)) return false;
  if (query.colors?.length && !query.colors.some((c) => product.colors.includes(c))) return false;
  if (query.style_tags?.length && !query.style_tags.some((s) => product.style_tags.includes(s))) return false;
  if (query.avoid_colors?.length && query.avoid_colors.some((c) => product.colors.includes(c))) return false;
  if (query.avoid_style_tags?.length && query.avoid_style_tags.some((s) => product.style_tags.includes(s))) return false;
  if (query.max_price_yen !== undefined && product.price_yen > query.max_price_yen) return false;
  return true;
}

/**
 * Filter + join-with-availability + sort + limit. Shared by every backend so
 * search ranking is identical whether data comes from memory or Firestore.
 * Sort: seasonal_rank desc, then total availability desc.
 */
export function projectSearch(
  products: Product[],
  levelByProduct: Map<string, InventoryLevel>,
  query: InventorySearchQuery
): ProductAvailability[] {
  const results: ProductAvailability[] = [];
  for (const product of products) {
    if (!product.active) continue;
    if (!matchesFilters(product, query)) continue;

    const level = levelByProduct.get(product.product_id);
    let availability = level ? availabilityOf(level) : [];
    if (query.size) availability = availability.filter((a) => a.size === query.size);
    const totalAvailable = availability.reduce((sum, a) => sum + a.available, 0);
    if (query.in_stock_only && totalAvailable <= 0) continue;

    results.push({ product, availability, total_available: totalAvailable });
  }

  results.sort((a, b) => {
    if (b.product.seasonal_rank !== a.product.seasonal_rank) {
      return b.product.seasonal_rank - a.product.seasonal_rank;
    }
    return b.total_available - a.total_available;
  });
  return results.slice(0, query.limit);
}

/** A product is "low" when total available across sizes is at or below its reorder point. */
export function isLowStock(level: InventoryLevel): boolean {
  const totalAvailable = availabilityOf(level).reduce((sum, a) => sum + a.available, 0);
  return totalAvailable <= level.restock_threshold;
}
