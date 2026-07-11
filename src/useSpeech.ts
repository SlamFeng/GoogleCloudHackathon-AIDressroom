import { useCallback, useEffect, useRef, useState } from "react";
import { synthesizeSpeech } from "./api";

// Agent voice. Prefers Gemini TTS (natural, good Chinese) but never waits on it:
//   - fixed lines are PREFETCHED on mount and cached, so playback is instant;
//   - if a line isn't cached yet, we speak it immediately with the on-device
//     browser voice and fetch the Gemini audio in the background for next time.
// So the voice upgrades to Gemini once cached, and is never slow.

function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  const base = lang.slice(0, 2).toLowerCase();
  const byLang = voices.filter((v) => v.lang.slice(0, 2).toLowerCase() === base);
  const pool = byLang.length > 0 ? byLang : voices;
  const nice = pool.find((v) =>
    /(enhanced|premium|natural|neural|siri|ting-?ting|mei-?jia|google|yue|hui)/i.test(v.name)
  );
  return nice ?? pool.find((v) => v.default) ?? pool[0] ?? null;
}

function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?。！？\n]+[.!?。！？]*/g);
  return (parts ?? [text]).map((s) => s.trim()).filter(Boolean);
}

export function useSpeech(lang = "zh-CN") {
  const browserTts = typeof window !== "undefined" && "speechSynthesis" in window;
  const [enabled, setEnabled] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const audioCache = useRef<Map<string, string>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const warmedRef = useRef(false);
  const pendingRef = useRef<number | null>(null);

  useEffect(() => {
    if (!browserTts) return;
    const load = () => {
      voiceRef.current = pickVoice(window.speechSynthesis.getVoices(), lang);
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, [browserTts, lang]);

  useEffect(() => {
    return () => {
      if (pendingRef.current !== null) window.clearInterval(pendingRef.current);
      if (browserTts) window.speechSynthesis.cancel();
      audioRef.current?.pause();
    };
  }, [browserTts]);

  const speakBrowser = useCallback(
    (text: string) => {
      if (!browserTts) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const chunks = splitSentences(text);
      chunks.forEach((chunk, index) => {
        const utterance = new SpeechSynthesisUtterance(chunk);
        if (voiceRef.current) utterance.voice = voiceRef.current;
        utterance.lang = voiceRef.current?.lang ?? lang;
        utterance.rate = 1.05;
        if (index === 0) utterance.onstart = () => setSpeaking(true);
        if (index === chunks.length - 1) {
          utterance.onend = () => setSpeaking(false);
          utterance.onerror = () => setSpeaking(false);
        }
        synth.speak(utterance);
      });
    },
    [browserTts, lang]
  );

  const playAudio = useCallback((dataUrl: string) => {
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio();
      audioRef.current = audio;
    }
    if (browserTts) window.speechSynthesis.cancel();
    audio.pause();
    audio.src = dataUrl;
    audio.onplay = () => setSpeaking(true);
    audio.onended = () => setSpeaking(false);
    audio.onerror = () => setSpeaking(false);
    return audio.play();
  }, [browserTts]);

  const speak = useCallback(
    (text: string) => {
      if (!enabled || !text.trim()) return;
      const cached = audioCache.current.get(text);
      if (cached) {
        void playAudio(cached).catch(() => speakBrowser(text));
        return;
      }
      // Not cached yet → speak instantly with the browser voice, and fetch the
      // Gemini audio in the background so it's ready (and nicer) next time.
      speakBrowser(text);
      void synthesizeSpeech(text).then((url) => {
        if (url) audioCache.current.set(text, url);
      });
    },
    [enabled, playAudio, speakBrowser]
  );

  // Speak WITHOUT cutting off whatever is currently playing (speak() cancels the
  // current utterance). Polls the live synth/audio state — not React state — and
  // speaks once idle; force-speaks after 8s so the line can never be lost.
  const speakSoon = useCallback(
    (text: string) => {
      const busy = () =>
        (browserTts && window.speechSynthesis.speaking) ||
        Boolean(audioRef.current && !audioRef.current.paused && !audioRef.current.ended);
      if (pendingRef.current !== null) window.clearInterval(pendingRef.current);
      if (!busy()) {
        speak(text);
        return;
      }
      const startedAt = Date.now();
      pendingRef.current = window.setInterval(() => {
        if (!busy() || Date.now() - startedAt > 8000) {
          if (pendingRef.current !== null) window.clearInterval(pendingRef.current);
          pendingRef.current = null;
          speak(text);
        }
      }, 150);
    },
    [browserTts, speak]
  );

  // Prefetch a fixed set of lines so their Gemini audio is cached before use.
  const prefetch = useCallback((lines: string[]) => {
    void (async () => {
      for (const line of lines) {
        if (!line.trim() || audioCache.current.has(line)) continue;
        const url = await synthesizeSpeech(line);
        if (url) audioCache.current.set(line, url);
      }
    })();
  }, []);

  const cancel = useCallback(() => {
    if (pendingRef.current !== null) {
      window.clearInterval(pendingRef.current);
      pendingRef.current = null;
    }
    if (browserTts) window.speechSynthesis.cancel();
    audioRef.current?.pause();
    setSpeaking(false);
  }, [browserTts]);

  // Unlock audio playback + warm the browser voice on the first user gesture.
  const warm = useCallback(() => {
    if (warmedRef.current) return;
    warmedRef.current = true;
    if (browserTts) {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.muted = true;
    audioRef.current
      .play()
      .then(() => {
        audioRef.current?.pause();
        if (audioRef.current) audioRef.current.muted = false;
      })
      .catch(() => {
        if (audioRef.current) audioRef.current.muted = false;
      });
  }, [browserTts]);

  const toggle = useCallback(() => {
    setEnabled((on) => {
      if (on) cancel();
      return !on;
    });
  }, [cancel]);

  return { speak, speakSoon, prefetch, cancel, warm, toggle, speaking, enabled, supported: browserTts };
}
