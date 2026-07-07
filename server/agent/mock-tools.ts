import type {
  AgentConstraints,
  BodyProfile,
  BodyTemplateResult,
  ConstraintDelta,
  OutfitPayload,
  OutfitSlotName,
  Product,
  RecommendationResponse,
  RecommendationSet,
  RecommendationType,
  Route,
  ToolCallRecord,
  TryonHandoffPayload
} from "./contracts.js";
import { createLucyPreviewToken } from "../providers/lucy.js";
import { getInventoryService } from "../inventory/factory.js";
import type { InventoryService, StoreRoute } from "../inventory/service.js";
import {
  standardColorSchema,
  styleTagSchema,
  type ProductAvailability,
  type ProductCategory,
  type Reservation,
  type ReserveResult,
  type StandardColor,
  type StyleTag
} from "../inventory/types.js";
import { composeOutfitSets, type StylistCandidate } from "./stylist.js";

export class ToolCallLog {
  readonly calls: ToolCallRecord[] = [];

  append(tool: string, input: Record<string, unknown>, output: Record<string, unknown>) {
    this.calls.push({
      tool,
      input,
      output,
      called_at: new Date().toISOString()
    });
  }
}

export class MockAgentTools {
  readonly log = new ToolCallLog();
  readonly feedbackStore: Array<Record<string, unknown>> = [];

  constructor(private readonly inventoryProvider: () => Promise<InventoryService> = getInventoryService) {}

  matchBodyTemplate(input: { session_id: string; body_profile: BodyProfile }): BodyTemplateResult {
    const shape = input.body_profile.body_shape ?? "unknown";
    const size = input.body_profile.body_size ?? "unknown";
    const templateId = `body_template_${shape}_${size}`.replace(/[^a-zA-Z0-9_]/g, "_");
    const output: BodyTemplateResult = {
      template_id: templateId,
      confidence: input.body_profile.extraction.overall_confidence,
      source: "match_body_template",
      notes: "mock deterministic body template mapping"
    };
    this.log.append("match_body_template", input as unknown as Record<string, unknown>, {
      ...output
    });
    return output;
  }

  async getRecommendations(input: {
    session_id: string;
    route: Route;
    requested_types: RecommendationType[];
    matched_body_template_id: string;
    current_style: string[];
    current_colors?: string[];
    constraints: AgentConstraints;
    round: number;
  }): Promise<RecommendationResponse> {
    const candidates = await this.searchInventory(input.session_id, input.constraints);
    const preferences = extractPreferences(input.constraints);

    // Prefer LLM styling grounded in the real in-stock candidate list; fall back
    // to the deterministic scorer when there's no key / the call fails / the
    // result is invalid (keeps tests, CI and offline demos reproducible).
    const composed = await composeOutfitSets(candidates.map(toStylistCandidate), {
      requestedTypes: input.requested_types,
      matchedBodyTemplateId: input.matched_body_template_id,
      currentStyle: input.current_style,
      currentColors: input.current_colors ?? [],
      preferredStyles: preferences.styles,
      preferredColors: preferences.colors,
      occasion: preferences.occasion,
      budgetYen: input.constraints.budget_yen
    });

    let styledBy: "llm" | "heuristic" = "heuristic";
    let sets: RecommendationSet[];
    if (composed) {
      const byId = new Map(candidates.map((product) => [product.product_id, product]));
      sets = input.requested_types.map((type, index) => {
        const picked = composed[index];
        const products = picked.product_ids
          .map((id) => byId.get(id))
          .filter((product): product is Product => Boolean(product));
        return {
          set_id: `set_r${input.round}_${type}_${index + 1}`,
          round: input.round,
          rec_type: type,
          products,
          outfit: buildOutfitPayload(products),
          reason:
            picked.reason ||
            reasonForSet(type, input.matched_body_template_id, preferences, input.constraints.budget_yen)
        };
      });
      styledBy = "llm";
    } else {
      sets = input.requested_types.map((type, index) =>
        this.buildRecommendationSet({
          type,
          round: input.round,
          index,
          candidates,
          currentStyle: input.current_style,
          matchedBodyTemplateId: input.matched_body_template_id,
          preferences,
          budgetYen: input.constraints.budget_yen
        })
      );
    }

    const response: RecommendationResponse = {
      session_id: input.session_id,
      round: input.round,
      route: input.route,
      sets,
      warnings: candidates.length === 0 ? ["no_inventory_matches"] : []
    };
    this.log.append("get_recommendations", input as unknown as Record<string, unknown>, {
      round: response.round,
      styled_by: styledBy,
      set_ids: sets.map((set) => set.set_id)
    });
    return response;
  }

