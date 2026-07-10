// Live fashion-trend signal, grounded on Google Search (not the model's own
// training knowledge). Two steps, because Gemini's googleSearch tool can't be
// combined with JSON-mode structured output:
//   1. grounded search → free-text current trends + citations
//   2. a second call maps that text to our controlled style/colour enums
// Results are cached per (day, region, season, gender, age, occasion) so the
// slow (~10-20s) grounded call runs at most once per bucket per day.

import { GoogleGenAI } from "@google/genai";
import { logAgentTurn } from "./logger.js";
import { productCategorySchema, standardColorSchema, styleTagSchema } from "../inventory/types.js";

const STYLE_TAGS = styleTagSchema.options as readonly string[];
const COLORS = standardColorSchema.options as readonly string[];
const CATEGORIES = productCategorySchema.options as readonly string[];

export interface TrendContext {
  occasion?: string;
  gender?: string;
  ageRange?: string;
  region: string;
  season: string;
}

export interface TrendResult {
  trend_categories: string[];
  trend_styles: string[];
  trend_colors: string[];
  keywords: string[];
  summary: string;
  source_count: number;
  fetched_at: string;
  cached: boolean;
}

function apiKey() {
  return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
}
function model() {
  return process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
}

const TTL_MS = (Number(process.env.TRENDS_TTL_HOURS) || 24) * 3600_000;
const TIMEOUT_MS = Number(process.env.TRENDS_TIMEOUT_MS) || 40_000;

export function currentSeason(month: number): string {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

const cache = new Map<string, { at: number; result: TrendResult }>();
const inflight = new Set<string>();

function dayStamp(now: Date): string {
  return now.toISOString().slice(0, 10);
}
function cacheKey(ctx: TrendContext, day: string): string {
  return [day, ctx.region, ctx.season, ctx.gender ?? "any", ctx.ageRange ?? "any", ctx.occasion ?? "general"].join("|");
}

/**
 * Cache-only read — NEVER triggers a live search, so it is safe on the hot
 * recommendation path and always returns instantly. Returns null on a miss.
 */
export function readTrends(ctx: TrendContext, now: Date): TrendResult | null {
  if (!apiKey()) return null;
  const hit = cache.get(cacheKey(ctx, dayStamp(now)));
  if (hit && now.getTime() - hit.at < TTL_MS) return { ...hit.result, cached: true };
  return null;
}

/**
 * Background warm — runs the slow (~15-30s) grounded Google search and fills the
 * cache. Fire-and-forget from session start / after a turn; the recommendation
 * path reads the result from cache next time. Deduplicates concurrent warms per
 * bucket so we never fire the same search twice.
 */
export async function warmTrends(ctx: TrendContext, now: Date): Promise<TrendResult | null> {
  if (!apiKey()) return null;
  const key = cacheKey(ctx, dayStamp(now));
  const hit = cache.get(key);
  if (hit && now.getTime() - hit.at < TTL_MS) return hit.result;
  if (inflight.has(key)) return null;
  inflight.add(key);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      logAgentTurn({ event: "trends_timeout", latency_ms: TIMEOUT_MS }, "WARNING");
      resolve(null);
    }, TIMEOUT_MS);
  });
  try {
    const result = await Promise.race([fetchTrends(ctx, now), timeout]);
    if (result) cache.set(key, { at: now.getTime(), result });
    return result;
  } catch (error) {
    logAgentTurn(
      { event: "trends_fallback", errors: [error instanceof Error ? error.message : "unknown"] },
      "WARNING"
    );
    return null;
  } finally {
    if (timer) clearTimeout(timer);
    inflight.delete(key);
  }
}

async function fetchTrends(ctx: TrendContext, now: Date): Promise<TrendResult | null> {
  const ai = new GoogleGenAI({ apiKey: apiKey() });
  const year = now.getFullYear();
  const who = [ctx.ageRange ? `${ctx.ageRange}歳` : null, genderJa(ctx.gender)].filter(Boolean).join("・") || "一般";
  const occasion = ctx.occasion ? `「${ctx.occasion}」向けの` : "";

  // Step 1 — grounded Google Search for current trends.
  const grounded = await ai.models.generateContent({
    model: model(),
    contents:
      `${year}年${seasonJa(ctx.season)}、${ctx.region}で今トレンドの${occasion}${who}のファッション（コーディネートの系統・色・キーアイテム）を、` +
      `最新の情報にもとづいて具体的に5つ挙げてください。`,
    config: { tools: [{ googleSearch: {} }] }
  });
  const trendText = grounded.text ?? "";
  const sourceCount = grounded.candidates?.[0]?.groundingMetadata?.groundingChunks?.length ?? 0;
  if (!trendText) return null;

  // Step 2 — map the grounded text onto our controlled tags (no grounding here).
  const structured = await ai.models.generateContent({
    model: model(),
    contents:
      "Map these current fashion trends onto our controlled tags. Keep only tags that clearly fit.\n" +
      "trend_categories: which garment categories are most on-trend / recommended for this context (e.g. a beach scene may favour dress / one_piece).\n" +
      "trend_styles, trend_colors: the trending style and colour tags.\n\n" +
      `Trends:\n${trendText}`,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        additionalProperties: false,
        required: ["trend_categories", "trend_styles", "trend_colors", "keywords", "summary"],
        properties: {
          trend_categories: { type: "array", items: { enum: [...CATEGORIES] } },
          trend_styles: { type: "array", items: { enum: [...STYLE_TAGS] } },
          trend_colors: { type: "array", items: { enum: [...COLORS] } },
          keywords: { type: "array", items: { type: "string" } },
          summary: { type: "string" }
        }
      }
    }
  });
  const raw = structured.text;
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Partial<TrendResult>;
  return {
    trend_categories: uniqueIn(parsed.trend_categories, CATEGORIES),
    trend_styles: uniqueIn(parsed.trend_styles, STYLE_TAGS),
    trend_colors: uniqueIn(parsed.trend_colors, COLORS),
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords.filter((k) => typeof k === "string").slice(0, 8) : [],
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    source_count: sourceCount,
    fetched_at: now.toISOString(),
    cached: false
  };
}

function uniqueIn(values: unknown, allowed: readonly string[]): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.filter((v): v is string => typeof v === "string" && allowed.includes(v))));
}

function genderJa(gender?: string): string | null {
  if (gender === "female") return "レディース";
  if (gender === "male") return "メンズ";
  return null;
}
function seasonJa(season: string): string {
  return { spring: "春", summer: "夏", autumn: "秋", winter: "冬" }[season] ?? season;
}
