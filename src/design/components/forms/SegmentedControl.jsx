import React from "react";

/**
 * Segmented single-select control. Active segment fills cobalt.
 * Used for gender presentation, age range, and other discrete picks.
 */
export function SegmentedControl({ options, value, onChange, size = "md", style, ...rest }) {
  const h = size === "lg" ? 60 : size === "sm" ? 40 : 52;
  return (
    <div
      role="tablist"
      style={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: "1fr", gap: 8, ...style }}
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
              borderRadius: "var(--radius-control)",
              border: `1px solid ${active ? "var(--accent)" : "var(--hairline)"}`,
              background: active ? "var(--accent)" : "var(--surface)",
              color: active ? "var(--accent-ink)" : "var(--ink)",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: active ? 600 : 500,
              letterSpacing: "-0.01em",
              transition: "background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)"
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
