import { useEffect, useRef, useState, type RefObject } from "react";
import { loadGestureRecognizer } from "./gesture";

// Hands-free selection by FINGER COUNT (far more robust than a free cursor on a
// narrow webcam): hold up 1 / 2 / 3 fingers to arm the matching look, hold it
// steady for `dwellMs` to pick it. 👍 confirms/advances, ✋ goes back. Finger
// count is derived from the hand landmarks directly (the built-in categories
// don't reliably distinguish 1/2/3); 👍/✋ use the built-in gesture labels.

export type GestureAction = "confirm" | "back";

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

      // 👍 / ✋ take priority and reset any arming.
      const label = result.gestures?.[0]?.[0]?.categoryName ?? "None";
      if (now > cooldownUntil && (label === "Thumb_Up" || label === "Open_Palm")) {
        cooldownUntil = now + 1500;
        clearArm();
        onGestureRef.current(label === "Thumb_Up" ? "confirm" : "back");
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
