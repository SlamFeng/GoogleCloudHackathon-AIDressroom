import React from "react";

/**
 * LiveTranscript (signature C) — the customer's spoken words rise/fade in as a
 * refined caption over a soft dark scrim, visually tied to the voice aura (A).
 * Each word animates in on arrival (fsh-word-in); the trailing (interim) word
 * shows at lower opacity while still being recognised. Empty until listening.
 */
export function LiveTranscript({ text = "", interim = "", listening = false, style, ...rest }) {
  const trimmed = String(text).trim();
  const words = trimmed ? trimmed.split(/\s+/) : [];
  const isLatin = words.length > 1;
  // Per-character for CJK (no spaces) so a long phrase wraps naturally.
  const units = isLatin ? words : Array.from(trimmed);
  const show = listening || units.length > 0 || interim;
  if (!show) return null;

  return (
    <div
      aria-live="polite"
      style={{
        maxWidth: "88%",
        margin: "0 auto",
        padding: "12px 18px",
        borderRadius: 18,
        background: "rgba(5, 5, 7, 0.5)",
        WebkitBackdropFilter: "blur(14px)",
        backdropFilter: "blur(14px)",
        border: "1px solid var(--glass-hairline)",
        color: "var(--on-dark)",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-subtitle)",
        lineHeight: 1.4,
        textAlign: "center",
        overflowWrap: "anywhere",
        wordBreak: "break-word",
        ...style
      }}
      {...rest}
    >
      {units.length === 0 && !interim ? (
        <span style={{ color: "var(--on-dark-2)" }}>…</span>
      ) : (
        <>
          {units.map((u, i) => (
            <span
              key={i}
              style={{
                display: "inline-block",
                marginRight: isLatin ? "0.28em" : 0,
                animation: "fsh-word-in var(--stt-word-in) var(--ease-out) both",
                animationDelay: `${Math.min(i * 0.035, 0.5)}s`
              }}
            >
              {u}
            </span>
          ))}
          {interim && (
            <span
              style={{
                display: "inline-block",
                marginLeft: isLatin ? 0 : "0.2em",
                color: "var(--on-dark-2)",
                animation: "fsh-word-in var(--stt-word-in) var(--ease-out) both"
              }}
            >
              {interim}
            </span>
          )}
        </>
      )}
    </div>
  );
}
