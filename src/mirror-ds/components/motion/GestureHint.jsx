import React from "react";
import { Icon } from "../core/Icon.jsx";

const DEFAULT_HINTS = [
  { key: "talk", icon: "hand", label: "Talk" },
  { key: "pick", glyph: "1·2·3", label: "Pick" },
  { key: "confirm", icon: "thumbs-up", label: "Try on" },
  { key: "back", icon: "fist", label: "Back" }
];

/**
 * GestureHint (signature B) — small floating glass bubbles teaching the hands-
 * free gestures: ✋ talk · 1/2/3 pick · 👍 try on · ✊ back. They enter with a
 * soft staggered rise, bob gently, and the DETECTED gesture lights up cobalt.
 * When the customer is confident (`quiet`), they auto-fade to near-nothing.
 */
export function GestureHint({ hints = DEFAULT_HINTS, active = null, quiet = false, style, ...rest }) {
  return (
    <div
      role="group"
      aria-label="Gesture hints"
      style={{
        display: "flex",
        gap: 10,
        justifyContent: "center",
        flexWrap: "wrap",
        opacity: quiet ? 0.3 : 1,
        transition: "opacity var(--dur-slow) var(--ease-out)",
        pointerEvents: "none",
        ...style
      }}
      {...rest}
    >
      {hints.map((h, i) => {
        const on = active === h.key;
        return (
          <span
            key={h.key}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 13px",
              borderRadius: "var(--radius-pill)",
              border: `1px solid ${on ? "var(--accent-bright)" : "var(--glass-hairline)"}`,
              borderTopColor: on ? "var(--accent-bright)" : "var(--glass-edge)",
              background: on ? "var(--accent-tint)" : "var(--glass-pill-fill)",
              WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
              backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
              color: on ? "var(--accent-bright)" : "var(--on-dark-2)",
              boxShadow: on ? "0 0 22px -6px var(--accent-glow)" : "var(--glass-shadow-pill)",
              transform: on ? "scale(1.08)" : "none",
              animation: `fsh-bubble-in var(--gesture-in) var(--ease-out) both, fsh-bubble-bob var(--gesture-bob) var(--ease-aura) ${0.5 + i * 0.12}s infinite`,
              animationDelay: `${i * 0.08}s`,
              transition: `transform var(--gesture-detect) var(--ease-out), background var(--gesture-detect) var(--ease-out), border-color var(--gesture-detect) var(--ease-out), color var(--gesture-detect) var(--ease-out)`,
              fontFamily: "var(--font-sans)",
              fontSize: 12.5,
              fontWeight: 600,
              whiteSpace: "nowrap"
            }}
          >
            <span aria-hidden="true" style={{ display: "inline-flex", fontSize: 12, fontFamily: "var(--font-mono)" }}>
              {h.icon ? <Icon name={h.icon} size={16} /> : h.glyph}
            </span>
            {h.label}
          </span>
        );
      })}
    </div>
  );
}
