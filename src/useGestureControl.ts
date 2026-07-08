import { useEffect, useRef, useState, type RefObject } from "react";
import { loadGestureRecognizer } from "./gesture";

// Hands-free control. Finger count 1/2/3 arms the matching look (held steady for
// `dwellMs`); the built-in gesture labels drive the rest — consistently, one
// gesture = one meaning everywhere:
//   ✋ Open_Palm  → "talk"    (start / stop voice)
//   👍 Thumb_Up   → "confirm" (try on / choose / reserve)
//   ✊ Closed_Fist → "back"    (leave try-on / cancel)
// Finger count is derived from the landmarks directly (the categories don't
// reliably tell 1/2/3 apart).

export type GestureAction = "confirm" | "back" | "talk";

interface Options {
  videoRef: RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  choiceCount: number;
  dwellMs?: number;
  onSelect: (index: number) => void;
  onGesture: (action: GestureAction) => void;
}

interface Landmark {
  x: number;
  y: number;
}

// Count extended fingers among index/middle/ring/pinky (thumb ignored): a
// fingertip sitting above its PIP joint (smaller y) reads as extended. Assumes
// an upright hand, which is how people naturally raise it at a mirror.
function countFingers(hand: Landmark[]): number {
  const pairs: Array<[number, number]> = [
    [8, 6],
    [12, 10],
    [16, 14],
    [20, 18]
  ];
  let count = 0;
  for (const [tip, pip] of pairs) {
    if (hand[tip].y < hand[pip].y - 0.02) count += 1;
  }
  return count;
}

export function useGestureControl({
  videoRef,
  enabled,
  choiceCount,
  dwellMs = 700,
  onSelect,
  onGesture
}: Options) {
  const [handPresent, setHandPresent] = useState(false);
  const [armedChoice, setArmedChoice] = useState<number | null>(null);

  const onSelectRef = useRef(onSelect);
  const onGestureRef = useRef(onGesture);
  const choiceCountRef = useRef(choiceCount);
  onSelectRef.current = onSelect;
  onGestureRef.current = onGesture;
  choiceCountRef.current = choiceCount;

  useEffect(() => {
    if (!enabled) {
      setHandPresent(false);
      setArmedChoice(null);
      return;
    }

    let cancelled = false;
    let raf = 0;
    let recognizer: Awaited<ReturnType<typeof loadGestureRecognizer>> | null = null;
    let lastVideoTime = -1;
    let handShown = false;
    let armedCount = 0; // 0 = nothing armed; else 1..choiceCount
    let armedStart = 0;
    let firedFor = 0;
    let cooldownUntil = 0;

    function clearArm() {
      if (armedCount !== 0) {
        armedCount = 0;
        setArmedChoice(null);
      }
      firedFor = 0;
    }

    function loop() {
      if (cancelled) return;
      raf = requestAnimationFrame(loop);

      const video = videoRef.current;
      if (!recognizer || !video || video.readyState < 2) return;
      if (video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;

      const now = performance.now();
      let result;
      try {
        result = recognizer.recognizeForVideo(video, now);
      } catch {
        return;
      }

      const hand = result.landmarks?.[0] as Landmark[] | undefined;
      if (!hand) {
        if (handShown) {
          handShown = false;
          setHandPresent(false);
        }
        clearArm();
        return;
      }
      if (!handShown) {
        handShown = true;
        setHandPresent(true);
      }

      // ✋ / 👍 / ✊ take priority and reset any arming.
      const label = result.gestures?.[0]?.[0]?.categoryName ?? "None";
      const action: GestureAction | null =
        label === "Thumb_Up"
          ? "confirm"
          : label === "Open_Palm"
            ? "talk"
            : label === "Closed_Fist"
              ? "back"
              : null;
      if (action && now > cooldownUntil) {
        cooldownUntil = now + 1500;
        clearArm();
        onGestureRef.current(action);
        return;
      }

      // Selection by finger count, held steady for dwellMs.
      const count = countFingers(hand);
      if (count >= 1 && count <= choiceCountRef.current) {
        if (count !== armedCount) {
          armedCount = count;
          armedStart = now;
          firedFor = 0;
          setArmedChoice(count - 1);
        } else if (now - armedStart >= dwellMs && now > cooldownUntil && firedFor !== count) {
          firedFor = count;
          cooldownUntil = now + 1500;
          onSelectRef.current(count - 1);
        }
      } else {
        clearArm();
      }
    }

    loadGestureRecognizer()
      .then((r) => {
        if (cancelled) return;
        recognizer = r;
        loop();
      })
      .catch(() => {
        /* gestures stay off if the model can't load */
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [enabled, dwellMs, videoRef]);

  return { handPresent, armedChoice };
}
