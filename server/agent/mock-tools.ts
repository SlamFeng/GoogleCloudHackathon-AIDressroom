import type {
  AgentConstraints,
  AgentLanguage,
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
import { pick } from "./i18n.js";
import { composeOutfitSets, type StylistCandidate } from "./stylist.js";
import { readTrends, warmTrends, currentSeason, type TrendResult } from "./trends.js";

// This log is a per-process singleton shared by EVERY session for the server's
// lifetime, so it must be bounded — recent turns are all the demo (and the
// /tool-calls debug route) ever needs.
const MAX_TOOL_CALLS = 1000;
const MAX_FEEDBACK_RECORDS = 500;

export class ToolCallLog {
  readonly calls: ToolCallRecord[] = [];

  append(tool: string, input: Record<string, unknown>, output: Record<string, unknown>) {
    this.calls.push({
      tool,
      input,
      output,
      called_at: new Date().toISOString()
    });
    if (this.calls.length > MAX_TOOL_CALLS) {
      this.calls.splice(0, this.calls.length - MAX_TOOL_CALLS);
    }
  }
}

export class MockAgentTools {
  readonly log = new ToolCallLog();
  readonly feedbackStore: Array<Record<string, unknown>> = [];
  private feedbackSeq = 0;

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
    language?: AgentLanguage;
    route: Route;
    requested_types: RecommendationType[];
    matched_body_template_id: string;
    current_style: string[];
    current_colors?: string[];
    gender?: string;
    age_range?: string;
    constraints: AgentConstraints;
    round: number;
  }): Promise<RecommendationResponse> {
    const candidates = (await this.searchInventory(input.session_id, input.constraints)).filter(
      (product) => isGenderAppropriate(product, input.gender)
    );
    const preferences = extractPreferences(input.constraints);

    // Live Google-Search trend signal, folded into the styling preferences so it
    // biases both the shortlist and the LLM stylist toward what is trending now.
    const trends = await this.getTrendingStyles({
      session_id: input.session_id,
      occasion: preferences.occasion,
      gender: input.gender,
      age_range: input.age_range
    });
    const trendedPreferences = {
      ...preferences,
      styles: unique([...preferences.styles, ...((trends?.trend_styles ?? []) as StyleTag[])]),
      colors: unique([...preferences.colors, ...((trends?.trend_colors ?? []) as StandardColor[])])
    };

    // Two-stage selection: first a fast deterministic shortlist (top few per
    // slot), then the LLM only composes coherent looks from that small set —
    // small prompt, low latency. Falls back to the deterministic scorer when
    // there's no key / it times out / the result is invalid.
    const shortlist = buildStylistShortlist(candidates, trendedPreferences, input.current_style);
    const composed = await composeOutfitSets(shortlist.map(toStylistCandidate), {
      language: input.language,
      requestedTypes: input.requested_types,
      matchedBodyTemplateId: input.matched_body_template_id,
      currentStyle: input.current_style,
      currentColors: input.current_colors ?? [],
      preferredStyles: trendedPreferences.styles,
      preferredColors: trendedPreferences.colors,
      occasion: preferences.occasion,
      budgetYen: input.constraints.budget_yen,
      trendingCategories: trends?.trend_categories,
      trendingStyles: trends?.trend_styles,
      trendingColors: trends?.trend_colors
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
            reasonForSet(type, input.matched_body_template_id, preferences, input.constraints.budget_yen, input.language)
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
          budgetYen: input.constraints.budget_yen,
          language: input.language
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
    language?: AgentLanguage;
    route: Route;
    previous_set_id: string;
    delta: ConstraintDelta;
    matched_body_template_id: string;
    current_style: string[];
    current_colors?: string[];
    gender?: string;
    age_range?: string;
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
      language: input.language,
      route: input.route,
      requested_types: requestedTypes,
      matched_body_template_id: input.matched_body_template_id,
      current_style: input.current_style,
      current_colors: input.current_colors,
      gender: input.gender,
      age_range: input.age_range,
      constraints: input.constraints,
      round: input.round
    });

    this.log.append("refine_recommendations", input as unknown as Record<string, unknown>, {
      round: response.round,
      set_ids: response.sets.map((set) => set.set_id)
    });
    return response;
  }

  /**
   * Swap ONE slot in an existing look, keeping every other piece untouched
   * ("不喜欢上衣，其余都不错" → new top only). Picks the replacement that best
   * coordinates with the KEPT pieces (colour/style harmony), never the item
   * that's already there. Returns a single set that reuses the original set_id
   * so the UI updates the chosen look in place.
   */
  async swapSlot(input: {
    session_id: string;
    language?: AgentLanguage;
    route: Route;
    previous_set: RecommendationSet;
    category: OutfitSlotName;
    gender?: string;
    constraints: AgentConstraints;
    round: number;
  }): Promise<RecommendationResponse> {
    const keep = input.previous_set.products.filter((product) => product.category !== input.category);
    const currentIds = new Set(input.previous_set.products.map((product) => product.product_id));
    const pool = (await this.searchInventory(input.session_id, input.constraints)).filter(
      (product) =>
        product.category === input.category &&
        !currentIds.has(product.product_id) &&
        isGenderAppropriate(product, input.gender)
    );
    const preferences = extractPreferences(input.constraints);

    // Rank each candidate by base preference score plus how well it coordinates
    // with the pieces we're keeping — so the swapped-in item still reads as one
    // coherent outfit, not a random substitution.
    const replacement = pool
      .map((product) => ({
        product,
        score:
          scoreProduct(product, undefined, preferences) +
          keep.reduce((sum, kept) => sum + coordinationScore(product, kept), 0)
      }))
      .sort((a, b) => b.score - a.score)[0]?.product;

    const products = replacement ? orderSlots([...keep, replacement]) : input.previous_set.products;
    const set: RecommendationSet = {
      set_id: input.previous_set.set_id,
      round: input.round,
      rec_type: input.previous_set.rec_type,
      products,
      outfit: buildOutfitPayload(products),
      reason: replacement
        ? pick(input.language, {
            zh: `保留了其余单品，只为你换了一件更搭的${input.category}。`,
            en: `Kept the rest of the look and swapped in a ${input.category} that matches better.`,
            ja: `他のアイテムはそのままに、より相性のいい${input.category}だけを交換しました。`
          })
        : input.previous_set.reason
    };

    this.log.append(
      "swap_slot",
      { session_id: input.session_id, set_id: input.previous_set.set_id, category: input.category },
      { swapped_to: replacement?.product_id ?? null, kept: keep.map((product) => product.product_id) }
    );

    return {
      session_id: input.session_id,
      round: input.round,
      route: input.route,
      sets: [set],
      warnings: replacement ? [] : ["no_swap_candidate"]
    };
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

  /**
   * Live "what's trending now" signal via Gemini + Google Search grounding.
   * Logged as `get_trending_styles` so the tool trace proves Google Search was
   * actually used (and whether this turn hit a fresh search or the daily cache).
   */
  /**
   * Cache-only trend read for the recommendation path — NEVER runs a live search
   * (that happens once at profile time via prewarmTrends). Reads the prefetched
   * base bucket for this demographic; the LLM stylist combines it with the live
   * occasion. Returns null (and the turn stays trend-agnostic) if prefetch hasn't
   * landed yet — keeping every turn fast.
   */
  async getTrendingStyles(input: {
    session_id: string;
    occasion?: string;
    gender?: string;
    age_range?: string;
  }): Promise<TrendResult | null> {
    const now = new Date();
    const base = {
      occasion: undefined,
      gender: input.gender,
      ageRange: input.age_range,
      region: process.env.STORE_REGION ?? "Japan",
      season: currentSeason(now.getMonth() + 1)
    };
    // Prefer the occasion-specific bucket; on a miss, serve the base bucket now
    // and warm the occasion bucket in the background so the NEXT turn (a refine,
    // or the next customer with the same occasion today) gets it — the live
    // conversation itself never waits on a search.
    let occasionHit = false;
    let result: TrendResult | null = null;
    if (input.occasion) {
      const occasionCtx = { ...base, occasion: input.occasion };
      result = readTrends(occasionCtx, now);
      if (result) occasionHit = true;
      else void warmTrends(occasionCtx, now).catch(() => {});
    }
    result ??= readTrends(base, now);
    this.log.append(
      "get_trending_styles",
      {
        session_id: input.session_id,
        source: "cache",
        occasion_specific: occasionHit,
        region: base.region,
        season: base.season,
        occasion: input.occasion ?? null,
        gender: input.gender ?? null
      },
      result
        ? {
            used_google_search: true,
            from_cache: true,
            sources: result.source_count,
            trend_categories: result.trend_categories,
            trend_styles: result.trend_styles,
            trend_colors: result.trend_colors,
            summary: result.summary.slice(0, 160)
          }
        : { used_google_search: false, reason: "prefetch_not_ready" }
    );
    return result;
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
    this.feedbackSeq += 1;
    const output = {
      // A counter, not array length — the store is capped, so length would
      // repeat ids once eviction starts.
      feedback_id: `feedback_${String(this.feedbackSeq).padStart(3, "0")}`,
      status: "recorded"
    };
    this.feedbackStore.push({ ...input, ...output });
    if (this.feedbackStore.length > MAX_FEEDBACK_RECORDS) {
      this.feedbackStore.splice(0, this.feedbackStore.length - MAX_FEEDBACK_RECORDS);
    }
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
      // Use the real catalog image (the -vton.png variants were never generated);
      // the client uploads it to Decart as a file reference for the VTON overlay.
      garment_image_url: selected.image_url ?? selected.vton_reference_image_url,
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
    language?: AgentLanguage;
  }): RecommendationSet {
    const anchorStyle = input.type === "similar" ? input.currentStyle[0] : styleForType(input.type);
    const baseScore = (product: Product) => scoreProduct(product, anchorStyle, input.preferences);
    const sorted = [...input.candidates].sort((a, b) => baseScore(b) - baseScore(a));
    const products = composeCoherentOutfit(sorted, input.index, baseScore);
    const setId = `set_r${input.round}_${input.type}_${input.index + 1}`;
    return {
      set_id: setId,
      round: input.round,
      rec_type: input.type,
      products,
      outfit: buildOutfitPayload(products),
      reason: reasonForSet(input.type, input.matchedBodyTemplateId, input.preferences, input.budgetYen, input.language)
    };
  }
}

