import type {
  InventoryLevel,
  Product,
  ProductCategory,
  StandardColor,
  StockCount,
  StyleTag
} from "./types.js";

/** Fixed timestamp so seeding is deterministic and reproducible across runs. */
const SEED_TIMESTAMP = "2026-07-01T00:00:00.000Z";

const DEFAULT_TEMPLATES = ["body_template_pear_average", "body_template_rectangle_average"];

export interface SeedEntry {
  product: Product;
  level: InventoryLevel;
}

interface SeedSpec {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  price: number;
  colors: StandardColor[];
  styles: StyleTag[];
  seasonal: number;
  area: string;
  shelf: string;
  /** size -> on_hand */
  stock: Record<string, number>;
  templates?: string[];
  threshold?: number;
}

function entry(spec: SeedSpec): SeedEntry {
  const levels: Record<string, StockCount> = {};
  for (const [size, onHand] of Object.entries(spec.stock)) {
    levels[size] = { on_hand: onHand, reserved: 0 };
  }
  return {
    product: {
      product_id: spec.id,
      sku: spec.sku,
      name: spec.name,
      category: spec.category,
      price_yen: spec.price,
      colors: spec.colors,
      style_tags: spec.styles,
      body_template_tags: spec.templates ?? DEFAULT_TEMPLATES,
      seasonal_rank: spec.seasonal,
      location: { area: spec.area, shelf: spec.shelf },
      image_url: `/mock-products/${spec.id}.jpg`,
      vton_reference_image_url: `/mock-products/${spec.id}-vton.png`,
      vton_prompt: `Substitute the current ${spec.category} with a ${spec.name.toLowerCase()}. Keep face, body shape, pose, hands, and background unchanged.`,
      active: true,
      created_at: SEED_TIMESTAMP,
      updated_at: SEED_TIMESTAMP
    },
    level: {
      product_id: spec.id,
      levels,
      restock_threshold: spec.threshold ?? 2,
      updated_at: SEED_TIMESTAMP
    }
  };
}

