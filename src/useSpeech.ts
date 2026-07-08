import { useCallback, useEffect, useRef, useState } from "react";

// Fast, on-device text-to-speech via the browser SpeechSynthesis API — no
// network round-trip, so time-to-first-word is typically <100ms (the cloud-TTS
// path that felt slow before is avoided entirely). Speed tricks:
//   1. cancel() any backlog before speaking, so the new line starts immediately;
//   2. split into sentences and queue them, so the FIRST sentence plays while
//      the engine is still parsing the rest;
//   3. prewarm the pipeline on the first user gesture;
//   4. callers pass short curated lines, not whole paragraphs.

function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  const base = lang.slice(0, 2).toLowerCase();
  const byLang = voices.filter((v) => v.lang.slice(0, 2).toLowerCase() === base);
  const pool = byLang.length > 0 ? byLang : voices;
  // Prefer higher-quality local/neural voices when the OS ships them.
  const nice = pool.find((v) =>
    /(enhanced|premium|natural|neural|siri|ava|samantha|google|zira|allison)/i.test(v.name)
  );
  return nice ?? pool.find((v) => v.default) ?? pool[0] ?? null;
}

function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?。！？\n]+[.!?。！？]*/g);
  return (parts ?? [text]).map((s) => s.trim()).filter(Boolean);
}

export function useSpeech(lang = "en-US") {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [enabled, setEnabled] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const warmedRef = useRef(false);

  useEffect(() => {
    if (!supported) return;
    const load = () => {
      voiceRef.current = pickVoice(window.speechSynthesis.getVoices(), lang);
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, [supported, lang]);

  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported]);

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !enabled || !text.trim()) return;
      const synth = window.speechSynthesis;
      synth.cancel(); // drop backlog → minimal time-to-first-word
      const chunks = splitSentences(text);
      chunks.forEach((chunk, index) => {
        const utterance = new SpeechSynthesisUtterance(chunk);
        if (voiceRef.current) utterance.voice = voiceRef.current;
        utterance.lang = voiceRef.current?.lang ?? lang;
        utterance.rate = 1.06; // a touch brisk without sounding rushed
        utterance.pitch = 1;
        if (index === 0) utterance.onstart = () => setSpeaking(true);
        if (index === chunks.length - 1) {
          utterance.onend = () => setSpeaking(false);
          utterance.onerror = () => setSpeaking(false);
        }
        synth.speak(utterance);
      });
    },
    [supported, enabled, lang]
  );

  // Warm the engine on the first user gesture so the first real line is instant.
  const warm = useCallback(() => {
    if (!supported || warmedRef.current) return;
    warmedRef.current = true;
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  }, [supported]);

  const toggle = useCallback(() => {
    setEnabled((on) => {
      if (on && supported) window.speechSynthesis.cancel();
      return !on;
    });
  }, [supported]);

  return { speak, cancel, warm, toggle, speaking, enabled, supported };
}
