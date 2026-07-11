import { useCallback, useEffect, useRef, useState } from "react";

// Voice input via the browser SpeechRecognition API (webkit-prefixed in
// Chromium). On-device/near-instant start, no server. Used to dictate the
// styling need; gesture-preset chips remain as the always-available fallback.

// Minimal typings — the Web Speech API isn't in TS's default DOM lib.
interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
  isFinal: boolean;
  length: number;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition(options: {
  lang?: string;
  continuous?: boolean;
  onFinal?: (transcript: string) => void;
}) {
  const { lang = "en-US", continuous = false, onFinal } = options;
  const supported = getCtor() !== null;
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(onFinal);
  // Finalized text accumulates across result events: in continuous mode a pause
  // finalizes a segment, and the next event's resultIndex skips past it — the
  // old per-event locals silently dropped every earlier finalized clause.
  const finalRef = useRef("");
  const transcriptRef = useRef("");
  const flushResolveRef = useRef<((transcript: string) => void) | null>(null);
  onFinalRef.current = onFinal;

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  /**
   * Stop and resolve with the FINAL transcript. The recognizer often finalizes
   * the last words asynchronously after stop() returns (one more onresult before
   * onend), so reading `transcript` synchronously loses the tail — this waits
   * for onend (with a fallback timeout) before resolving.
   */
  const stopAndFlush = useCallback((): Promise<string> => {
    const recognition = recognitionRef.current;
    setListening(false);
    if (!recognition) return Promise.resolve(transcriptRef.current.trim());
    return new Promise((resolve) => {
      const settle = (value: string) => {
        if (flushResolveRef.current !== null) {
          flushResolveRef.current = null;
          resolve(value);
        }
      };
      flushResolveRef.current = settle;
      window.setTimeout(() => settle(transcriptRef.current.trim()), 1200);
      try {
        recognition.stop();
      } catch {
        settle(transcriptRef.current.trim());
      }
    });
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    recognitionRef.current?.abort();

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = continuous; // keep listening until explicitly stopped
    recognition.interimResults = true; // live transcript as they speak
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = "";
      let newFinal = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) newFinal += text;
        else interim += text;
      }
      finalRef.current += newFinal;
      const combined = finalRef.current + interim;
      transcriptRef.current = combined;
      setTranscript(combined);
      if (newFinal.trim()) onFinalRef.current?.(finalRef.current.trim());
    };
    recognition.onerror = () => {
      setListening(false);
      flushResolveRef.current?.(transcriptRef.current.trim());
    };
    recognition.onend = () => {
      setListening(false);
      flushResolveRef.current?.(transcriptRef.current.trim());
    };

    recognitionRef.current = recognition;
    finalRef.current = "";
    transcriptRef.current = "";
    setTranscript("");
    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [lang, continuous]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { start, stop, stopAndFlush, toggle, listening, transcript, supported };
}
