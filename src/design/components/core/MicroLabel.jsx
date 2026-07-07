import React from "react";

/**
 * Uppercase micro-label with wide tracking. Used for step markers,
 * section eyebrows, and code-voice labels.
 */
export function MicroLabel({ children, tone = "muted", as = "span", style, ...rest }) {
  const Tag = as;
  const color =
    tone === "accent" ? "var(--accent)" : tone === "ink" ? "var(--ink)" : "var(--muted)";
  return (
    <Tag
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-micro)",
        fontWeight: "var(--weight-semibold)",
        letterSpacing: "var(--tracking-label)",
        textTransform: "uppercase",
        color,
        margin: 0,
        ...style
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