  async refineRecommendations(input: {
    session_id: string;
    route: Route;
    previous_set_id: string;
    delta: ConstraintDelta;
    matched_body_template_id: string;
    current_style: string[];
    current_colors?: string[];
    constraints: AgentConstraints;
    round: number;
  }): Promise<RecommendationResponse> {
    const requestedTypes: RecommendationType[] = input.delta.avoid.some(
      (constraint) => constraint.dimension === "style"
    )
      ? ["style", "seasonal", "similar"]
      : ["similar", "style", "seasonal"];

    const response = await this.getRecommendations({
      session_id: input.session_id,
      route: input.route,
      requested_types: requestedTypes,
      matched_body_template_id: input.matched_body_template_id,
      current_style: input.current_style,
      current_colors: input.current_colors,
      constraints: input.constraints,
      round: input.round
    });

    this.log.append("refine_recommendations", input as unknown as Record<string, unknown>, {
      round: response.round,
      set_ids: response.sets.map((set) => set.set_id)
    });
    return response;
  }

  /** Live inventory search — the tool that replaces the old hard-coded catalog. Logged as `search_inventory`. */
  async searchInventory(sessionId: string, constraints: AgentConstraints): Promise<Product[]> {
    const service = await this.inventoryProvider();
    const query = buildSearchQuery(constraints);
    const results = await service.search(query);
    const products = results.map(toRecProduct);
    this.log.append(
      "search_inventory",
      { session_id: sessionId, ...query },
      { count: products.length, product_ids: products.map((p) => p.product_id) }
    );
    return products;
  }

  /** Reserve one unit (first available size) of every product in a set. Logged as `reserve_items`. */
  async reserveOutfit(input: { session_id: string; set: RecommendationSet }): Promise<ReserveResult> {
    const service = await this.inventoryProvider();
    const items = input.set.products
      .map((product) => {
        const size = firstAvailableSize(product);
        return size ? { product_id: product.product_id, size, qty: 1 } : null;
      })
      .filter((item): item is { product_id: string; size: string; qty: number } => item !== null);

    if (items.length === 0) {
      const empty: ReserveResult = { ok: false, reason: "insufficient_stock", shortfalls: [] };
      this.log.append("reserve_items", { session_id: input.session_id, set_id: input.set.set_id, items }, { ok: false });
      return empty;
    }

    const result = await service.reserve({ session_id: input.session_id, items });
    this.log.append(
      "reserve_items",
      { session_id: input.session_id, set_id: input.set.set_id, items },
      result.ok
        ? { ok: true, reservation_id: result.reservation.reservation_id }
        : { ok: false, reason: result.reason, shortfalls: result.shortfalls }
    );
    return result;
  }

  /** Commit a reservation to a real stock decrement. Logged as `confirm_purchase`. */
  async confirmPurchase(input: { session_id: string; reservation_id: string }): Promise<Reservation | null> {
    const service = await this.inventoryProvider();
    const reservation = await service.confirmPurchase(input.reservation_id);
    this.log.append("confirm_purchase", input, { status: reservation?.status ?? "not_found" });
    return reservation;
  }

  /** Build an in-store pickup route from the selected products' shelf locations. Logged as `create_store_route`. */
  async createStoreRoute(input: { session_id: string; product_ids: string[] }): Promise<StoreRoute> {
    const service = await this.inventoryProvider();
    const route = await service.buildStoreRoute(input.product_ids);
    this.log.append("create_store_route", input, { stops: route.stops.length, summary: route.summary });
    return route;
  }

