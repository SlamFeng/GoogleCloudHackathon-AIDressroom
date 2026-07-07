import React from "react";

/**
 * Large numeric field with a trailing unit — the display value is set in
 * the display grotesk, big and editorial (height/weight capture).
 */
export function NumberField({ value, onChange, unit, min, max, style, ...rest }) {
  return (
    <div
      style={{
        height: 70,
        borderBottom: "1px solid var(--ink)",
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        ...style
      }}
    >
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange && onChange(Number(e.target.value))}
        style={{
          width: "100%",
          border: 0,
          outline: "none",
          background: "transparent",
          fontFamily: "var(--font-sans)",
          fontWeight: 700,
          fontSize: 40,
          letterSpacing: "-0.03em",
          color: "var(--ink)"
        }}
        {...rest}
      />
      {unit && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 15,
            color: "var(--muted)",
            flex: "0 0 auto"
          }}
        >
          {unit}
        </span>
      )}
    </div>
  );
}
