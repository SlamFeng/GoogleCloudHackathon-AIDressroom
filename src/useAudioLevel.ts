import { useEffect, useRef, useState } from "react";

// Live microphone amplitude (0..1) for the voice aura. While `active`, opens a
// short-lived audio capture, runs an AnalyserNode, and reports a smoothed RMS
// level per frame. Releases the mic the moment it's inactive. Runs alongside the
// browser SpeechRecognition (which uses its own capture) — this is analysis-only.
// Returns 0 and stays quiet if mic access is unavailable.
export function useAudioLevel(active: boolean): number {
  const [level, setLevel] = useState(0);
  const levelRef = useRef(0);

  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setLevel(0);
      return;
    }

    let cancelled = false;
    let raf = 0;
    let ctx: AudioContext | null = null;
    let stream: MediaStream | null = null;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const AudioCtx =
          window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctx = new AudioCtx();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.6;
        source.connect(analyser);
        const data = new Uint8Array(analyser.fftSize);

        const tick = () => {
          if (cancelled) return;
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i += 1) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length); // ~0..0.5 for speech
          // Map to a lively 0..1 and smooth so it eases rather than jitters.
          const target = Math.min(1, rms * 3.2);
          const next = levelRef.current * 0.75 + target * 0.25;
          levelRef.current = next;
          setLevel(next);
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        /* no mic access → aura just breathes without amplitude */
      }
    }

    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close().catch(() => {});
      levelRef.current = 0;
      setLevel(0);
    };
  }, [active]);

  return level;
}
