import React from "react";

/**
 * ConsentCheck — a single graceful consent row: a square check that fills cobalt
 * when agreed, and a line of plain, trustworthy copy. This is the tap that turns
 * the camera on, so it is calm and unambiguous (not a "primary action" colour
 * fight — the tick is cobalt to signal it is the one meaningful agreement).
 */
export function ConsentCheck({ checked = false, onChange, children, style, ...rest }) {
  return (
    <label
      style={{
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        padding: "14px 16px",
        borderRadius: "var(--radius-control)",
        background: checked ? "var(--accent-tint)" : "var(--glass-inset-fill)",
        border: `1px solid ${checked ? "var(--accent-bright)" : "var(--glass-hairline)"}`,
        fontSize: 14,
        lineHeight: 1.5,
        color: "var(--on-dark)",
        cursor: "pointer",
        transition: "background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)",
        ...style
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          flex: "0 0 auto",
          marginTop: 1,
          border: `1px solid ${checked ? "var(--accent-bright)" : "var(--on-dark-3)"}`,
          borderRadius: 6,
          background: checked ? "var(--accent)" : "transparent",
          color: "var(--accent-ink)",
          display: "grid",
          placeItems: "center",
          fontSize: 13,
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
