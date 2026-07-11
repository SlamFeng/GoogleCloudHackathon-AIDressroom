import React from "react";

/**
 * GlassPanel — the signature Fashini Mirror surface. Every piece of UI floats
 * as frosted DARK glass over the live camera reflection: a low-alpha ink fill,
 * a heavy backdrop blur, one bright top hairline, and a soft downward shadow.
 *
 * Depths (`variant`):
 *   · sheet  — bottom-anchored content sheet (top corners rounded only)
 *   · card   — the one focused card (consent gate, confirm)
 *   · pill   — floating pill (chips, tabs, control clusters)
 *   · inset  — a well INSIDE a glass panel (no blur of its own)
 */
export function GlassPanel({
  variant = "card",
  as = "div",
  edge = true,
  style,
  children,
  ...rest
}) {
  const Tag = as;
  const base = {
    position: "relative",
    color: "var(--on-dark)",
    WebkitBackdropFilter:
      variant === "inset"
        ? undefined
        : `blur(var(--glass-blur${variant === "card" ? "-strong" : ""})) saturate(var(--glass-saturate))`,
    backdropFilter:
      variant === "inset"
        ? undefined
        : `blur(var(--glass-blur${variant === "card" ? "-strong" : ""})) saturate(var(--glass-saturate))`,
    border: "1px solid var(--glass-hairline)",
    borderTopColor: edge && variant !== "inset" ? "var(--glass-edge)" : "var(--glass-hairline)"
  };
  const byVariant = {
    sheet: {
      background: "var(--glass-sheet-fill)",
      borderRadius: "var(--radius-sheet) var(--radius-sheet) 0 0",
      boxShadow: "var(--glass-shadow-sheet)",
      borderBottom: 0
    },
    card: {
      background: "var(--glass-raised-fill)",
      borderRadius: "var(--radius-card)",
      boxShadow: "var(--glass-shadow-raised)"
    },
    pill: {
      background: "var(--glass-pill-fill)",
      borderRadius: "var(--radius-pill)",
      boxShadow: "var(--glass-shadow-pill)"
    },
    inset: {
      background: "var(--glass-inset-fill)",
      borderRadius: "var(--radius-control)",
      boxShadow: "none",
      border: "1px solid var(--glass-hairline)"
    }
  };
  return (
    <Tag style={{ ...base, ...byVariant[variant], ...style }} {...rest}>
      {children}
    </Tag>
  );
}