interface RecPreferences {
  colors: StandardColor[];
  styles: StyleTag[];
  occasion?: string;
  formality?: string;
  colorTone?: string;
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
  // Most-recent formality / colour-tone request wins (customers refine).
  const formality = [...prefer].reverse().find((c) => c.dimension === "formality")?.value;
  const colorTone = [...prefer].reverse().find((c) => c.dimension === "color_tone")?.value;
  return { colors, styles: Array.from(styles), occasion, formality, colorTone };
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

// Canonical head-to-toe order so a swapped-in piece slots back into its natural
// position instead of appearing at the end of the look.
const SLOT_ORDER: OutfitSlotName[] = ["outerwear", "top", "dress", "bottom", "shoes", "accessory"];
function orderSlots(products: Product[]): Product[] {
  return [...products].sort(
    (a, b) => SLOT_ORDER.indexOf(a.category) - SLOT_ORDER.indexOf(b.category)
  );
}

// Style tags that read as dressed-up (→ formal) vs. deliberately relaxed. Anything
// in between (smart_casual / minimal / preppy) is the middle ground.
const FORMAL_STYLE_TAGS = new Set<string>(["formal", "business", "classic", "workwear"]);
const SMART_STYLE_TAGS = new Set<string>(["smart_casual", "minimal", "preppy"]);
/** Coarse formality facet from a product's style tags. */
function deriveFormality(styleTags: string[]): "formal" | "smart_casual" | "casual" {
  if (styleTags.some((tag) => FORMAL_STYLE_TAGS.has(tag))) return "formal";
  if (styleTags.some((tag) => SMART_STYLE_TAGS.has(tag))) return "smart_casual";
  return "casual";
}

const DARK_TONE_COLORS = new Set<string>(["black", "navy", "gray", "olive", "brown", "purple"]);
const LIGHT_TONE_COLORS = new Set<string>(["white", "cream", "beige", "silver", "pink", "yellow", "gold"]);
/** Coarse colour-tone facet: dark / light / mixed, by majority of the palette. */
function deriveColorTone(colors: string[]): "dark" | "light" | "mixed" {
  let dark = 0;
  let light = 0;
  for (const color of colors) {
    if (DARK_TONE_COLORS.has(color)) dark += 1;
    else if (LIGHT_TONE_COLORS.has(color)) light += 1;
  }
  if (dark > light) return "dark";
  if (light > dark) return "light";
  return "mixed";
}

function toRecProduct(pa: ProductAvailability): Product {
  const stock: Record<string, number> = {};
  for (const size of pa.availability) stock[size.size] = size.available;
  return {
    product_id: pa.product.product_id,
    sku: pa.product.sku,
    name: pa.product.name,
    category: SLOT_BY_CATEGORY[pa.product.category],
    audience: pa.product.audience,
    price_yen: pa.product.price_yen,
    colors: pa.product.colors,
    style_tags: pa.product.style_tags,
    formality: deriveFormality(pa.product.style_tags),
    color_tone: deriveColorTone(pa.product.colors),
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
  // Coarse facet requests ("正式一点" / "深色系") boost items that fit the tone.
  if (preferences?.formality && product.formality === preferences.formality) score += 10;
  if (preferences?.colorTone && product.color_tone === preferences.colorTone) score += 8;
  return score;
}

// Products have no gender field, so keep clearly women's-only items out of a
// male customer's pool (the "dress on a man" bug). Women / neutral aren't
// filtered — the catalog has no men-only pieces. Matches the "dress" slot
// (dress + one_piece) plus name hints for skirts, heels, blouses, etc.
const WOMENS_NAME_HINTS = /(dress|skirt|blouse|camisole|\bcami\b|heels|gown|romper|jumpsuit|tunic|maxi)/i;

// Prefer the explicit audience tag; fall back to category/name hints for older
// products that predate it. male → hide women's; female → hide men's; neutral → all.
function isGenderAppropriate(product: Product, gender?: string): boolean {
  const audience = product.audience ?? "unisex";
  if (gender === "male") {
    if (audience === "women") return false;
    if (audience === "men" || audience === "unisex") {
      return product.category !== "dress" && !WOMENS_NAME_HINTS.test(product.name);
    }
  }
  if (gender === "female") {
    return audience !== "men";
  }
  return true;
}

/** Slots the stylist composes from (accessory/bag/headwear stay out of the shortlist). */
const STYLIST_SLOTS: OutfitSlotName[] = ["outerwear", "top", "bottom", "dress", "shoes"];
const STYLIST_PER_SLOT = 4;

/**
 * Fast, deterministic pre-selection: group the in-stock candidates by slot and
 * keep only the top few per slot by preference score. Turns a 200-item list
 * into a ~20-item curated shortlist so the LLM's prompt is small and quick.
 */
function buildStylistShortlist(
  candidates: Product[],
  preferences: RecPreferences,
  currentStyle: string[]
): Product[] {
  const anchor = currentStyle[0];
  const shortlist: Product[] = [];
  for (const slot of STYLIST_SLOTS) {
    const top = candidates
      .filter((product) => product.category === slot)
      .sort((a, b) => scoreProduct(b, anchor, preferences) - scoreProduct(a, anchor, preferences))
      .slice(0, STYLIST_PER_SLOT);
    shortlist.push(...top);
  }
  return shortlist;
}

// Colours that read as neutral and coordinate with almost anything.
const NEUTRAL_COLORS = new Set<string>([
  "white", "black", "gray", "grey", "beige", "cream", "ivory", "navy", "tan", "khaki", "brown", "charcoal"
]);

// Broad style families used to judge whether two garments cohere or clash.
const STYLE_FAMILY: Record<string, string> = {
  sporty: "athletic", athleisure: "athletic", outdoor: "athletic",
  formal: "polished", classic: "polished", business: "polished", smart_casual: "polished", workwear: "polished", preppy: "polished",
  casual: "relaxed", minimal: "relaxed", streetwear: "relaxed",
  romantic: "feminine", bohemian: "feminine", vintage: "feminine"
};

// Family pairs that look wrong together (e.g. sporty trail shoes with a silk cami).
const CLASHING_FAMILIES = new Set<string>([
  "athletic|polished", "polished|athletic",
  "athletic|feminine", "feminine|athletic",
  "athletic|formal", "formal|athletic"
]);

function styleFamilies(product: Product): Set<string> {
  const families = new Set<string>();
  for (const tag of product.style_tags) {
    const family = STYLE_FAMILY[tag];
    if (family) families.add(family);
  }
  return families;
}

function stylesClash(a: Product, b: Product): boolean {
  const fa = styleFamilies(a);
  const fb = styleFamilies(b);
  for (const x of fa) for (const y of fb) if (CLASHING_FAMILIES.has(`${x}|${y}`)) return true;
  return false;
}

function sharesColor(a: Product, b: Product) {
  return a.colors.some((color) => b.colors.includes(color));
}

function sharesStyle(a: Product, b: Product) {
  return a.style_tags.some((tag) => b.style_tags.includes(tag));
}

function allNeutral(product: Product) {
  return product.colors.length > 0 && product.colors.every((color) => NEUTRAL_COLORS.has(color));
}

/** How well `candidate` coordinates with the outfit's anchor piece. */
function coordinationScore(candidate: Product, anchor: Product): number {
  let bonus = 0;
  if (sharesColor(candidate, anchor)) bonus += 10;
  else if (allNeutral(candidate) || allNeutral(anchor)) bonus += 6;
  else bonus -= 5;
  if (sharesStyle(candidate, anchor)) bonus += 10;
  if (stylesClash(candidate, anchor)) bonus -= 25;
  return bonus;
}

/**
 * Build ONE coordinated look from the scored candidates. Picks a centrepiece
 * (dress > bottom > top, offset by set index for variety), then fills the other
 * slots by how well each item coordinates with that anchor — colour harmony and
 * style coherence — rather than taking the top-scored item per slot in
 * isolation. Outerwear is only added when it actually harmonises.
 */
function composeCoherentOutfit(
  sorted: Product[],
  index: number,
  baseScore: (product: Product) => number
): Product[] {
  const inSlot = (slot: OutfitSlotName) => sorted.filter((product) => product.category === slot);

  const heroPool = [...inSlot("dress"), ...inSlot("bottom"), ...inSlot("top")];
  if (heroPool.length === 0) {
    const pick = (slot: OutfitSlotName) => inSlot(slot)[0];
    return [pick("outerwear"), pick("top"), pick("bottom"), pick("shoes")].filter(Boolean) as Product[];
  }
  const anchor = heroPool[index % heroPool.length];

  const pickCoordinated = (slot: OutfitSlotName): Product | undefined => {
    const pool = inSlot(slot).filter((product) => product.product_id !== anchor.product_id);
    if (pool.length === 0) return undefined;
    return pool
      .map((product) => ({ product, score: coordinationScore(product, anchor) + baseScore(product) * 0.1 }))
      .sort((a, b) => b.score - a.score)[0].product;
  };

  const out: Product[] = [];

  // Outerwear is optional: only include it when it genuinely coordinates.
  const outer = pickCoordinated("outerwear");
  if (outer && coordinationScore(outer, anchor) >= 6) out.push(outer);

  if (anchor.category === "dress") {
    out.push(anchor);
  } else {
    const top = anchor.category === "top" ? anchor : pickCoordinated("top");
    const bottom = anchor.category === "bottom" ? anchor : pickCoordinated("bottom");
    if (top) out.push(top);
    if (bottom) out.push(bottom);
  }

  const shoes = pickCoordinated("shoes");
  if (shoes) out.push(shoes);

  return out.filter(Boolean);
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

function reasonForType(type: RecommendationType, templateId: string, language?: AgentLanguage) {
  if (type === "similar")
    return pick(language, {
      zh: `延续你现在的穿搭风格，同时贴合${templateId}。`,
      en: `Keeps the customer's current style while fitting ${templateId}.`,
      ja: `今のスタイルを活かしつつ、${templateId}に合わせました。`
    });
  if (type === "style")
    return pick(language, {
      zh: `按门店主打的造型方向为${templateId}挑选。`,
      en: `Uses the store's main styling direction for ${templateId}.`,
      ja: `店舗のメインスタイリング方針で${templateId}向けに選びました。`
    });
  if (type === "seasonal")
    return pick(language, {
      zh: `优先应季、库存充足的单品，适配${templateId}。`,
      en: `Prioritizes seasonal and high-stock items for ${templateId}.`,
      ja: `季節感と在庫の豊富さを優先し、${templateId}に合わせました。`
    });
  return pick(language, {
    zh: `按你的明确需求结合现货为${templateId}挑选。`,
    en: `Matches the explicit customer request and current stock for ${templateId}.`,
    ja: `ご要望と現在の在庫をもとに${templateId}向けに選びました。`
  });
}

/** Reason text that reflects the actual customer signals used to rank this set. */
function reasonForSet(
  type: RecommendationType,
  templateId: string,
  preferences: RecPreferences,
  budgetYen?: number,
  language?: AgentLanguage
) {
  const occasion = preferences.occasion;
  const styles = preferences.styles.slice(0, 2).join(" / ");
  const colors = preferences.colors.slice(0, 2).join(" / ");
  if (!occasion && !styles && !colors) return reasonForType(type, templateId, language);

  const bits: string[] = [];
  if (language === "zh" || language === undefined) {
    if (occasion) bits.push(`适合${occasion}`);
    if (styles) bits.push(`偏${styles}`);
    if (colors) bits.push(`以${colors}为主`);
    const lead = type === "seasonal" ? "应季搭配" : type === "style" ? "风格搭配" : "为你搭配";
    const budget = budgetYen ? `，预算¥${budgetYen.toLocaleString("en-US")}以内` : "";
    return `${lead}：${bits.join("，")}${budget}——有你的尺码且是现货。`;
  }
  if (language === "ja") {
    if (occasion) bits.push(`${occasion}向け`);
    if (styles) bits.push(`${styles}寄り`);
    if (colors) bits.push(`${colors}系`);
    const lead = type === "seasonal" ? "季節のコーデ" : type === "style" ? "スタイル提案" : "コーデ提案";
    const budget = budgetYen ? `、予算¥${budgetYen.toLocaleString("en-US")}以内` : "";
    return `${lead}：${bits.join("、")}${budget}。サイズも在庫もあります。`;
  }
  if (occasion) bits.push(`for ${occasion}`);
  if (styles) bits.push(`leaning ${styles}`);
  if (colors) bits.push(`in ${colors}`);
  const lead = type === "seasonal" ? "A seasonal take" : type === "style" ? "A styled option" : "Styled";
  const budget = budgetYen ? `, within ¥${budgetYen.toLocaleString("en-US")}` : "";
  return `${lead} ${bits.join(", ")}${budget} — in your size and in stock.`;
}
