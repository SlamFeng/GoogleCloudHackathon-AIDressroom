import { useEffect, useRef, useState, type RefObject } from "react";
import { loadFaceLandmarker, readBlendshapes, smileScore } from "./expression";

// Reads the customer's expression from the shared mirror video and reports
// sustained satisfaction. Same on-device, per-frame pattern as useGestureControl
// — one video element, one requestAnimationFrame loop.
//
// Feature 1 only surfaces "satisfied" (smile/happy). "Unsatisfied" is left for a
// later step; the smoothed score is exposed so that policy can build on it.

export type Expression = "satisfied" | "neutral";

interface Options {
  videoRef: RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  /** Fired once when satisfaction is first detected, then gated by cooldownMs. */
  onSatisfied: () => void;
  /** Smile activation (0..1) required to read as satisfied. */
  enterThreshold?: number;
  /** How long the smile must hold before firing. */
  dwellMs?: number;
  /** Minimum gap between two "satisfied" triggers. */
  cooldownMs?: number;
}

export function useExpression({
  videoRef,
  enabled,
  onSatisfied,
  enterThreshold = 0.5,
  dwellMs = 600,
  cooldownMs = 8000
}: Options) {
  const [facePresent, setFacePresent] = useState(false);
  const [expression, setExpression] = useState<Expression>("neutral");

  const onSatisfiedRef = useRef(onSatisfied);
  onSatisfiedRef.current = onSatisfied;

  useEffect(() => {
    if (!enabled) {
      setFacePresent(false);
      setExpression("neutral");
      return;
    }

    let cancelled = false;
    let raf = 0;
    let landmarker: Awaited<ReturnType<typeof loadFaceLandmarker>> | null = null;
    let lastVideoTime = -1;
    let ema = 0; // smoothed smile score
    let smilingSince = 0;
    let cooldownUntil = 0;
    let faceShown = false;

    function loop() {
      if (cancelled) return;
      raf = requestAnimationFrame(loop);

      const video = videoRef.current;
      if (!landmarker || !video || video.readyState < 2) return;
      if (video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;

      const now = performance.now();
      let result;
      try {
        result = landmarker.detectForVideo(video, now);
      } catch {
        return;
      }

      const scores = readBlendshapes(result);
      if (!scores) {
        if (faceShown) {
          faceShown = false;
          setFacePresent(false);
        }
        ema = 0;
        smilingSince = 0;
        setExpression("neutral");
        return;
      }
      if (!faceShown) {
        faceShown = true;
        setFacePresent(true);
      }

      // Exponential smoothing so a single noisy frame can't trigger speech.
      ema = ema * 0.7 + smileScore(scores) * 0.3;

      if (ema >= enterThreshold) {
        smilingSince ||= now;
        if (now - smilingSince >= dwellMs) {
          setExpression("satisfied");
          if (now > cooldownUntil) {
            cooldownUntil = now + cooldownMs;
            onSatisfiedRef.current();
          }
        }
      } else {
        smilingSince = 0;
        setExpression("neutral");
      }
    }

    loadFaceLandmarker()
      .then((l) => {
        if (cancelled) return;
        landmarker = l;
        loop();
      })
      .catch(() => {
        /* expression stays off if the model can't load */
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [enabled, enterThreshold, dwellMs, cooldownMs, videoRef]);

  return { facePresent, expression };
}
