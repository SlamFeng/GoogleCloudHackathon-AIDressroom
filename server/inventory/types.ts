import { z } from "zod";

/**
 * Inventory subsystem contracts.
 *
 * The category / color / style vocabularies below are deliberately aligned with
 * the authoritative `outfit_profile` v1.0 machine contract
 * (`schemas/outfit-profile.schema.json`). The image-analysis module emits those
 * enums, and the styling Agent turns them into inventory search filters, so the
 * product catalog must speak the same words or search silently misses items.
 */

/** Retail product category. Superset of the try-on `outfitSlotSchema`; matches outfit_profile v1.0 (minus `unknown`, which is not a sellable category). */
export const productCategorySchema = z.enum([
  "outerwear",
  "top",
  "bottom",
  "dress",
  "one_piece",
  "shoes",
  "headwear",
  "bag",
  "accessory"
]);
export type ProductCategory = z.infer<typeof productCategorySchema>;

/** Standard color names from outfit_profile v1.0 §6.2. */
export const standardColorSchema = z.enum([
  "black",
  "white",
  "gray",
  "silver",
  "brown",
  "beige",
  "cream",
  "red",
  "orange",
  "yellow",
  "green",
  "olive",
  "blue",
  "navy",
  "purple",
  "pink",
  "gold",
  "multicolor"
]);
export type StandardColor = z.infer<typeof standardColorSchema>;

/** Style tags from outfit_profile v1.0 §6.1. */
export const styleTagSchema = z.enum([
  "casual",
  "smart_casual",
  "formal",
  "business",
  "minimal",
  "streetwear",
  "sporty",
  "athleisure",
  "classic",
  "preppy",
  "romantic",
  "bohemian",
  "vintage",
  "workwear",
  "outdoor",
  "avant_garde"
]);
export type StyleTag = z.infer<typeof styleTagSchema>;

/**
 * Size is a free-form string keyed per category: apparel uses S/M/L/XL/FREE,
 * shoes use numeric labels ("38", "39"). Kept open so new size systems don't
 * require a schema migration.
 */
export const sizeSchema = z.string().min(1).max(8);
export type Size = z.infer<typeof sizeSchema>;

/** Where the item physically sits in the store, used to build a pickup route. */
export const storeLocationSchema = z.object({
  area: z.string().min(1),
  shelf: z.string().min(1)
});
export type StoreLocation = z.infer<typeof storeLocationSchema>;

/**
 * Product master data. Relatively static — changes when staff add/edit a SKU,
 * not on every purchase. Includes the try-on (`vton_*`) fields so this record
 * can fully replace the legacy hard-coded `catalog` in mock-tools.
 */
export const audienceSchema = z.enum(["women", "men", "unisex"]);
export type Audience = z.infer<typeof audienceSchema>;

export const productSchema = z.object({
  product_id: z.string().min(1),
  sku: z.string().min(1),
  name: z.string().min(1),
  category: productCategorySchema,
  audience: audienceSchema.default("unisex"),
  price_yen: z.number().int().nonnegative(),
  colors: z.array(standardColorSchema).min(1),
  style_tags: z.array(styleTagSchema),
  body_template_tags: z.array(z.string()),
  seasonal_rank: z.number().int().min(0).max(10),
  location: storeLocationSchema,
  image_url: z.string(),
  vton_reference_image_url: z.string(),
  vton_prompt: z.string(),
  active: z.boolean().default(true),
  created_at: z.string(),
  updated_at: z.string()
});
export type Product = z.infer<typeof productSchema>;

/** Per-size stock counters. `available = on_hand - reserved` (never stored, always derived). */
export const stockCountSchema = z.object({
  on_hand: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative()
});
export type StockCount = z.infer<typeof stockCountSchema>;

/**
 * Hot inventory record. One document per product holding every size, so a single
 * transaction locks one document and the "available = on_hand - reserved"
 * invariant holds atomically — the technical basis for "no oversell".
 */
export const inventoryLevelSchema = z.object({
  product_id: z.string().min(1),
  levels: z.record(sizeSchema, stockCountSchema),
  restock_threshold: z.number().int().nonnegative(),
  updated_at: z.string()
});
export type InventoryLevel = z.infer<typeof inventoryLevelSchema>;

export const reservationStatusSchema = z.enum(["held", "confirmed", "released", "expired"]);
export type ReservationStatus = z.infer<typeof reservationStatusSchema>;

export const reservationItemSchema = z.object({
  product_id: z.string().min(1),
  size: sizeSchema,
  qty: z.number().int().positive()
});
export type ReservationItem = z.infer<typeof reservationItemSchema>;

/** A hold placed by an Agent session. Lifecycle: held → confirmed | released | expired. */
export const reservationSchema = z.object({
  reservation_id: z.string().min(1),
  session_id: z.string().min(1),
  items: z.array(reservationItemSchema).min(1),
  status: reservationStatusSchema,
  created_at: z.string(),
  expires_at: z.string(),
  confirmed_at: z.string().nullable()
});
export type Reservation = z.infer<typeof reservationSchema>;

// ---------------------------------------------------------------------------
// Query / result shapes (not persisted)
// ---------------------------------------------------------------------------

/** Inventory search filters. All optional; omitted fields don't constrain. */
export const inventorySearchQuerySchema = z.object({
  categories: z.array(productCategorySchema).optional(),
  colors: z.array(standardColorSchema).optional(),
  style_tags: z.array(styleTagSchema).optional(),
  avoid_colors: z.array(standardColorSchema).optional(),
  avoid_style_tags: z.array(styleTagSchema).optional(),
  max_price_yen: z.number().int().nonnegative().optional(),
  size: sizeSchema.optional(),
  in_stock_only: z.boolean().default(true),
  limit: z.number().int().positive().max(200).default(50)
});
export type InventorySearchQuery = z.infer<typeof inventorySearchQuerySchema>;

/** Per-size availability derived from a StockCount. */
export interface SizeAvailability {
  size: Size;
  on_hand: number;
  reserved: number;
  available: number;
}

/** A product joined with its live availability — what search returns. */
export interface ProductAvailability {
  product: Product;
  availability: SizeAvailability[];
  total_available: number;
}

export const reserveInputSchema = z.object({
  session_id: z.string().min(1),
  items: z.array(reservationItemSchema).min(1),
  ttl_sec: z.number().int().positive().max(3600).optional()
});
export type ReserveInput = z.infer<typeof reserveInputSchema>;

/** A requested item that could not be (fully) reserved. */
export interface ReservationShortfall {
  product_id: string;
  size: Size;
  requested: number;
  available: number;
}

/**
 * Result of a reserve attempt. `ok: true` means the whole request was held
 * (all-or-nothing); `ok: false` returns the shortfalls so the Agent can decide
 * to swap items or drop the size — the "last one is taken → find an alternative"
 * demo moment.
 */
export type ReserveResult =
  | { ok: true; reservation: Reservation }
  | { ok: false; reason: "insufficient_stock" | "unknown_product"; shortfalls: ReservationShortfall[] };

export const restockInputSchema = z.object({
  product_id: z.string().min(1),
  additions: z.record(sizeSchema, z.number().int()),
  restock_threshold: z.number().int().nonnegative().optional()
});
export type RestockInput = z.infer<typeof restockInputSchema>;
