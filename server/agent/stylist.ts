// LLM stylist. Given the REAL in-stock candidate list (from search_inventory),
// Gemini composes coordinated outfits — reasoning over body fit, colour
// harmony, style coherence, occasion and budget — choosing only product_ids
// that exist in the candidate list (inventory-grounded). Falls back to the
// deterministic scorer when there is no key, the call fails, or the result is
// invalid, so tests / CI / offline demos stay reproducible.

import { GoogleGenAI } from "@google/genai";
import { logAgentTurn } from "./logger.js";

export interface StylistCandidate {
  product_id: string;
  name: string;
  category: string;
  colors: string[];
  style_tags: string[];
  price_yen: number;
  body_template_tags: string[];
  seasonal_rank: number;
}

export interface StylistContext {
  requestedTypes: string[];
  matchedBodyTemplateId: string;
  currentStyle: string[];
  currentColors: string[];
  preferredStyles: string[];
  preferredColors: string[];
  occasion?: string;
  budgetYen?: number;
  // Live "what's trending now" signal from a real Google web search. These are
  // preferences to bias toward WHERE STOCK ALLOWS — never a hard filter, and
  // never a specific external item (only tags matched against real inventory).
  trendingCategories?: string[];
  trendingStyles?: string[];
  trendingColors?: string[];
}

export interface StylistSet {
  rec_type: string;
  product_ids: string[];
  reason: string;
}

function apiKey() {
  return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
}

const TRANSIENT = /(\b503\b|\b429\b|UNAVAILABLE|high demand|overloaded|RESOURCE_EXHAUSTED)/i;

/** Retry generateContent through transient upstream spikes (503/429) before giving up. */
async function generateWithRetry(
  ai: GoogleGenAI,
  request: Parameters<GoogleGenAI["models"]["generateContent"]>[0],
  attempts = 3
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await ai.models.generateContent(request);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!TRANSIENT.test(message) || attempt === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
    }
  }
  throw lastError;
}

const TYPE_MEANING: Record<string, string> = {
  similar: "echo the customer's current outfit style",
  style: "the store's editorial styling direction, a step up from their usual",
  seasonal: "seasonal / on-trend, prioritising high seasonal_rank items",
  explicit_need: "the customer's explicitly stated need"
};

function buildPrompt(candidates: StylistCandidate[], ctx: StylistContext) {
  const n = ctx.requestedTypes.length;
  const types = ctx.requestedTypes
    .map((t) => `- ${t}: ${TYPE_MEANING[t] ?? t}`)
    .join("\n");
  return [
    "You are a senior fashion stylist at a single clothing store.",
    `Compose exactly ${n} complete, coordinated outfits for one customer — one per requested type below — choosing ONLY from the in-stock products listed (by product_id).`,
    "",
    "Customer:",
    `- Body template: ${ctx.matchedBodyTemplateId}. Prefer items whose body_template_tags include it (better fit).`,
    `- Current outfit style: ${ctx.currentStyle.join(", ") || "unknown"}; current colours: ${ctx.currentColors.join(", ") || "unknown"}.`,
    `- Occasion: ${ctx.occasion ?? "unspecified"}. Prefers styles: ${ctx.preferredStyles.join(", ") || "none"}; colours: ${ctx.preferredColors.join(", ") || "none"}.`,
    ctx.budgetYen ? `- Budget: keep each outfit's total at or under ¥${ctx.budgetYen}.` : "- Budget: no hard limit.",
    trendLine(ctx),
    "",
    "Each outfit is ONE coherent look: a top and a bottom (or a single dress/one_piece instead of top+bottom), shoes, and outerwear only if it suits. Coordinate colour harmony and style consistency ACROSS the pieces, fit the body template, and suit the occasion.",
    "",
    "Requested types (produce one outfit each, in this order):",
    types,
    "",
    "Rules: use only product_id values from the list; never repeat a product_id within one outfit; 2–4 items per outfit; give a one-sentence reason that names the coordination logic (why these pieces work together). Return only JSON.",
    "",
    "In-stock products:",
    JSON.stringify(
      candidates.map((c) => ({
        product_id: c.product_id,
        name: c.name,
        category: c.category,
        colors: c.colors,
        style_tags: c.style_tags,
        price_yen: c.price_yen,
        body_template_tags: c.body_template_tags,
        seasonal_rank: c.seasonal_rank
      }))
    )
  ].join("\n");
}

