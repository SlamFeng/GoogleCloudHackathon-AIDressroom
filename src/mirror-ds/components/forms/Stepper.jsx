import React from "react";

/**
 * Stepper — a big numeric value with −/+ glass buttons and a trailing unit.
 * Replaces a heavy text field for height / weight in the profile gate: quick,
 * hands-easy, and legible at arm's length. The value is set in the display
 * grotesk (big, editorial); the unit is mono.
 */
export function Stepper({
  value,
  onChange,
  unit,
  min = 0,
  max = 999,
  step = 1,
  style,
  ...rest
}) {
  const clamp = (n) => Math.max(min, Math.min(max, n));
  const set = (n) => onChange && onChange(clamp(n));

  const btn = {
    width: 52,
    height: 52,
    flex: "0 0 auto",
    borderRadius: "var(--radius-control)",
    border: "1px solid var(--glass-hairline)",
    background: "var(--glass-inset-fill)",
    color: "var(--on-dark)",
    fontSize: 24,
    fontWeight: 500,
    lineHeight: 1,
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    transition: "border-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out)"
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        ...style
      }}
      {...rest}
    >
      <button type="button" aria-label="Decrease" style={btn} onClick={() => set(value - step)}>
        −
      </button>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          gap: 8,
          borderBottom: "1px solid var(--on-dark-line)",
          padding: "6px 0"
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 40,
            letterSpacing: "-0.03em",
            color: "var(--on-dark)"
          }}
        >
          {value}
        </span>
        {unit && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, color: "var(--on-dark-2)" }}>
            {unit}
          </span>
        )}
      </div>
      <button type="button" aria-label="Increase" style={btn} onClick={() => set(value + step)}>
        +
      </button>
    </div>
  );
}