  recordFeedback(input: {
    session_id: string;
    set_id: string;
    feedback: Record<string, unknown>;
    constraint_delta: ConstraintDelta;
  }) {
    const output = {
      feedback_id: `feedback_${String(this.feedbackStore.length + 1).padStart(3, "0")}`,
      status: "recorded"
    };
    this.feedbackStore.push({ ...input, ...output });
    this.log.append("record_feedback", input, output);
    return output;
  }

  createRealFaceProfile(input: {
    session_id: string;
    image_ref: string;
    consent_given: boolean;
    expire_at: string;
  }) {
    const output = {
      consent_given: input.consent_given,
      face_mode: "real_face" as const,
      face_profile_id: `face_${input.session_id}`,
      expire_at: input.expire_at
    };
    this.log.append("create_real_face_profile", input, output);
    return output;
  }

  async buildRealtimeTryonPayload(input: {
    session_id: string;
    set: RecommendationSet;
    slot?: OutfitSlotName;
    duration_limit_sec: number;
    origin?: string;
  }) {
    const slot =
      input.slot ??
      input.set.outfit.slots.find((candidate) => candidate.slot === "outerwear")?.slot ??
      input.set.outfit.slots[0]?.slot;
    const selected = input.set.outfit.slots.find((candidate) => candidate.slot === slot);
    if (!selected) return null;

    const token = await createLucyPreviewToken({
      session_id: input.session_id,
      set_id: input.set.set_id,
      product_id: selected.product_id,
      duration_limit_sec: input.duration_limit_sec,
      origin: input.origin
    });
    const output = {
      provider: "decart_lucy_vton" as const,
      mode: "realtime" as const,
      configured: token.configured,
      model: token.model,
      session_id: input.session_id,
      set_id: input.set.set_id,
      slot: selected.slot,
      product_id: selected.product_id,
      garment_image_url: selected.vton_reference_image_url,
      prompt: selected.prompt,
      duration_limit_sec: token.duration_limit_sec,
      enhance: false,
      client_token: token.client_token,
      expires_at: token.expires_at,
      warnings: token.warnings
    };
    this.log.append("prepare_realtime_tryon_payload", input as unknown as Record<string, unknown>, {
      product_id: output.product_id,
      slot: output.slot,
      configured: output.configured
    });
    return output;
  }

  handoffTryonGeneration(input: TryonHandoffPayload) {
    const output = {
      status: "accepted",
      generation_id: `tryon_${input.session_id}_${input.set_id}`,
      ...input
    };
    this.log.append("handoff_tryon_generation", input as unknown as Record<string, unknown>, {
      status: output.status,
      generation_id: output.generation_id
    });
    return output;
  }

  private buildRecommendationSet(input: {
    type: RecommendationType;
    round: number;
    index: number;
    candidates: Product[];
    currentStyle: string[];
    matchedBodyTemplateId: string;
    preferences: RecPreferences;
    budgetYen?: number;
  }): RecommendationSet {
    const anchorStyle = input.type === "similar" ? input.currentStyle[0] : styleForType(input.type);
    const sorted = [...input.candidates].sort(
      (a, b) => scoreProduct(b, anchorStyle, input.preferences) - scoreProduct(a, anchorStyle, input.preferences)
    );
    const products = chooseOutfitProducts(sorted, input.index);
    const setId = `set_r${input.round}_${input.type}_${input.index + 1}`;
    return {
      set_id: setId,
      round: input.round,
      rec_type: input.type,
      products,
      outfit: buildOutfitPayload(products),
      reason: reasonForSet(input.type, input.matchedBodyTemplateId, input.preferences, input.budgetYen)
    };
  }
}

interface RecPreferences {
  colors: StandardColor[];
  styles: StyleTag[];
  occasion?: string;
}