const specs: SeedSpec[] = [
  // --- outerwear (6) ---
  { id: "p_outer_001", sku: "JK-001", name: "Navy cropped jacket", category: "outerwear", price: 9800, colors: ["navy", "blue"], styles: ["casual", "minimal", "smart_casual"], seasonal: 8, area: "A", shelf: "A-01", stock: { M: 4, L: 2 } },
  { id: "p_outer_002", sku: "JK-002", name: "Beige casual shirt jacket", category: "outerwear", price: 7600, colors: ["beige", "white"], styles: ["casual", "smart_casual"], seasonal: 7, area: "A", shelf: "A-02", stock: { M: 3, L: 3 } },
  { id: "p_outer_003", sku: "CT-001", name: "Charcoal wool coat", category: "outerwear", price: 18800, colors: ["gray", "black"], styles: ["classic", "business", "formal"], seasonal: 5, area: "A", shelf: "A-03", stock: { S: 1, M: 2, L: 1 }, threshold: 1 },
  { id: "p_outer_004", sku: "CD-001", name: "Cream oversized cardigan", category: "outerwear", price: 6900, colors: ["cream", "beige"], styles: ["casual", "minimal", "romantic"], seasonal: 6, area: "A", shelf: "A-04", stock: { M: 5, L: 4 } },
  { id: "p_outer_005", sku: "HD-001", name: "Olive utility hoodie", category: "outerwear", price: 5800, colors: ["olive", "green"], styles: ["streetwear", "sporty", "casual"], seasonal: 7, area: "A", shelf: "A-05", stock: { S: 3, M: 6, L: 3 } },
  { id: "p_outer_006", sku: "BZ-001", name: "Black tailored blazer", category: "outerwear", price: 13800, colors: ["black"], styles: ["business", "smart_casual", "classic"], seasonal: 6, area: "A", shelf: "A-06", stock: { S: 2, M: 3 } },

  // --- top (8) ---
  { id: "p_top_001", sku: "TP-001", name: "White fitted knit top", category: "top", price: 5200, colors: ["white"], styles: ["minimal", "smart_casual"], seasonal: 6, area: "B", shelf: "B-01", stock: { S: 2, M: 7 } },
  { id: "p_top_002", sku: "TP-002", name: "Soft pink relaxed blouse", category: "top", price: 5900, colors: ["pink"], styles: ["romantic", "casual"], seasonal: 9, area: "B", shelf: "B-02", stock: { M: 5 } },
  { id: "p_top_003", sku: "TP-003", name: "Black ribbed long-sleeve", category: "top", price: 3900, colors: ["black"], styles: ["minimal", "casual"], seasonal: 6, area: "B", shelf: "B-03", stock: { S: 4, M: 8, L: 5 } },
  { id: "p_top_004", sku: "TP-004", name: "Striped cotton shirt", category: "top", price: 4800, colors: ["blue", "white"], styles: ["preppy", "smart_casual", "classic"], seasonal: 7, area: "B", shelf: "B-04", stock: { M: 6, L: 4 } },
  { id: "p_top_005", sku: "TP-005", name: "Gray crew sweater", category: "top", price: 6400, colors: ["gray"], styles: ["minimal", "classic", "casual"], seasonal: 5, area: "B", shelf: "B-05", stock: { S: 3, M: 5, L: 2 } },
  { id: "p_top_006", sku: "TP-006", name: "Olive graphic tee", category: "top", price: 3200, colors: ["olive", "green"], styles: ["streetwear", "casual"], seasonal: 8, area: "B", shelf: "B-06", stock: { M: 9, L: 6 } },
  { id: "p_top_007", sku: "TP-007", name: "Cream silk camisole", category: "top", price: 4600, colors: ["cream", "white"], styles: ["romantic", "smart_casual"], seasonal: 8, area: "B", shelf: "B-07", stock: { S: 2, M: 3 }, threshold: 1 },
  { id: "p_top_008", sku: "TP-008", name: "Navy polo shirt", category: "top", price: 4200, colors: ["navy"], styles: ["preppy", "sporty", "smart_casual"], seasonal: 7, area: "B", shelf: "B-08", stock: { M: 5, L: 5 } },

  // --- bottom (6) ---
  { id: "p_bottom_001", sku: "BT-001", name: "Dark straight-leg denim", category: "bottom", price: 8800, colors: ["navy", "blue"], styles: ["casual", "classic"], seasonal: 7, area: "C", shelf: "C-01", stock: { M: 3, L: 2 } },
  { id: "p_bottom_002", sku: "BT-002", name: "Black tapered trousers", category: "bottom", price: 9200, colors: ["black"], styles: ["business", "minimal", "smart_casual"], seasonal: 5, area: "C", shelf: "C-02", stock: { S: 2, M: 2 } },
  { id: "p_bottom_003", sku: "BT-003", name: "Beige wide chinos", category: "bottom", price: 7200, colors: ["beige"], styles: ["casual", "smart_casual", "minimal"], seasonal: 6, area: "C", shelf: "C-03", stock: { M: 4, L: 4 } },
  { id: "p_bottom_004", sku: "BT-004", name: "Olive cargo pants", category: "bottom", price: 7800, colors: ["olive", "green"], styles: ["streetwear", "workwear", "casual"], seasonal: 7, area: "C", shelf: "C-04", stock: { S: 3, M: 5, L: 3 } },
  { id: "p_bottom_005", sku: "SK-001", name: "Navy pleated midi skirt", category: "bottom", price: 6800, colors: ["navy"], styles: ["classic", "preppy", "smart_casual"], seasonal: 6, area: "C", shelf: "C-05", stock: { S: 2, M: 4 } },
  { id: "p_bottom_006", sku: "SH-001", name: "White linen shorts", category: "bottom", price: 4200, colors: ["white", "cream"], styles: ["casual", "outdoor"], seasonal: 9, area: "C", shelf: "C-06", stock: { M: 6, L: 4 } },

  // --- dress (3) ---
  { id: "p_dress_001", sku: "DR-001", name: "Black slip dress", category: "dress", price: 9800, colors: ["black"], styles: ["formal", "minimal", "romantic"], seasonal: 6, area: "D", shelf: "D-01", stock: { S: 2, M: 3, L: 1 }, threshold: 1 },
  { id: "p_dress_002", sku: "DR-002", name: "Floral wrap dress", category: "dress", price: 8600, colors: ["pink", "green"], styles: ["romantic", "bohemian", "casual"], seasonal: 9, area: "D", shelf: "D-02", stock: { M: 4, L: 3 } },
  { id: "p_dress_003", sku: "DR-003", name: "Navy shirt dress", category: "dress", price: 7900, colors: ["navy"], styles: ["smart_casual", "classic", "workwear"], seasonal: 7, area: "D", shelf: "D-03", stock: { S: 3, M: 4 } },

  // --- one_piece (2) ---
  { id: "p_onepiece_001", sku: "JS-001", name: "Beige linen jumpsuit", category: "one_piece", price: 11200, colors: ["beige"], styles: ["minimal", "smart_casual", "outdoor"], seasonal: 8, area: "D", shelf: "D-04", stock: { S: 2, M: 2 }, threshold: 1 },
  { id: "p_onepiece_002", sku: "OV-001", name: "Denim overall", category: "one_piece", price: 9600, colors: ["blue", "navy"], styles: ["casual", "streetwear", "vintage"], seasonal: 7, area: "D", shelf: "D-05", stock: { M: 3, L: 3 } },

  // --- shoes (6) ---
  { id: "p_shoes_001", sku: "SN-001", name: "White leather sneakers", category: "shoes", price: 8900, colors: ["white"], styles: ["minimal", "casual", "smart_casual"], seasonal: 8, area: "E", shelf: "E-01", stock: { "38": 2, "39": 3, "40": 2 } },
  { id: "p_shoes_002", sku: "BO-001", name: "Black chelsea boots", category: "shoes", price: 12800, colors: ["black"], styles: ["classic", "business", "smart_casual"], seasonal: 5, area: "E", shelf: "E-02", stock: { "39": 2, "40": 2, "41": 1 }, threshold: 1 },
  { id: "p_shoes_003", sku: "LF-001", name: "Brown penny loafers", category: "shoes", price: 10600, colors: ["brown"], styles: ["preppy", "classic", "smart_casual"], seasonal: 6, area: "E", shelf: "E-03", stock: { "38": 1, "39": 2, "40": 2 } },
  { id: "p_shoes_004", sku: "HL-001", name: "Beige block heels", category: "shoes", price: 9800, colors: ["beige"], styles: ["formal", "romantic", "smart_casual"], seasonal: 6, area: "E", shelf: "E-04", stock: { "36": 2, "37": 2, "38": 1 }, threshold: 1 },
  { id: "p_shoes_005", sku: "SD-001", name: "Tan flat sandals", category: "shoes", price: 5400, colors: ["brown", "beige"], styles: ["casual", "bohemian", "outdoor"], seasonal: 9, area: "E", shelf: "E-05", stock: { "37": 3, "38": 4, "39": 2 } },
  { id: "p_shoes_006", sku: "SN-002", name: "Olive trail sneakers", category: "shoes", price: 9200, colors: ["olive", "green"], styles: ["sporty", "outdoor", "streetwear"], seasonal: 7, area: "E", shelf: "E-06", stock: { "40": 3, "41": 3, "42": 2 } },

  // --- headwear (3) ---
  { id: "p_head_001", sku: "CP-001", name: "Navy baseball cap", category: "headwear", price: 3200, colors: ["navy"], styles: ["sporty", "streetwear", "casual"], seasonal: 8, area: "F", shelf: "F-01", stock: { FREE: 10 } },
  { id: "p_head_002", sku: "HT-001", name: "Beige bucket hat", category: "headwear", price: 3600, colors: ["beige"], styles: ["casual", "bohemian", "outdoor"], seasonal: 9, area: "F", shelf: "F-02", stock: { FREE: 8 } },
  { id: "p_head_003", sku: "BN-001", name: "Gray knit beanie", category: "headwear", price: 2800, colors: ["gray"], styles: ["casual", "streetwear", "minimal"], seasonal: 4, area: "F", shelf: "F-03", stock: { FREE: 12 } },

  // --- bag (3) ---
  { id: "p_bag_001", sku: "TO-001", name: "Black canvas tote", category: "bag", price: 4800, colors: ["black"], styles: ["minimal", "casual"], seasonal: 7, area: "G", shelf: "G-01", stock: { FREE: 6 } },
  { id: "p_bag_002", sku: "CB-001", name: "Brown leather crossbody", category: "bag", price: 12600, colors: ["brown"], styles: ["classic", "smart_casual"], seasonal: 6, area: "G", shelf: "G-02", stock: { FREE: 4 }, threshold: 1 },
  { id: "p_bag_003", sku: "BP-001", name: "Olive nylon backpack", category: "bag", price: 8400, colors: ["olive", "green"], styles: ["sporty", "streetwear", "outdoor"], seasonal: 7, area: "G", shelf: "G-03", stock: { FREE: 5 } },

  // --- accessory (4) ---
  { id: "p_acc_001", sku: "BL-001", name: "Brown leather belt", category: "accessory", price: 3800, colors: ["brown"], styles: ["classic", "smart_casual"], seasonal: 5, area: "H", shelf: "H-01", stock: { FREE: 9 } },
  { id: "p_acc_002", sku: "SC-001", name: "Cream wool scarf", category: "accessory", price: 4200, colors: ["cream", "beige"], styles: ["classic", "romantic", "minimal"], seasonal: 3, area: "H", shelf: "H-02", stock: { FREE: 7 } },
  { id: "p_acc_003", sku: "SG-001", name: "Black round sunglasses", category: "accessory", price: 5600, colors: ["black"], styles: ["streetwear", "vintage", "minimal"], seasonal: 8, area: "H", shelf: "H-03", stock: { FREE: 6 } },
  { id: "p_acc_004", sku: "WT-001", name: "Silver minimal watch", category: "accessory", price: 15800, colors: ["silver"], styles: ["minimal", "business", "classic"], seasonal: 6, area: "H", shelf: "H-04", stock: { FREE: 3 }, threshold: 1 }
];

export const inventorySeed: SeedEntry[] = specs.map(entry);

export function seedProducts(): Product[] {
  return inventorySeed.map((item) => structuredClone(item.product));
}

export function seedLevels(): InventoryLevel[] {
  return inventorySeed.map((item) => structuredClone(item.level));
}