function trendLine(ctx: StylistContext): string {
  const parts: string[] = [];
  if (ctx.trendingCategories?.length) parts.push(`categories ${ctx.trendingCategories.join(", ")}`);
  if (ctx.trendingStyles?.length) parts.push(`styles ${ctx.trendingStyles.join(", ")}`);
  if (ctx.trendingColors?.length) parts.push(`colours ${ctx.trendingColors.join(", ")}`);
  if (parts.length === 0) return "";
  return (
    `- Trending right now (from a live Google web search): ${parts.join("; ")}. ` +
    "Lean toward these where a matching in-stock item suits the customer — but never sacrifice fit, occasion, coherence or budget, and only ever pick from the in-stock list."
  );
}

function schema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["sets"],
    properties: {
      sets: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["rec_type", "product_ids", "reason"],
          properties: {
            rec_type: { type: "string" },
            product_ids: { type: "array", items: { type: "string" } },
            reason: { type: "string" }
          }
        }
      }
    }
  };
}

function validate(rawSets: unknown, validIds: Set<string>): StylistSet[] {
  if (!Array.isArray(rawSets)) return [];
  const out: StylistSet[] = [];
  for (const raw of rawSets) {
    const s = raw as { rec_type?: unknown; product_ids?: unknown; reason?: unknown };
    const ids = Array.isArray(s.product_ids)
      ? Array.from(
          new Set(
            s.product_ids.filter((id): id is string => typeof id === "string" && validIds.has(id))
          )
        )
      : [];
    if (ids.length < 2) continue;
    out.push({
      rec_type: typeof s.rec_type === "string" ? s.rec_type : "style",
      product_ids: ids,
      reason: typeof s.reason === "string" ? s.reason : ""
    });
  }
  return out;
}

// Hard cap on how long we wait for the LLM stylist before falling back to the
// deterministic (coordinated) scorer, so "styling three looks" is never slow.
const STYLIST_TIMEOUT_MS = Number(process.env.STYLIST_TIMEOUT_MS ?? 6000);
// Cap how many candidates go into the prompt — a 200-item list makes the call
// slow; the top slice keeps it fast without losing much choice.
const STYLIST_MAX_CANDIDATES = Number(process.env.STYLIST_MAX_CANDIDATES ?? 60);

/**
 * Ask Gemini to compose outfits from the real candidate list. Returns one
 * validated StylistSet per requested type, or null to signal fallback (no key,
 * failure, invalid output, or exceeding the latency budget).
 */
export async function composeOutfitSets(
  candidates: StylistCandidate[],
  ctx: StylistContext
): Promise<StylistSet[] | null> {
  if (!apiKey() || candidates.length === 0) return null;
  const trimmed = candidates.slice(0, STYLIST_MAX_CANDIDATES);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      logAgentTurn({ event: "stylist_timeout", latency_ms: STYLIST_TIMEOUT_MS }, "WARNING");
      resolve(null);
    }, STYLIST_TIMEOUT_MS);
  });
  try {
    return await Promise.race([composeInner(trimmed, ctx), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function composeInner(
  candidates: StylistCandidate[],
  ctx: StylistContext
): Promise<StylistSet[] | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: apiKey() });
    const response = await generateWithRetry(ai, {
      // Must fit STYLIST_TIMEOUT_MS — see reasoning.ts for why 3.5-flash can't.
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
      contents: buildPrompt(candidates, ctx),
      config: {
        temperature: 0.4,
        responseMimeType: "application/json",
        responseJsonSchema: schema()
      }
    });
    const text = response.text;
    if (!text) return null;
    const parsed = JSON.parse(text) as { sets?: unknown };
    const validIds = new Set(candidates.map((c) => c.product_id));
    const sets = validate(parsed.sets, validIds);
    // Require one coherent set per requested type for consistent presentation.
    if (sets.length < ctx.requestedTypes.length) return null;
    return sets.slice(0, ctx.requestedTypes.length);
  } catch (error) {
    logAgentTurn(
      {
        event: "stylist_fallback",
        errors: [error instanceof Error ? error.message : "unknown"]
      },
      "WARNING"
    );
    return null;
  }
}
