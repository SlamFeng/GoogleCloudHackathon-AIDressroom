import React from "react";

const TONES = {
  ok: { color: "var(--ok)", bg: "var(--ok-soft)", border: "transparent" },
  held: { color: "var(--held)", bg: "var(--held-soft)", border: "var(--accent)" },
  failed: { color: "var(--failed)", bg: "var(--failed-soft)", border: "transparent" },
  neutral: { color: "var(--muted)", bg: "var(--inset)", border: "transparent" }
};

// Maps a ToolCallRecord.output to a tone (mirrors the source deriveToolStatus).
export function toolTone(output) {
  if (output && typeof output === "object") {
    if (output.ok === false) return "failed";
    const s = output.status;
    if (typeof s === "string") {
      if (s === "confirmed" || s === "held" || s === "success") return s === "held" ? "held" : "ok";
      if (s === "not_found" || s === "failed") return "failed";
      return "neutral";
    }
  }
  return "ok";
}

/**
 * Small status chip for tool-call results: ok / held / failed / neutral.
 * `held` is the only accent-colored status.
 */
export function ToolStatusChip({ status = "ok", label, style, ...rest }) {
  const t = TONES[status] || TONES.neutral;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 9px",
        borderRadius: "var(--radius-pill)",
        background: t.bg,
        border: `1px solid ${t.border}`,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 600,
        color: t.color,
        letterSpacing: "0.01em",
        ...style
      }}
      {...rest}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.color }} />
      {label || status}
    </span>
  );
}