/** Occasion words (from LLM/heuristic need extraction) → controlled style vocabulary. */
const OCCASION_STYLES: Record<string, StyleTag[]> = {
  beach: ["casual", "outdoor", "bohemian"],
  vacation: ["casual", "outdoor", "bohemian"],
  holiday: ["casual", "outdoor"],
  work: ["business", "smart_casual", "minimal", "workwear"],
  office: ["business", "smart_casual", "workwear"],
  commute: ["smart_casual", "minimal", "business"],
  date: ["romantic", "smart_casual", "classic"],
  party: ["formal", "smart_casual"],
  wedding: ["formal", "classic"],
  gym: ["sporty", "athleisure"],
  sport: ["sporty", "athleisure"],
  casual: ["casual"],
  daily: ["casual", "minimal"]
};

/** Free-form style words → controlled style vocabulary synonyms. */
const STYLE_SYNONYMS: Record<string, StyleTag[]> = {
  breezy: ["casual", "outdoor"],
  refreshing: ["casual", "outdoor"],
  light: ["casual"],
  airy: ["casual", "outdoor"],
  relaxed: ["casual"],
  simple: ["minimal"],
  minimalist: ["minimal"],
  clean: ["minimal"],
  elegant: ["classic", "smart_casual"],
  chic: ["smart_casual", "classic"],
  dressy: ["formal"],
  street: ["streetwear"],
  athletic: ["sporty", "athleisure"],
  cute: ["romantic"],
  sweet: ["romantic"],
  retro: ["vintage"],
  boho: ["bohemian"],
  smart: ["smart_casual"]
};

function mapToStyleTags(raw: string): StyleTag[] {
  const value = raw.toLowerCase().trim();
  if (isStyleTag(value)) return [value];
  return STYLE_SYNONYMS[value] ?? [];
}

function occasionToStyleTags(occasion: string): StyleTag[] {
  return OCCASION_STYLES[occasion.toLowerCase().trim()] ?? [];
}

