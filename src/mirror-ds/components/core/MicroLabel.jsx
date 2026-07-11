import React from "react";

/**
 * Uppercase micro-label with wide tracking — step markers, section eyebrows,
 * and code-voice labels. On the dark mirror surface it reads at low emphasis;
 * `tone="accent"` is one of the few places cobalt is allowed.
 */
export function MicroLabel({ children, tone = "muted", as = "span", style, ...rest }) {
  const Tag = as;
  const color =
    tone === "accent"
      ? "var(--accent-bright)"
      : tone === "on-dark"
        ? "var(--on-dark)"
        : "var(--on-dark-2)";
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
