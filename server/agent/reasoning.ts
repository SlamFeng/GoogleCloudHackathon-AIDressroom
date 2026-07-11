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

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.toLowerCase());
}