function extractPreferences(constraints: AgentConstraints): RecPreferences {
  const prefer = constraints.prefer;
  const colors = unique(
    prefer.filter((c) => c.dimension === "color").map((c) => c.value).filter(isStandardColor)
  );
  const occasion = prefer.find((c) => c.dimension === "occasion")?.value;
  const styles = new Set<StyleTag>();
  for (const c of prefer.filter((c) => c.dimension === "style")) {
    for (const tag of mapToStyleTags(c.value)) styles.add(tag);
  }
  if (occasion) for (const tag of occasionToStyleTags(occasion)) styles.add(tag);
  return { colors, styles: Array.from(styles), occasion };
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

/** Category → try-on slot. one_piece maps to the dress slot; headwear/bag fold into accessory. */
const SLOT_BY_CATEGORY: Record<ProductCategory, OutfitSlotName> = {
  outerwear: "outerwear",
  top: "top",
  bottom: "bottom",
  dress: "dress",
  one_piece: "dress",
  shoes: "shoes",
  headwear: "accessory",
  bag: "accessory",
  accessory: "accessory"
};

function toRecProduct(pa: ProductAvailability): Product {
  const stock: Record<string, number> = {};
  for (const size of pa.availability) stock[size.size] = size.available;
  return {
    product_id: pa.product.product_id,
    sku: pa.product.sku,
    name: pa.product.name,
    category: SLOT_BY_CATEGORY[pa.product.category],
    price_yen: pa.product.price_yen,
    colors: pa.product.colors,
    style_tags: pa.product.style_tags,
    body_template_tags: pa.product.body_template_tags,
    seasonal_rank: pa.product.seasonal_rank,
    stock,
    image_url: pa.product.image_url,
    vton_reference_image_url: pa.product.vton_reference_image_url,
    vton_prompt: pa.product.vton_prompt
  };
}

/** Project a catalog Product down to the lightweight shape the LLM stylist sees. */
function toStylistCandidate(product: Product): StylistCandidate {
  return {
    product_id: product.product_id,
    name: product.name,
    category: product.category,
    colors: product.colors,
    style_tags: product.style_tags,
    price_yen: product.price_yen,
    body_template_tags: product.body_template_tags,
    seasonal_rank: product.seasonal_rank
  };
}

function buildSearchQuery(constraints: AgentConstraints) {
  const avoidColors = constraints.avoid
    .filter((c) => c.dimension === "color")
    .map((c) => c.value)
    .filter(isStandardColor);
  const avoidStyles = constraints.avoid
    .filter((c) => c.dimension === "style")
    .map((c) => c.value)
    .filter(isStyleTag);
  return {
    avoid_colors: avoidColors,
    avoid_style_tags: avoidStyles,
    max_price_yen: constraints.budget_yen,
    in_stock_only: true,
    limit: 200
  };
}

function isStandardColor(value: string): value is StandardColor {
  return (standardColorSchema.options as readonly string[]).includes(value);
}

function isStyleTag(value: string): value is StyleTag {
  return (styleTagSchema.options as readonly string[]).includes(value);
}

function firstAvailableSize(product: Product): string | undefined {
  for (const [size, quantity] of Object.entries(product.stock)) {
    if (quantity > 0) return size;
  }
  return undefined;
}

function styleForType(type: RecommendationType) {
  if (type === "style") return "smart_casual";
  if (type === "seasonal") return "seasonal";
  if (type === "explicit_need") return "minimal";
  return "casual";
}

function scoreProduct(product: Product, anchorStyle?: string, preferences?: RecPreferences) {
  const stockSum = Object.values(product.stock).reduce((total, quantity) => total + quantity, 0);
  let score = product.seasonal_rank + stockSum / 10;
  // Per-rec-type anchor (keeps the three sets distinct).
  if (anchorStyle && product.style_tags.includes(anchorStyle)) score += 6;
  // Customer preferences dominate: matched style/colour outweigh the anchor.
  for (const style of preferences?.styles ?? []) {
    if (product.style_tags.includes(style)) score += 8;
  }
  for (const color of preferences?.colors ?? []) {
    if (product.colors.includes(color)) score += 8;
  }
  return score;
}

function chooseOutfitProducts(products: Product[], index: number) {
  // Products arrive already sorted best-match-first, so set 1 (index 0) takes
  // the top item per category; sets 2/3 take the next-best for variety.
  const pick = (category: OutfitSlotName) => {
    const items = products.filter((product) => product.category === category);
    return items[index % Math.max(items.length, 1)];
  };
  return [pick("outerwear"), pick("top"), pick("bottom"), pick("shoes")].filter(Boolean);
}

function buildOutfitPayload(products: Product[]): OutfitPayload {
  return {
    slots: products.map((product) => ({
      slot: product.category,
      product_id: product.product_id,
      image_url: product.image_url,
      vton_reference_image_url: product.vton_reference_image_url,
      prompt: product.vton_prompt
    }))
  };
}

function reasonForType(type: RecommendationType, templateId: string) {
  if (type === "similar") return `Keeps the customer's current style while fitting ${templateId}.`;
  if (type === "style") return `Uses the store's main styling direction for ${templateId}.`;
  if (type === "seasonal") return `Prioritizes seasonal and high-stock items for ${templateId}.`;
  return `Matches the explicit customer request and current stock for ${templateId}.`;
}

/** Reason text that reflects the actual customer signals used to rank this set. */
function reasonForSet(
  type: RecommendationType,
  templateId: string,
  preferences: RecPreferences,
  budgetYen?: number
) {
  const bits: string[] = [];
  if (preferences.occasion) bits.push(`for ${preferences.occasion}`);
  if (preferences.styles.length) bits.push(`leaning ${preferences.styles.slice(0, 2).join(" / ")}`);
  if (preferences.colors.length) bits.push(`in ${preferences.colors.slice(0, 2).join(" / ")}`);
  if (bits.length === 0) return reasonForType(type, templateId);
  const lead = type === "seasonal" ? "A seasonal take" : type === "style" ? "A styled option" : "Styled";
  const budget = budgetYen ? `, within ¥${budgetYen.toLocaleString("en-US")}` : "";
  return `${lead} ${bits.join(", ")}${budget} — in your size and in stock.`;
}
