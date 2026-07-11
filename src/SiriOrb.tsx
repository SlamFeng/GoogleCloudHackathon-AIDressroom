import "./siri-orb.css";
import type { CSSProperties } from "react";

export type SiriOrbState = "hidden" | "idle" | "listening" | "speaking";

export interface SiriOrbColors {
  bg?: string;
  c1?: string;
  c2?: string;
  c3?: string;
}

/**
 * Siri-style voice orb — ported from SmoothUI's siri-orb (MIT,
 * https://smoothui.dev/docs/components/siri-orb): pure-CSS rotating conic
 * gradients, no WebGL. Extended with the VoiceAura state+amplitude contract so
 * the mirror can drive it the same way: rotation speeds up while
 * listening/speaking, and live mic amplitude (0..1) breathes/saturates the orb.
 */
const STATE_DURATION: Record<Exclude<SiriOrbState, "hidden">, number> = {
  idle: 20,
  listening: 8,
  speaking: 5
};

export function SiriOrb({
  state = "idle",
  amplitude = 0,
  size = 192,
  colors,
  animationDuration,
  className,
  style
}: {
  state?: SiriOrbState;
  amplitude?: number;
  size?: number;
  colors?: SiriOrbColors;
  /** Seconds per rotation; overrides the per-state speeds. */
  animationDuration?: number;
  className?: string;
  style?: CSSProperties;
}) {
  if (state === "hidden") return null;
  const amp = Math.max(0, Math.min(1, amplitude));
  const c = {
    // SmoothUI ships a light bg (oklch 95%); the mirror is dark glass, so the
    // core defaults dark. Pastel accents are upstream's.
    bg: "oklch(22% 0.03 264)",
    c1: "oklch(75% 0.15 350)",
    c2: "oklch(80% 0.12 200)",
    c3: "oklch(78% 0.14 280)",
    ...colors
  };
  // Upstream's size-responsive tuning, kept as-is so small orbs stay readable.
  const small = size < 50;
  const blur = Math.max(size * (small ? 0.008 : 0.015), small ? 1 : 4);
  const baseContrast = Math.max(size * (small ? 0.004 : 0.008), small ? 1.2 : 1.5);
  const contrast =
    size < 30 ? 1.1 : small ? Math.max(baseContrast * 1.2, 1.3) : baseContrast;
  const dot = Math.max(size * (small ? 0.004 : 0.008), small ? 0.05 : 0.1);
  const shadow = Math.max(size * (small ? 0.004 : 0.008), small ? 0.5 : 2);
  const maskRadius = size < 30 ? "0%" : size < 50 ? "5%" : size < 100 ? "15%" : "25%";
  return (
    <div
      className={className ? `siri-orb ${className}` : "siri-orb"}
      data-state={state}
      data-mask={maskRadius === "0%" ? "none" : "round"}
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        ...({
          "--so-bg": c.bg,
          "--so-c1": c.c1,
          "--so-c2": c.c2,
          "--so-c3": c.c3,
          "--so-duration": `${animationDuration ?? STATE_DURATION[state]}s`,
          "--so-blur": `${blur}px`,
          "--so-contrast": contrast,
          "--so-dot": `${dot}px`,
          "--so-shadow": `${shadow}px`,
          "--so-mask": maskRadius,
          "--so-amp": amp
        } as CSSProperties),
        ...style
      }}
    />
  );
}
