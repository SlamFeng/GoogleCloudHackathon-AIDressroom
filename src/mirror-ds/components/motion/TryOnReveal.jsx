import React from "react";
import { MicroLabel } from "../core/MicroLabel.jsx";
import { PriceTag } from "../core/PriceTag.jsx";
import { Button } from "../core/Button.jsx";

/**
 * TryOnReveal (signature D) — the choreographed climax and the ONE allowed
 * full-bleed moment. When it enters, a light "bloom" shimmer sweeps the
 * reflection top→bottom, the "you wearing it" view cross-fades to full-bleed,
 * and a thin cobalt progress RING counts down the render window (~15s) while a
 * rendered image resolves. A minimal bottom action bar (back / choose) floats
 * over a gradient scrim; everything else recedes so the customer just sees
 * themselves wearing the look.
 *
 * phase: "revealing" (play bloom + cross-fade) | "active" (settled).
 * Provide `imageUrl` (the rendered look) or leave null to show the live-mirror
 * placeholder message while it generates.
 */
export function TryOnReveal({
  phase = "revealing",
  imageUrl = null,
  windowMs = 15000,
  generating = true,
  recLabel = "Explicit need",
  totalYen = 0,
  headline = "正在把这套穿到你身上…",
  subline = "你正看着实时镜面，稍等就能看到自己穿上的样子。",
  onBack,
  onChoose,
  showRing = true,
  style,
  ...rest
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        overflow: "hidden",
        animation: "fsh-tryon-in var(--reveal-crossfade) var(--ease-out) both",
        ...style
      }}
      {...rest}
    >
      {/* the rendered "you wearing it" image (mirrored like the reflection) */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt="You in this look"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: "scaleX(-1)",
            animation: "fsh-tryon-in var(--reveal-crossfade) var(--ease-out) both"
          }}
        />
      )}

      {/* light bloom sweep — plays once on reveal */}
      {phase === "revealing" && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: "42%",
            top: 0,
            background:
              "linear-gradient(to bottom, transparent, rgba(255,255,255,0.42) 55%, transparent)",
            mixBlendMode: "screen",
            animation: "fsh-bloom-sweep var(--reveal-bloom) var(--ease-out) both"
          }}
        />
      )}

      {/* placeholder message while the render resolves */}
      {!imageUrl && (
        <div
          style={{
            position: "absolute",
            top: 28,
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(86%, 420px)",
            textAlign: "center",
            padding: "14px 18px",
            borderRadius: "var(--radius-card)",
            background: "rgba(5,5,7,0.5)",
            WebkitBackdropFilter: "blur(14px)",
            backdropFilter: "blur(14px)",
            border: "1px solid var(--glass-hairline)",
            color: "var(--on-dark)"
          }}
        >
          <strong style={{ display: "block", fontSize: 15, marginBottom: 4 }}>
            {generating ? headline : "正在生成试穿效果…"}
          </strong>
          <span style={{ fontSize: 13, color: "var(--on-dark-2)" }}>{subline}</span>
        </div>
      )}

      {/* thin cobalt progress ring — the render window */}
      {showRing && (
        <div style={{ position: "absolute", top: 20, right: 20, width: 52, height: 52 }}>
          <svg width="52" height="52" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="50" cy="50" r="46" fill="none" stroke="var(--on-dark-line)" strokeWidth="5" />
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="var(--accent-bright)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="289"
              style={{
                ["--ring-circ"]: 289,
                animation: `fsh-ring-fill ${windowMs}ms linear both`
              }}
            />
          </svg>
        </div>
      )}

      {/* minimal bottom action bar — stacks on the narrow portrait frame */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: "24px var(--sheet-gutter) calc(20px + env(safe-area-inset-bottom, 0px))",
          background: "linear-gradient(to top, var(--scrim-bottom), transparent)"
        }}
      >
        <span
          style={{
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 13px",
            borderRadius: "var(--radius-pill)",
            background: "var(--glass-pill-fill)",
            WebkitBackdropFilter: "blur(var(--glass-blur))",
            backdropFilter: "blur(var(--glass-blur))",
            border: "1px solid var(--glass-hairline)",
            whiteSpace: "nowrap"
          }}
        >
          <MicroLabel tone="accent">{recLabel}</MicroLabel>
          <PriceTag amount={totalYen} size="md" />
        </span>
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="glass" onClick={onBack} style={{ flex: 1 }}>Back to looks</Button>
          <Button variant="primary" iconRight={<span aria-hidden="true">→</span>} onClick={onChoose} style={{ flex: 1 }}>
            Choose this
          </Button>
        </div>
      </div>
    </div>
  );
}
