import React from "react";

/**
 * Square consent checkbox with the brand ✓ mark. Checked state fills ink
 * (not accent — consent is neutral, not a "primary action").
 */
export function Checkbox({ checked = false, onChange, children, style, ...rest }) {
  return (
    <label
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: "12px 0",
        fontSize: 13,
        lineHeight: 1.5,
        color: "var(--ink)",
        cursor: "pointer",
        ...style
      }}
    >
      <span
        style={{
          width: 19,
          height: 19,
          flex: "0 0 auto",
          border: `1px solid ${checked ? "var(--ink)" : "var(--faint)"}`,
          borderRadius: 4,
          background: checked ? "var(--ink)" : "transparent",
          color: "var(--accent-ink)",
          display: "grid",
          placeItems: "center",
          fontSize: 12,
          lineHeight: 1,
          transition: "background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)"
        }}
      >
        {checked ? "✓" : ""}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange && onChange(e.target.checked)}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
        {...rest}
      />
      <span>{children}</span>
    </label>
  );
}
