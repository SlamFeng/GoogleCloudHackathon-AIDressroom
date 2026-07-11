// Natural-language reasoning for the Agent. When a Gemini key is configured the
// Agent uses the model to classify intent and extract structured need over free
// customer text; otherwise it falls back to the deterministic heuristics in
// parsers.ts. The fallback keeps tests, CI, and offline demos reproducible.

import { GoogleGenAI } from "@google/genai";
import type { ParsedNeed, Route } from "./contracts.js";
import { parseNeed, routeIntent } from "./parsers.js";
import { logAgentTurn } from "./logger.js";

function apiKey() {
  return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
}

function reasoningModel() {
  // Default must be a model whose real latency fits REASONING_TIMEOUT_MS —
  // gemini-3.5-flash (~30s cold) always lost the race and silently degraded
  // every turn to the heuristic parsers.
  return process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
}

// Cap each reasoning call so a slow Gemini can't stall the turn — on timeout we
// throw and the caller falls back to the instant heuristic parser.
const REASONING_TIMEOUT_MS = Number(process.env.REASONING_TIMEOUT_MS ?? 3500);

async function generateJson(prompt: string, schema: Record<string, unknown>) {
  const key = apiKey();
  if (!key) return null;
  const ai = new GoogleGenAI({ apiKey: key });
  const call = ai.models.generateContent({
    model: reasoningModel(),
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseJsonSchema: schema
    }
  });
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("reasoning_timeout")), REASONING_TIMEOUT_MS)
  );
  const response = await Promise.race([call, timeout]);
  const text = response.text;
  if (!text) throw new Error("empty reasoning response");
  return JSON.parse(text) as Record<string, unknown>;
}

const ROUTES: Route[] = ["explicit", "recommendation", "unclear"];

export async function classifyIntent(text: string): Promise<Route> {
  if (!apiKey()) return routeIntent(text);
  try {
    const out = await generateJson(
      [
        "You route a clothing-store styling customer's message into one intent.",
        "explicit: the customer names a category, occasion, style, color, or budget.",
        "recommendation: the customer wants the agent to suggest without a clear preference.",
        "unclear: mixed or vague intent that needs one clarifying question.",
        "Return only JSON matching the schema.",
        `Customer message: ${text}`
      ].join("\n"),
      {
        type: "object",
        additionalProperties: false,
        required: ["route"],
        properties: { route: { enum: ROUTES } }
      }
    );
    const route = out?.route as Route | undefined;
    if (route && ROUTES.includes(route)) return route;
    return routeIntent(text);
  } catch (error) {
    logAgentTurn(
      { event: "reasoning_fallback", action: "classify_intent", errors: [error instanceof Error ? error.message : "unknown"] },
      "WARNING"
    );
    return routeIntent(text);
  }
}

export async function extractNeed(text: string): Promise<ParsedNeed> {
  if (!apiKey()) return parseNeed(text);
  try {
    const out = await generateJson(
      [
        "Extract the customer's structured styling need from their message.",
        "categories: garment categories (outerwear, top, bottom, dress, shoes, accessory).",
        "colors, style_tags: lowercase tags.",
        "occasion: e.g. date, work, beach; null if none.",
        "budget_yen: integer JPY budget ceiling, or null.",
        "Do not invent values that are not implied. Return only JSON.",
        `Customer message: ${text}`
      ].join("\n"),
      {
        type: "object",
        additionalProperties: false,
        required: ["categories", "colors", "style_tags", "occasion", "budget_yen"],
        properties: {
          categories: { type: "array", items: { type: "string" } },
          colors: { type: "array", items: { type: "string" } },
          style_tags: { type: "array", items: { type: "string" } },
          occasion: { type: ["string", "null"] },
          budget_yen: { type: ["number", "null"] }
        }
      }
    );
    if (!out) return parseNeed(text);
    return {
      raw_text: text,
      categories: asStringArray(out.categories),
      colors: asStringArray(out.colors),
      style_tags: asStringArray(out.style_tags),
      occasion: typeof out.occasion === "string" ? out.occasion : undefined,
      budget_yen: typeof out.budget_yen === "number" ? Math.round(out.budget_yen) : undefined
    };
  } catch (error) {
    logAgentTurn(
      { event: "reasoning_fallback", action: "extract_need", errors: [error instanceof Error ? error.message : "unknown"] },
      "WARNING"
    );
    return parseNeed(text);
  }
}

const SWAP_SLOTS = ["outerwear", "top", "bottom", "dress", "shoes", "accessory"];

/**
 * Which single garment slot does the customer want swapped out ("换掉外套，其余
 *保留")? Uses the model because real speech mixes slots and negation — e.g.
 * "能换一下上衣外套吗我觉得外套颜色不好看" means OUTERWEAR, and "不是上衣换" means
 * NOT the top — which a keyword-nearest-verb heuristic gets wrong. Falls back to
 * that heuristic only when there's no key or the model times out. Returns null
 * when it isn't a single-slot swap at all.
 */
