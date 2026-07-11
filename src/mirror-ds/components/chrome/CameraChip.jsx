import React from "react";

/**
 * CameraChip — the persistent, quiet reassurance shown the whole time the
 * camera is live: a pulsing red "live" dot + "● camera on · nothing is saved".
 * Honest by design (the dot is the real recording indicator, red not cobalt),
 * and small so it never fights the reflection. Sits top-left over the mirror.
 */
export function CameraChip({ children = "Camera on · nothing is saved", live = true, style, ...rest }) {
  return (
    <span
      role="status"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 13px 7px 11px",
        borderRadius: "var(--radius-pill)",
        border: "1px solid var(--glass-hairline)",
        borderTopColor: "var(--glass-edge)",
        background: "var(--glass-pill-fill)",
        WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
        backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
        color: "var(--on-dark-2)",
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        letterSpacing: "0.01em",
        ...style
      }}
      {...rest}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          flex: "0 0 auto",
          background: live ? "var(--live)" : "var(--on-dark-3)",
          animation: live ? "fsh-live-pulse 1.8s var(--ease-out) infinite" : "none"
        }}
      />
      {children}
    </span>
  );
}
