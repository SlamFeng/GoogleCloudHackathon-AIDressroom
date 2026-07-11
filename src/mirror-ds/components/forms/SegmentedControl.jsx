import React from "react";

/**
 * Segmented single-select on the dark glass surface. The active segment fills
 * cobalt; the track is a glass inset. Used for the profile gate (gender / age)
 * and other discrete picks. Large touch targets for standing use.
 */
export function SegmentedControl({ options, value, onChange, size = "md", style, ...rest }) {
  const h = size === "lg" ? 60 : size === "sm" ? 40 : 52;
  return (
    <div
      role="tablist"
      style={{
        display: "grid",
        gridAutoFlow: "column",
        gridAutoColumns: "1fr",
        gap: 6,
        padding: 5,
        borderRadius: "var(--radius-control)",
        background: "var(--glass-inset-fill)",
        border: "1px solid var(--glass-hairline)",
        ...style
      }}
      {...rest}
    >
      {options.map((opt) => {
        const val = typeof opt === "string" ? opt : opt.value;
        const label = typeof opt === "string" ? opt : opt.label;
        const active = val === value;
        return (
          <button
            key={val}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange && onChange(val)}
            style={{
              height: h,
              padding: "0 12px",
              cursor: "pointer",
              borderRadius: "calc(var(--radius-control) - 4px)",
              border: "1px solid transparent",
              background: active ? "var(--accent)" : "transparent",
              color: active ? "var(--accent-ink)" : "var(--on-dark-2)",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: active ? 600 : 500,
              letterSpacing: "-0.01em",
              boxShadow: active ? "0 8px 22px -12px var(--accent-glow)" : "none",
              transition:
                "background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)"
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