export async function extractSwapSlot(text: string, availableSlots: string[]): Promise<string | null> {
  if (!apiKey()) return heuristicSwapSlot(text);
  try {
    const out = await generateJson(
      [
        "The customer is looking at ONE outfit and wants to replace exactly ONE garment, keeping the rest.",
        "Decide which single slot they want swapped OUT.",
        "Slots: outerwear(外套/大衣/夹克/风衣), top(上衣/上装/衬衫/T恤/毛衣/卫衣), bottom(裤子/下装/短裤/半身裙), dress(连衣裙), shoes(鞋/靴), accessory(包/帽子/配饰/项链).",
        "Handle negation and emphasis: '不是上衣' or '上衣不用换' means it is NOT the top; '外套颜色不好看' means the OUTERWEAR is the problem even if a top is also named.",
        `The look currently includes these slots: ${availableSlots.join(", ") || "unknown"}.`,
        "If the customer is NOT asking to swap a single garment, return null for slot.",
        "Return only JSON.",
        `Customer message: ${text}`
      ].join("\n"),
      {
        type: "object",
        additionalProperties: false,
        required: ["slot"],
        properties: { slot: { type: ["string", "null"] } }
      }
    );
    const slot = out?.slot;
    if (typeof slot === "string" && SWAP_SLOTS.includes(slot)) return slot;
    if (slot === null) return null; // model is confident it isn't a single-slot swap
    return heuristicSwapSlot(text);
  } catch (error) {
    logAgentTurn(
      { event: "reasoning_fallback", action: "extract_swap_slot", errors: [error instanceof Error ? error.message : "unknown"] },
      "WARNING"
    );
    return heuristicSwapSlot(text);
  }
}

const SWAP_SLOT_PATTERNS: Array<{ slot: string; re: RegExp }> = [
  { slot: "outerwear", re: /(外套|大衣|夹克|风衣|羽绒服)/ },
  { slot: "dress", re: /(连衣裙|连身裙|长裙|裙装)/ },
  { slot: "top", re: /(上衣|上装|衬衫|衬衣|t恤|体恤|毛衣|卫衣|针织|上半身|上身)/i },
  { slot: "bottom", re: /(裤子|裤|下装|下半身|下身|短裤|长裤|牛仔裤|半身裙)/ },
  { slot: "shoes", re: /(鞋子|鞋|靴子|靴|高跟|运动鞋)/ },
  { slot: "accessory", re: /(配饰|饰品|包包|包|帽子|帽|项链|围巾|腰带|首饰)/ }
];
// A word that says "replace this" (weak signal) vs a complaint that says "THIS
// one is the problem" (strong signal — points at the slot being complained about).
const REPLACE_RE = /换/g;
const COMPLAINT_RE = /(不好看|不太好看|不是很好看|不咋|不喜欢|难看|丑|不合适|不满意|不行|不太好|一般般|太.{0,2}了)/g;
// Signals that a NAMED slot should be KEPT, not swapped: "不是上衣" / "别换上衣"
// right before it, or "上衣不错 / 上衣挺好 / 上衣不用换" right after it.
const KEEP_BEFORE_RE = /(不是|别换?|不用换)$/;
const KEEP_AFTER_RE = /^(不错|挺好|可以|不用换|不换|保留|喜欢|满意|就行|留着|好看|不错)/;

/**
 * No-key / timeout fallback. Scores each named slot by how strongly the sentence
 * marks it as the one to REPLACE — complaints ("外套颜色不好看") weigh more than a
 * bare "换", and an explicit keep ("不是上衣" / "上衣不错") knocks that slot out.
 * Handles the real speech patterns the plain nearest-verb version got wrong.
 */
function heuristicSwapSlot(text: string): string | null {
  const replaceAt = [...text.matchAll(REPLACE_RE)].map((m) => m.index ?? 0);
  const complaintAt = [...text.matchAll(COMPLAINT_RE)].map((m) => m.index ?? 0);
  if (replaceAt.length === 0 && complaintAt.length === 0) return null;

  const score = new Map<string, number>();
  for (const { slot, re } of SWAP_SLOT_PATTERNS) {
    const global = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
    let match: RegExpExecArray | null;
    let seen = false;
    let slotScore = 0;
    while ((match = global.exec(text)) !== null) {
      seen = true;
      const start = match.index;
      const end = start + match[0].length;
      if (KEEP_BEFORE_RE.test(text.slice(Math.max(0, start - 3), start))) slotScore -= 100;
      if (KEEP_AFTER_RE.test(text.slice(end, end + 5))) slotScore -= 100;
      for (const c of complaintAt) slotScore += Math.max(0, 20 - Math.abs(c - start));
      for (const r of replaceAt) slotScore += Math.max(0, 8 - Math.abs(r - start));
    }
    if (seen) score.set(slot, slotScore);
  }

  let best: string | null = null;
  let bestScore = 0; // must be positively implicated
  for (const [slot, s] of score) {
    if (s > bestScore) {
      bestScore = s;
      best = slot;
    }
  }
  return best;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.toLowerCase());
}
