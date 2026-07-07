import React from "react";

/**
 * Constraint delta — shows how feedback changed the agent's constraints
 * (prefer / avoid), the demo evidence that the loop reacted. Bind to
 * `AgentConstraints` (prefer[], avoid[], budget_yen).
 */
export function ConstraintDelta({ prefer = [], avoid = [], budgetYen, style, ...rest }) {
  const Row = ({ kind, item }) => {
    const isAvoid = kind === "avoid";
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 12px",
          borderRadius: "var(--radius-control)",
          background: "var(--inset)"
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            fontWeight: 700,
            color: isAvoid ? "var(--failed)" : "var(--accent)",
            width: 14,
            flex: "0 0 auto"
          }}
        >
          {isAvoid ? "−" : "+"}
        </span>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--faint)", width: 72, flex: "0 0 auto" }}>
          {item.dimension}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
          {item.value}
        </span>
        {item.reason && (
          <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: "auto", textAlign: "right" }}>
            {item.reason}
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        border: "1px solid var(--hairline)",
        borderRadius: "var(--radius-card)",
        background: "var(--surface)",
        padding: 18,
        ...style
      }}
      {...rest}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink)" }}>
          Constraint delta
        </span>
        {typeof budgetYen === "number" && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>
            budget ≤ ¥{budgetYen.toLocaleString("ja-JP")}
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {prefer.map((item, i) => (
          <Row key={`p-${i}`} kind="prefer" item={item} />
        ))}
        {avoid.map((item, i) => (
          <Row key={`a-${i}`} kind="avoid" item={item} />
        ))}
        {prefer.length === 0 && avoid.length === 0 && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>
            No constraints yet — give feedback to refine.
          </span>
        )}
      </div>
    </div>
  );
}
