import React from "react";

/**
 * ToolStep — one designed ReAct step in the "working" sequence: a cobalt
 * spinner while running, a cobalt check when done, with a human label. Several
 * stack and flip running → done as Fashini reads the body template, searches
 * in-stock looks, and styles three looks. A glass pill, not a trace dump.
 * Streams in staggered via the fsh-item-in keyframe.
 */
export function ToolStep({ label, done = false, index = 0, style, ...rest }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 15px",
        borderRadius: "var(--radius-pill)",
        border: "1px solid var(--glass-hairline)",
        background: "var(--glass-pill-fill)",
        WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
        backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
        color: done ? "var(--on-dark-2)" : "var(--on-dark)",
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: "-0.01em",
        animation: `fsh-item-in var(--dur-base) var(--ease-out) both`,
        animationDelay: `${index * 0.08}s`,
        ...style
      }}
      {...rest}
    >
      {done ? (
        <span aria-hidden="true" style={{ display: "inline-flex", color: "var(--accent-bright)", flex: "0 0 auto" }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M3.5 8.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      ) : (
        <span
          aria-hidden="true"
          style={{
            width: 15,
            height: 15,
            flex: "0 0 auto",
            borderRadius: "50%",
            border: "2px solid var(--on-dark-line)",
            borderTopColor: "var(--accent-bright)",
            animation: "fsh-spin 0.8s linear infinite"
          }}
        />
      )}
      <span>{label}</span>
    </div>
  );
}
