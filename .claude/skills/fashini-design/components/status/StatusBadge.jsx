import React from "react";

/**
 * A labelled runtime badge — a small caption over a mono value. Used for
 * agent status, route, round, connection, model, etc. Bind to AgentState.
 * `active` highlights the badge in cobalt (e.g. the "held"/active state).
 */
export function StatusBadge({ label, value, active = false, style, ...rest }) {
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: 4,
        padding: "8px 12px",
        border: `1px solid ${active ? "var(--accent)" : "var(--hairline)"}`,
        background: active ? "var(--accent-soft)" : "var(--surface)",
        borderRadius: "var(--radius-control)",
        minWidth: 84,
        ...style
      }}
      {...rest}
    >
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: active ? "var(--accent)" : "var(--faint)"
        }}
      >
        {label}
      </span>
      <strong
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: active ? "var(--accent)" : "var(--ink)",
          textTransform: "lowercase"
        }}
      >
        {value}
      </strong>
    </div>
  );
}
