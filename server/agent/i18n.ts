// Tiny per-session localization helper for the agent's customer-facing lines
// (spoken via TTS on the mirror). NOT a full i18n framework — the agent has a
// handful of generated sentences; each caller supplies all three variants.

import type { AgentLanguage } from "./contracts.js";

/** Pick the variant for the session language; undefined/unknown falls back to zh. */
export function pick(lang: AgentLanguage | undefined, text: { zh: string; en: string; ja: string }): string {
  return text[lang ?? "zh"] ?? text.zh;
}

/** English name of the language, for LLM output-language directives in prompts. */
export function languageName(lang: AgentLanguage | undefined): string {
  if (lang === "en") return "English";
  if (lang === "ja") return "Japanese";
  return "Chinese";
}

/**
 * Guess the language a customer utterance is written in, by script alone (no
 * LLM, no latency): kana is uniquely Japanese; han without kana reads as
 * Chinese (kanji-only Japanese is rare in speech transcripts); otherwise a
 * few Latin letters read as English. Null when there's too little signal
 * (digits, emoji, a lone "OK") — callers should keep the current language.
 */
export function detectLanguage(text: string): AgentLanguage | null {
  if (/[぀-ヿ]/.test(text)) return "ja";
  if (/[一-鿿]/.test(text)) return "zh";
  const latin = text.match(/[a-zA-Z]/g)?.length ?? 0;
  return latin >= 4 ? "en" : null;
}
