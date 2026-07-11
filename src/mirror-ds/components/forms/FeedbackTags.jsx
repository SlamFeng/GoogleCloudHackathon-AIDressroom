import React from "react";

const DEFAULT_TAGS = [
  { dimension: "color", label: "Color" },
  { dimension: "fit", label: "Fit" },
  { dimension: "style", label: "Style" },
  { dimension: "price", label: "Price" },
  { dimension: "overall", label: "Not these" }
];

/**
 * Structured feedback quick-tags on the mirror. Fashini reacts to structured
 * feedback by updating constraints and re-recommending — these are the taps
 * that drive that loop (color / fit / style / price / reject). Rendered as
 * gentle glass chips so they don't crowd the reflection. "Not these" = reject_all.
 */
export function FeedbackTags({ tags = DEFAULT_TAGS, onSelect, active, disabled = false, style, ...rest }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, ...style }} {...rest}>
      {tags.map((t) => {
        const isActive = active === t.dimension;
        const reject = t.dimension === "overall";
        return (
          <button
            key={t.dimension}
            type="button"
            disabled={disabled}
            onClick={() => onSelect && onSelect(t)}
            style={{
              height: 40,
              padding: "0 16px",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.4 : 1,
              borderRadius: "var(--radius-pill)",
              border: `1px solid ${isActive ? "var(--accent-bright)" : "var(--glass-hairline)"}`,
              background: isActive ? "var(--accent-tint)" : "var(--glass-inset-fill)",
              color: isActive ? "var(--accent-bright)" : reject ? "var(--failed)" : "var(--on-dark)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              transition: "background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)"
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
