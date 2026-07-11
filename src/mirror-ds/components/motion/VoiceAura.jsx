import React from "react";

/**
 * VoiceAura (signature A) — the centerpiece. A soft, DIFFUSE, ambient gradient
 * aura (never a hard shape): a heavily-blurred cobalt mesh with one warm
 * secondary, slowly morphing and breathing. It ENTERS when the agent listens
 * or speaks, EXPANDS / brightens with voice amplitude while the customer talks
 * (STT), and pulses gently in rhythm while the agent speaks (TTS).
 *
 * state: "hidden" | "idle" | "listening" | "speaking"
 * amplitude: 0..1 — live mic level; grows/brightens the aura while listening.
 *
 * Built from React so the breathing + amplitude follow survive re-renders; the
 * morph keyframe lives in the token base (fsh-aura-breathe). Under reduced
 * motion it holds a soft steady glow instead of morphing.
 */
export function VoiceAura({ state = "idle", amplitude = 0, size = 320, style, ...rest }) {
  const shown = state !== "hidden";
  // Amplitude expands + brightens while listening; a calm baseline otherwise.
  const amp = Math.max(0, Math.min(1, amplitude));
  const scale =
    state === "listening" ? 1 + amp * 0.42 : state === "speaking" ? 1.04 : 1;
  const brightness =
    state === "listening" ? 0.85 + amp * 0.6 : state === "speaking" ? 1 : 0.8;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "relative",
        width: size,
        height: size,
        pointerEvents: "none",
        opacity: shown ? 1 : 0,
        transition: "opacity var(--aura-enter) var(--ease-out)",
        ...style
      }}
      {...rest}
    >
      {/* the diffuse morphing mesh */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "100%",
          height: "100%",
          transform: `translate(-50%, -50%) scale(${scale})`,
          filter: `blur(38px) brightness(${brightness})`,
          transition:
            "transform var(--aura-react) linear, filter var(--aura-react) linear",
          animation:
            state === "speaking"
              ? "fsh-aura-tts var(--aura-pulse-tts) var(--ease-aura) infinite"
              : undefined
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "radial-gradient(closest-side, var(--accent-glow), transparent 72%)",
            animation: "fsh-aura-breathe var(--aura-breathe) var(--ease-aura) infinite"
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: "14%",
            borderRadius: "50%",
            background:
              "radial-gradient(closest-side, rgba(61,82,255,0.7), transparent 68%)",
            animation: "fsh-aura-breathe calc(var(--aura-breathe) * 1.3) var(--ease-aura) infinite reverse"
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: "28%",
            borderRadius: "50%",
            background:
              "radial-gradient(closest-side, var(--aura-warm-glow), transparent 70%)",
            mixBlendMode: "screen",
            animation: "fsh-aura-breathe calc(var(--aura-breathe) * 0.85) var(--ease-aura) infinite"
          }}
        />
      </div>
    </div>
  );
}
