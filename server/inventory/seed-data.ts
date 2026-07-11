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
  audience?: "women" | "men" | "unisex";
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
      audience: spec.audience ?? "unisex",
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
  { id: "p_acc_004", sku: "WT-001", name: "Silver minimal watch", category: "accessory", price: 15800, colors: ["silver"], styles: ["minimal", "business", "classic"], seasonal: 6, area: "H", shelf: "H-04", stock: { FREE: 3 }, threshold: 1 },

  // ===== expanded catalog: 5 men's + 5 women's per category (dress/one_piece women only) =====

  // --- outerwear · men ---
  { id: "p_outer_007", sku: "VS-001", name: "Navy quilted vest", category: "outerwear", audience: "men", price: 8900, colors: ["navy"], styles: ["casual", "sporty", "outdoor"], seasonal: 7, area: "A", shelf: "A-11", stock: { M: 4, L: 3 } },
  { id: "p_outer_008", sku: "BM-001", name: "Charcoal bomber jacket", category: "outerwear", audience: "men", price: 11200, colors: ["gray", "black"], styles: ["streetwear", "casual", "smart_casual"], seasonal: 7, area: "A", shelf: "A-12", stock: { M: 3, L: 3 } },
  { id: "p_outer_009", sku: "TR-001", name: "Beige trench coat", category: "outerwear", audience: "men", price: 16800, colors: ["beige"], styles: ["classic", "business", "smart_casual"], seasonal: 5, area: "A", shelf: "A-13", stock: { M: 2, L: 2 } },
  { id: "p_outer_010", sku: "FJ-001", name: "Olive field jacket", category: "outerwear", audience: "men", price: 12400, colors: ["olive", "green"], styles: ["outdoor", "casual", "workwear"], seasonal: 6, area: "A", shelf: "A-14", stock: { M: 3, L: 2 } },
  { id: "p_outer_011", sku: "DC-001", name: "Navy double-breasted coat", category: "outerwear", audience: "men", price: 19800, colors: ["navy"], styles: ["classic", "formal", "business"], seasonal: 5, area: "A", shelf: "A-15", stock: { S: 1, M: 2 } },
  // --- outerwear · women ---
  { id: "p_outer_012", sku: "WC-001", name: "Cream wrap coat", category: "outerwear", audience: "women", price: 15800, colors: ["cream", "beige"], styles: ["classic", "minimal", "romantic"], seasonal: 6, area: "A", shelf: "A-16", stock: { S: 2, M: 3 } },
  { id: "p_outer_013", sku: "PF-001", name: "Pink cropped puffer", category: "outerwear", audience: "women", price: 9800, colors: ["pink"], styles: ["casual", "sporty", "streetwear"], seasonal: 8, area: "A", shelf: "A-17", stock: { S: 3, M: 4 } },
  { id: "p_outer_014", sku: "BT-101", name: "Black belted trench", category: "outerwear", audience: "women", price: 17200, colors: ["black"], styles: ["classic", "smart_casual", "minimal"], seasonal: 6, area: "A", shelf: "A-18", stock: { S: 2, M: 2 } },
  { id: "p_outer_015", sku: "TJ-001", name: "Beige teddy jacket", category: "outerwear", audience: "women", price: 10800, colors: ["beige", "cream"], styles: ["casual", "romantic", "minimal"], seasonal: 7, area: "A", shelf: "A-19", stock: { S: 3, M: 3 } },
  { id: "p_outer_016", sku: "CP-001", name: "Burgundy wool cape", category: "outerwear", audience: "women", price: 14200, colors: ["red", "purple"], styles: ["vintage", "classic", "bohemian"], seasonal: 5, area: "A", shelf: "A-20", stock: { S: 2, M: 2 } },

  // --- top · men ---
  { id: "p_top_009", sku: "OX-001", name: "Navy oxford shirt", category: "top", audience: "men", price: 5400, colors: ["navy"], styles: ["preppy", "smart_casual", "classic"], seasonal: 7, area: "B", shelf: "B-09", stock: { M: 6, L: 4 } },
  { id: "p_top_010", sku: "LN-001", name: "White linen shirt", category: "top", audience: "men", price: 5200, colors: ["white"], styles: ["minimal", "smart_casual", "casual"], seasonal: 8, area: "B", shelf: "B-10", stock: { M: 5, L: 5 } },
  { id: "p_top_011", sku: "TE-101", name: "Gray marl crew tee", category: "top", audience: "men", price: 2900, colors: ["gray"], styles: ["casual", "minimal"], seasonal: 6, area: "B", shelf: "B-11", stock: { M: 8, L: 6 } },
  { id: "p_top_012", sku: "HN-001", name: "Black henley long-sleeve", category: "top", audience: "men", price: 3800, colors: ["black"], styles: ["casual", "minimal", "streetwear"], seasonal: 6, area: "B", shelf: "B-12", stock: { M: 6, L: 4 } },
  { id: "p_top_013", sku: "FL-001", name: "Olive flannel overshirt", category: "top", audience: "men", price: 6200, colors: ["olive", "green"], styles: ["casual", "outdoor", "workwear"], seasonal: 6, area: "B", shelf: "B-13", stock: { M: 4, L: 3 } },
  // --- top · women ---
  { id: "p_top_014", sku: "SB-001", name: "Cream satin blouse", category: "top", audience: "women", price: 5600, colors: ["cream", "white"], styles: ["romantic", "smart_casual", "classic"], seasonal: 8, area: "B", shelf: "B-14", stock: { S: 3, M: 4 } },
  { id: "p_top_015", sku: "OS-101", name: "Black off-shoulder top", category: "top", audience: "women", price: 4900, colors: ["black"], styles: ["romantic", "smart_casual"], seasonal: 8, area: "B", shelf: "B-15", stock: { S: 3, M: 3 } },
  { id: "p_top_016", sku: "RT-001", name: "Pink ribbed knit tee", category: "top", audience: "women", price: 3600, colors: ["pink"], styles: ["casual", "minimal", "romantic"], seasonal: 8, area: "B", shelf: "B-16", stock: { S: 4, M: 5 } },
  { id: "p_top_017", sku: "TF-001", name: "Navy tie-front blouse", category: "top", audience: "women", price: 5400, colors: ["navy"], styles: ["smart_casual", "preppy", "classic"], seasonal: 7, area: "B", shelf: "B-17", stock: { S: 2, M: 4 } },
  { id: "p_top_018", sku: "EC-001", name: "White eyelet camisole", category: "top", audience: "women", price: 4200, colors: ["white"], styles: ["romantic", "casual", "bohemian"], seasonal: 9, area: "B", shelf: "B-18", stock: { S: 3, M: 3 } },

  // --- bottom · men ---
  { id: "p_bottom_007", sku: "CH-001", name: "Navy slim chinos", category: "bottom", audience: "men", price: 7200, colors: ["navy"], styles: ["smart_casual", "classic", "minimal"], seasonal: 6, area: "C", shelf: "C-07", stock: { M: 4, L: 4 } },
  { id: "p_bottom_008", sku: "WT-101", name: "Gray wool trousers", category: "bottom", audience: "men", price: 9400, colors: ["gray"], styles: ["business", "classic", "formal"], seasonal: 5, area: "C", shelf: "C-08", stock: { M: 3, L: 2 } },
  { id: "p_bottom_009", sku: "CG-001", name: "Olive cargo pants", category: "bottom", audience: "men", price: 7800, colors: ["olive", "green"], styles: ["streetwear", "outdoor", "casual"], seasonal: 7, area: "C", shelf: "C-09", stock: { M: 5, L: 3 } },
  { id: "p_bottom_010", sku: "RD-001", name: "Black raw denim", category: "bottom", audience: "men", price: 8600, colors: ["black"], styles: ["casual", "minimal", "streetwear"], seasonal: 6, area: "C", shelf: "C-10", stock: { M: 4, L: 4 } },
  { id: "p_bottom_011", sku: "SH-001", name: "Beige pleated shorts", category: "bottom", audience: "men", price: 5200, colors: ["beige"], styles: ["casual", "smart_casual"], seasonal: 9, area: "C", shelf: "C-11", stock: { M: 5, L: 4 } },
  // --- bottom · women ---
  { id: "p_bottom_012", sku: "SK-101", name: "Black pleated midi skirt", category: "bottom", audience: "women", price: 6800, colors: ["black"], styles: ["smart_casual", "classic", "minimal"], seasonal: 6, area: "C", shelf: "C-12", stock: { S: 3, M: 4 } },
  { id: "p_bottom_013", sku: "SK-102", name: "Beige A-line skirt", category: "bottom", audience: "women", price: 6200, colors: ["beige"], styles: ["minimal", "romantic", "smart_casual"], seasonal: 7, area: "C", shelf: "C-13", stock: { S: 3, M: 3 } },
  { id: "p_bottom_014", sku: "WL-001", name: "Navy wide-leg trousers", category: "bottom", audience: "women", price: 7600, colors: ["navy"], styles: ["minimal", "smart_casual", "business"], seasonal: 6, area: "C", shelf: "C-14", stock: { S: 2, M: 4 } },
  { id: "p_bottom_015", sku: "SK-103", name: "Denim mini skirt", category: "bottom", audience: "women", price: 5800, colors: ["blue", "navy"], styles: ["casual", "streetwear"], seasonal: 8, area: "C", shelf: "C-15", stock: { S: 4, M: 4 } },
  { id: "p_bottom_016", sku: "TS-001", name: "Cream tailored shorts", category: "bottom", audience: "women", price: 5400, colors: ["cream", "beige"], styles: ["smart_casual", "minimal"], seasonal: 8, area: "C", shelf: "C-16", stock: { S: 3, M: 3 } },

  // --- shoes · men ---
  { id: "p_shoes_007", sku: "DB-001", name: "Brown leather derby", category: "shoes", audience: "men", price: 12800, colors: ["brown"], styles: ["business", "classic", "smart_casual"], seasonal: 5, area: "E", shelf: "E-07", stock: { "40": 2, "41": 3, "42": 3 } },
  { id: "p_shoes_008", sku: "SN-101", name: "White low-top sneakers", category: "shoes", audience: "men", price: 8900, colors: ["white"], styles: ["casual", "minimal", "streetwear"], seasonal: 8, area: "E", shelf: "E-08", stock: { "41": 4, "42": 5, "43": 3 } },
  { id: "p_shoes_009", sku: "CB-101", name: "Black chelsea boots", category: "shoes", audience: "men", price: 14200, colors: ["black"], styles: ["classic", "smart_casual", "minimal"], seasonal: 5, area: "E", shelf: "E-09", stock: { "41": 2, "42": 3 } },
  { id: "p_shoes_010", sku: "SO-001", name: "Navy canvas slip-ons", category: "shoes", audience: "men", price: 5600, colors: ["navy"], styles: ["casual", "sporty"], seasonal: 7, area: "E", shelf: "E-10", stock: { "41": 4, "42": 4 } },
  { id: "p_shoes_011", sku: "TR-101", name: "Olive trail runners", category: "shoes", audience: "men", price: 9800, colors: ["olive", "green"], styles: ["sporty", "outdoor", "athleisure"], seasonal: 7, area: "E", shelf: "E-11", stock: { "41": 3, "42": 4, "43": 2 } },
  // --- shoes · women ---
  { id: "p_shoes_012", sku: "BH-001", name: "Beige block heels", category: "shoes", audience: "women", price: 9800, colors: ["beige"], styles: ["smart_casual", "romantic", "classic"], seasonal: 7, area: "E", shelf: "E-12", stock: { "36": 3, "37": 4, "38": 2 } },
  { id: "p_shoes_013", sku: "SN-102", name: "White leather sneakers", category: "shoes", audience: "women", price: 8600, colors: ["white"], styles: ["minimal", "casual", "smart_casual"], seasonal: 8, area: "E", shelf: "E-13", stock: { "36": 4, "37": 5, "38": 3 } },
  { id: "p_shoes_014", sku: "AH-001", name: "Black ankle-strap heels", category: "shoes", audience: "women", price: 11200, colors: ["black"], styles: ["formal", "romantic", "classic"], seasonal: 6, area: "E", shelf: "E-14", stock: { "36": 2, "37": 3 } },
  { id: "p_shoes_015", sku: "BF-001", name: "Nude ballet flats", category: "shoes", audience: "women", price: 6800, colors: ["beige", "cream"], styles: ["minimal", "romantic", "classic"], seasonal: 7, area: "E", shelf: "E-15", stock: { "36": 4, "37": 4 } },
  { id: "p_shoes_016", sku: "KB-001", name: "Tan knee-high boots", category: "shoes", audience: "women", price: 15800, colors: ["brown", "beige"], styles: ["classic", "vintage", "smart_casual"], seasonal: 5, area: "E", shelf: "E-16", stock: { "36": 2, "37": 3 } },

  // --- headwear · men ---
  { id: "p_head_004", sku: "CAP-001", name: "Navy baseball cap", category: "headwear", audience: "men", price: 2800, colors: ["navy"], styles: ["casual", "sporty", "streetwear"], seasonal: 7, area: "F", shelf: "F-04", stock: { FREE: 8 } },
  { id: "p_head_005", sku: "BN-001", name: "Charcoal beanie", category: "headwear", audience: "men", price: 2400, colors: ["gray", "black"], styles: ["casual", "streetwear", "minimal"], seasonal: 5, area: "F", shelf: "F-05", stock: { FREE: 10 } },
  { id: "p_head_006", sku: "BK-001", name: "Beige bucket hat", category: "headwear", audience: "men", price: 3200, colors: ["beige"], styles: ["streetwear", "casual", "outdoor"], seasonal: 8, area: "F", shelf: "F-06", stock: { FREE: 6 } },
  { id: "p_head_007", sku: "FC-001", name: "Black flat cap", category: "headwear", audience: "men", price: 3600, colors: ["black"], styles: ["classic", "vintage", "smart_casual"], seasonal: 5, area: "F", shelf: "F-07", stock: { FREE: 5 } },
  { id: "p_head_008", sku: "DC-101", name: "Olive dad cap", category: "headwear", audience: "men", price: 2600, colors: ["olive", "green"], styles: ["casual", "sporty"], seasonal: 7, area: "F", shelf: "F-08", stock: { FREE: 7 } },
  // --- headwear · women ---
  { id: "p_head_009", sku: "WB-001", name: "Cream wide-brim hat", category: "headwear", audience: "women", price: 4800, colors: ["cream", "beige"], styles: ["romantic", "bohemian", "classic"], seasonal: 8, area: "F", shelf: "F-09", stock: { FREE: 4 } },
  { id: "p_head_010", sku: "BR-001", name: "Black beret", category: "headwear", audience: "women", price: 2900, colors: ["black"], styles: ["vintage", "romantic", "classic"], seasonal: 6, area: "F", shelf: "F-10", stock: { FREE: 6 } },
  { id: "p_head_011", sku: "KB-101", name: "Pink knit beanie", category: "headwear", audience: "women", price: 2600, colors: ["pink"], styles: ["casual", "minimal"], seasonal: 6, area: "F", shelf: "F-11", stock: { FREE: 7 } },
  { id: "p_head_012", sku: "SU-001", name: "Straw sun hat", category: "headwear", audience: "women", price: 3800, colors: ["beige", "yellow"], styles: ["bohemian", "casual", "outdoor"], seasonal: 9, area: "F", shelf: "F-12", stock: { FREE: 5 } },
  { id: "p_head_013", sku: "HS-001", name: "Navy headscarf", category: "headwear", audience: "women", price: 2200, colors: ["navy"], styles: ["romantic", "vintage", "bohemian"], seasonal: 7, area: "F", shelf: "F-13", stock: { FREE: 8 } },

  // --- bag · men ---
  { id: "p_bag_004", sku: "MS-001", name: "Black leather messenger bag", category: "bag", audience: "men", price: 12800, colors: ["black"], styles: ["business", "classic", "smart_casual"], seasonal: 5, area: "G", shelf: "G-04", stock: { FREE: 4 } },
  { id: "p_bag_005", sku: "BP-101", name: "Olive canvas backpack", category: "bag", audience: "men", price: 8600, colors: ["olive", "green"], styles: ["casual", "outdoor", "streetwear"], seasonal: 7, area: "G", shelf: "G-05", stock: { FREE: 5 } },
  { id: "p_bag_006", sku: "BC-001", name: "Brown leather briefcase", category: "bag", audience: "men", price: 16800, colors: ["brown"], styles: ["business", "classic", "formal"], seasonal: 4, area: "G", shelf: "G-06", stock: { FREE: 2 } },
  { id: "p_bag_007", sku: "SL-001", name: "Navy nylon sling bag", category: "bag", audience: "men", price: 4800, colors: ["navy"], styles: ["casual", "sporty", "streetwear"], seasonal: 8, area: "G", shelf: "G-07", stock: { FREE: 8 } },
  { id: "p_bag_008", sku: "DF-001", name: "Gray weekender duffel", category: "bag", audience: "men", price: 11200, colors: ["gray"], styles: ["casual", "outdoor", "minimal"], seasonal: 6, area: "G", shelf: "G-08", stock: { FREE: 3 } },
  // --- bag · women ---
  { id: "p_bag_009", sku: "TT-001", name: "Beige leather tote", category: "bag", audience: "women", price: 13800, colors: ["beige"], styles: ["minimal", "classic", "smart_casual"], seasonal: 7, area: "G", shelf: "G-09", stock: { FREE: 4 } },
  { id: "p_bag_010", sku: "QS-001", name: "Black quilted shoulder bag", category: "bag", audience: "women", price: 15200, colors: ["black"], styles: ["classic", "romantic", "smart_casual"], seasonal: 6, area: "G", shelf: "G-10", stock: { FREE: 3 } },
  { id: "p_bag_011", sku: "CB-201", name: "Pink mini crossbody", category: "bag", audience: "women", price: 6800, colors: ["pink"], styles: ["casual", "romantic", "minimal"], seasonal: 8, area: "G", shelf: "G-11", stock: { FREE: 6 } },
  { id: "p_bag_012", sku: "BB-001", name: "Cream woven basket bag", category: "bag", audience: "women", price: 7200, colors: ["cream", "beige"], styles: ["bohemian", "casual", "romantic"], seasonal: 9, area: "G", shelf: "G-12", stock: { FREE: 4 } },
  { id: "p_bag_013", sku: "HB-001", name: "Navy structured handbag", category: "bag", audience: "women", price: 12400, colors: ["navy"], styles: ["business", "classic", "minimal"], seasonal: 6, area: "G", shelf: "G-13", stock: { FREE: 3 } },

  // --- accessory · men ---
  { id: "p_acc_005", sku: "TI-001", name: "Navy silk tie", category: "accessory", audience: "men", price: 4200, colors: ["navy"], styles: ["business", "classic", "formal"], seasonal: 5, area: "H", shelf: "H-05", stock: { FREE: 8 } },
  { id: "p_acc_006", sku: "BL-101", name: "Brown woven leather belt", category: "accessory", audience: "men", price: 3800, colors: ["brown"], styles: ["classic", "casual", "business"], seasonal: 5, area: "H", shelf: "H-06", stock: { FREE: 10 } },
  { id: "p_acc_007", sku: "WT-201", name: "Black field watch", category: "accessory", audience: "men", price: 14800, colors: ["black"], styles: ["minimal", "classic", "business"], seasonal: 5, area: "H", shelf: "H-07", stock: { FREE: 4 } },
  { id: "p_acc_008", sku: "SC-101", name: "Gray wool scarf", category: "accessory", audience: "men", price: 3400, colors: ["gray"], styles: ["casual", "classic", "minimal"], seasonal: 5, area: "H", shelf: "H-08", stock: { FREE: 7 } },
  { id: "p_acc_009", sku: "TC-001", name: "Silver tie clip", category: "accessory", audience: "men", price: 2600, colors: ["silver"], styles: ["business", "formal", "classic"], seasonal: 4, area: "H", shelf: "H-09", stock: { FREE: 6 } },
  // --- accessory · women ---
  { id: "p_acc_010", sku: "HE-001", name: "Gold hoop earrings", category: "accessory", audience: "women", price: 3200, colors: ["gold"], styles: ["minimal", "romantic", "classic"], seasonal: 7, area: "H", shelf: "H-10", stock: { FREE: 8 } },
  { id: "p_acc_011", sku: "SS-001", name: "Cream silk scarf", category: "accessory", audience: "women", price: 3600, colors: ["cream", "white"], styles: ["romantic", "classic", "vintage"], seasonal: 7, area: "H", shelf: "H-11", stock: { FREE: 6 } },
  { id: "p_acc_012", sku: "NK-001", name: "Pearl statement necklace", category: "accessory", audience: "women", price: 5800, colors: ["white", "silver"], styles: ["romantic", "classic", "formal"], seasonal: 6, area: "H", shelf: "H-12", stock: { FREE: 4 } },
  { id: "p_acc_013", sku: "BL-201", name: "Beige slim leather belt", category: "accessory", audience: "women", price: 3400, colors: ["beige"], styles: ["minimal", "smart_casual", "classic"], seasonal: 6, area: "H", shelf: "H-13", stock: { FREE: 7 } },
  { id: "p_acc_014", sku: "BC-101", name: "Gold delicate bracelet", category: "accessory", audience: "women", price: 4200, colors: ["gold"], styles: ["minimal", "romantic"], seasonal: 7, area: "H", shelf: "H-14", stock: { FREE: 6 } },

  // --- dress · women ---
  { id: "p_dress_004", sku: "WD-001", name: "Navy wrap midi dress", category: "dress", audience: "women", price: 9800, colors: ["navy"], styles: ["smart_casual", "romantic", "classic"], seasonal: 7, area: "D", shelf: "D-04", stock: { S: 3, M: 4 } },
  { id: "p_dress_005", sku: "SD-001", name: "Black slip dress", category: "dress", audience: "women", price: 8600, colors: ["black"], styles: ["formal", "minimal", "romantic"], seasonal: 6, area: "D", shelf: "D-05", stock: { S: 2, M: 3 } },
  { id: "p_dress_006", sku: "FD-001", name: "Floral tea dress", category: "dress", audience: "women", price: 8900, colors: ["multicolor", "pink"], styles: ["romantic", "vintage", "bohemian"], seasonal: 9, area: "D", shelf: "D-06", stock: { S: 3, M: 4 } },
  { id: "p_dress_007", sku: "SD-101", name: "Beige shirt dress", category: "dress", audience: "women", price: 7800, colors: ["beige"], styles: ["smart_casual", "minimal", "casual"], seasonal: 7, area: "D", shelf: "D-07", stock: { S: 3, M: 3 } },
  { id: "p_dress_008", sku: "MD-001", name: "Red halter maxi dress", category: "dress", audience: "women", price: 11200, colors: ["red"], styles: ["romantic", "formal", "bohemian"], seasonal: 8, area: "D", shelf: "D-08", stock: { S: 2, M: 3 } },

  // --- one_piece · women ---
  { id: "p_onepiece_003", sku: "JS-001", name: "Black tailored jumpsuit", category: "one_piece", audience: "women", price: 10800, colors: ["black"], styles: ["formal", "smart_casual", "minimal"], seasonal: 6, area: "D", shelf: "D-09", stock: { S: 2, M: 3 } },
  { id: "p_onepiece_004", sku: "JS-101", name: "Beige linen jumpsuit", category: "one_piece", audience: "women", price: 9600, colors: ["beige"], styles: ["casual", "minimal", "outdoor"], seasonal: 8, area: "D", shelf: "D-10", stock: { S: 3, M: 3 } },
  { id: "p_onepiece_005", sku: "JS-102", name: "Navy wide-leg jumpsuit", category: "one_piece", audience: "women", price: 10200, colors: ["navy"], styles: ["smart_casual", "minimal", "classic"], seasonal: 6, area: "D", shelf: "D-11", stock: { S: 2, M: 3 } },
  { id: "p_onepiece_006", sku: "RP-001", name: "Denim utility romper", category: "one_piece", audience: "women", price: 7600, colors: ["blue", "navy"], styles: ["casual", "streetwear", "outdoor"], seasonal: 8, area: "D", shelf: "D-12", stock: { S: 3, M: 4 } },
  { id: "p_onepiece_007", sku: "PS-001", name: "Cream ruffle playsuit", category: "one_piece", audience: "women", price: 7200, colors: ["cream", "white"], styles: ["romantic", "bohemian", "casual"], seasonal: 8, area: "D", shelf: "D-13", stock: { S: 3, M: 3 } },

  // --- demo edge cases (DEMO_SCRIPT §5): sold-out + over-budget to prove the
  // agent re-plans instead of failing ---
  { id: "p_edge_oos", sku: "LT-001", name: "Limited trench coat", category: "outerwear", price: 24800, colors: ["beige", "brown"], styles: ["classic", "formal"], seasonal: 6, area: "A", shelf: "A-07", stock: { M: 0, L: 0 }, threshold: 1 }
];

export const inventorySeed: SeedEntry[] = specs.map(entry);

export function seedProducts(): Product[] {
  return inventorySeed.map((item) => structuredClone(item.product));
}

export function seedLevels(): InventoryLevel[] {
  return inventorySeed.map((item) => structuredClone(item.level));
}
