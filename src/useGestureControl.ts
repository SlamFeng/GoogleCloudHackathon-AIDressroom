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

export type GestureAction = "confirm" | "back" | "talk" | "proceed";

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

// 👌 OK sign — MediaPipe has no built-in for it, so detect from landmarks:
// thumb tip (4) and index tip (8) pinched into a ring, with middle/ring/pinky
// extended. Distinct from 👍 (all folded) and 3 fingers (index not pinched).
function isOkSign(hand: Landmark[]): boolean {
  const pinch = Math.hypot(hand[4].x - hand[8].x, hand[4].y - hand[8].y);
  const handSize = Math.hypot(hand[0].x - hand[9].x, hand[0].y - hand[9].y) || 0.1;
  if (pinch / handSize > 0.38) return false; // thumb + index not touching
  const others: Array<[number, number]> = [
    [12, 10],
    [16, 14],
    [20, 18]
  ];
  const extended = others.filter(([tip, pip]) => hand[tip].y < hand[pip].y - 0.02).length;
  return extended >= 2;
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
  const [armedGesture, setArmedGesture] = useState<GestureAction | null>(null);

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
      setArmedGesture(null);
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
    let heldGesture: GestureAction | null = null; // named gesture being held (dwell)
    let gestureStart = 0;
    let gestureFired = false;

    function clearGesture() {
      if (heldGesture !== null) {
        heldGesture = null;
        gestureFired = false;
        setArmedGesture(null);
      }
    }

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
        clearGesture();
        return;
      }
      if (!handShown) {
        handShown = true;
        setHandPresent(true);
      }

      // ✋ / 👍 / ✊ take priority and reset any arming.
      const label = result.gestures?.[0]?.[0]?.categoryName ?? "None";
      let action: GestureAction | null =
        label === "Thumb_Up"
          ? "confirm"
          : label === "Open_Palm"
            ? "talk"
            : label === "Closed_Fist"
              ? "back"
              : null;
      // 👌 OK (custom landmark detection) → proceed to the next step.
      if (!action && isOkSign(hand)) action = "proceed";
      // While a named gesture (👍/✋/✊) is shown, NEVER run finger-count
      // selection — a stray finger in the 👍 pose must not re-pick an option.
      // The gesture must be HELD for dwellMs (a read-bar fills) before it fires,
      // so it isn't hair-trigger.
      if (action) {
        clearArm();
        if (action !== heldGesture) {
          heldGesture = action;
          gestureStart = now;
          gestureFired = false;
          setArmedGesture(action);
        } else if (now - gestureStart >= dwellMs && now > cooldownUntil && !gestureFired) {
          gestureFired = true;
          cooldownUntil = now + 1500;
          onGestureRef.current(action);
        }
        return;
      }
      clearGesture();

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

  return { handPresent, armedChoice, armedGesture, dwellMs };
}
