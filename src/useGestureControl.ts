import { useEffect, useRef, useState, type RefObject } from "react";
import { loadGestureRecognizer } from "./gesture";

// Drives a hands-free cursor from the mirror camera: the index fingertip moves
// a floating dot, hovering a [data-gesture-target] for `dwellMs` selects it,
// 👍 confirms and ✋ goes back. Cursor motion + dwell run imperatively inside
// the rAF loop (moving DOM directly, no React re-render per frame); only the
// low-frequency hand-present / gesture-label changes flow through state.

export type GestureAction = "confirm" | "back";

interface Options {
  videoRef: RefObject<HTMLVideoElement | null>;
  containerRef: RefObject<HTMLElement | null>;
  cursorRef: RefObject<HTMLDivElement | null>;
  ringRef: RefObject<SVGCircleElement | null>;
  enabled: boolean;
  dwellMs?: number;
  onDwell: (target: HTMLElement) => void;
  onGesture: (action: GestureAction) => void;
}

const RING_CIRCUMFERENCE = 2 * Math.PI * 20; // r=20 in the cursor SVG

export function useGestureControl({
  videoRef,
  containerRef,
  cursorRef,
  ringRef,
  enabled,
  dwellMs = 900,
  onDwell,
  onGesture
}: Options) {
  const [handPresent, setHandPresent] = useState(false);
  const [gestureLabel, setGestureLabel] = useState("");

  // Keep the latest callbacks without re-subscribing the loop each render.
  const onDwellRef = useRef(onDwell);
  const onGestureRef = useRef(onGesture);
  onDwellRef.current = onDwell;
  onGestureRef.current = onGesture;

  useEffect(() => {
    if (!enabled) {
      setHandPresent(false);
      setGestureLabel("");
      return;
    }

    let cancelled = false;
    let raf = 0;
    let recognizer: Awaited<ReturnType<typeof loadGestureRecognizer>> | null = null;
    let lastVideoTime = -1;
    let handShown = false;
    let currentLabel = "";
    let dwellTarget: HTMLElement | null = null;
    let dwellStart = 0;
    let gesture = "";
    let gestureStable = 0;
    let cooldownUntil = 0;

    function setRing(progress: number) {
      if (ringRef.current) {
        ringRef.current.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - progress));
      }
    }
    function showCursor(x: number, y: number) {
      const dot = cursorRef.current;
      if (!dot) return;
      dot.style.transform = `translate(${x}px, ${y}px)`;
      dot.style.opacity = "1";
    }
    function hideCursor() {
      if (cursorRef.current) cursorRef.current.style.opacity = "0";
      dwellTarget = null;
      setRing(0);
    }

    function loop() {
      if (cancelled) return;
      raf = requestAnimationFrame(loop);

      const video = videoRef.current;
      const container = containerRef.current;
      if (!recognizer || !video || !container || video.readyState < 2) return;
      if (video.currentTime === lastVideoTime) return; // no fresh frame
      lastVideoTime = video.currentTime;

      const now = performance.now();
      let result;
      try {
        result = recognizer.recognizeForVideo(video, now);
      } catch {
        return;
      }

      const hand = result.landmarks?.[0];
      if (!hand) {
        if (handShown) {
          handShown = false;
          setHandPresent(false);
        }
        if (currentLabel) {
          currentLabel = "";
          setGestureLabel("");
        }
        hideCursor();
        return;
      }
      if (!handShown) {
        handShown = true;
        setHandPresent(true);
      }

      // Index fingertip → screen point. The feed is displayed mirrored, so flip x.
      const tip = hand[8];
      const rect = container.getBoundingClientRect();
      const x = rect.left + (1 - tip.x) * rect.width;
      const y = rect.top + tip.y * rect.height;
      showCursor(x, y);

      // Dwell-to-select over the nearest gesture target under the cursor.
      const under = document.elementFromPoint(x, y);
      const target = (under?.closest?.("[data-gesture-target]") as HTMLElement | null) ?? null;
      if (target && target.getAttribute("data-gesture-disabled") !== "true") {
        if (target === dwellTarget) {
          const progress = Math.min(1, (now - dwellStart) / dwellMs);
          setRing(progress);
          if (progress >= 1 && now > cooldownUntil) {
            cooldownUntil = now + 1200;
            dwellTarget = null;
            setRing(0);
            onDwellRef.current(target);
          }
        } else {
          dwellTarget = target;
          dwellStart = now;
          setRing(0);
        }
      } else {
        dwellTarget = null;
        setRing(0);
      }

      // Discrete gestures: require two stable frames + a cooldown before firing.
      const name = result.gestures?.[0]?.[0]?.categoryName ?? "None";
      if (name === gesture) gestureStable += 1;
      else {
        gesture = name;
        gestureStable = 0;
      }
      if (name !== currentLabel) {
        currentLabel = name;
        setGestureLabel(name);
      }
      if (gestureStable === 2 && now > cooldownUntil) {
        if (name === "Thumb_Up") {
          cooldownUntil = now + 1500;
          onGestureRef.current("confirm");
        } else if (name === "Open_Palm") {
          cooldownUntil = now + 1500;
          onGestureRef.current("back");
        }
      }
    }

    loadGestureRecognizer()
      .then((r) => {
        if (cancelled) return;
        recognizer = r;
        loop();
      })
      .catch(() => {
        /* gesture control simply stays off if the model can't load */
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (cursorRef.current) cursorRef.current.style.opacity = "0";
    };
  }, [enabled, dwellMs, videoRef, containerRef, cursorRef, ringRef]);

  return { handPresent, gestureLabel };
}
