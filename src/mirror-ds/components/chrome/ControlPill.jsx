import React from "react";

/**
 * ControlPill — a tiny, unobtrusive glass pill for the top controls (back,
 * camera source, gestures on/off, fit view, voice mute). Icon-only by default;
 * pass a `label` for the few that need words. `active` lights it cobalt to show
 * an enabled toggle (e.g. gestures on).
 */
export function ControlPill({
  icon,
  label,
  active = false,
  as = "button",
  style,
  children,
  ...rest
}) {
  const Tag = as;
  return (
    <Tag
      type={as === "button" ? "button" : undefined}
      aria-pressed={as === "button" ? active : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: label ? 7 : 0,
        height: 38,
        padding: label ? "0 14px" : "0 11px",
        borderRadius: "var(--radius-pill)",
        border: `1px solid ${active ? "var(--accent-bright)" : "var(--glass-hairline)"}`,
        borderTopColor: active ? "var(--accent-bright)" : "var(--glass-edge)",
        background: active ? "var(--accent-tint)" : "var(--glass-pill-fill)",
        WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
        backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
        color: active ? "var(--accent-bright)" : "var(--on-dark-2)",
        fontFamily: "var(--font-sans)",
        fontSize: 12.5,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        lineHeight: 1,
        cursor: as === "button" ? "pointer" : "default",
        transition:
          "background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)",
        ...style
      }}
      {...rest}
    >
      {icon != null && <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1 }}>{icon}</span>}
      {label}
      {children}
    </Tag>
  );
}
