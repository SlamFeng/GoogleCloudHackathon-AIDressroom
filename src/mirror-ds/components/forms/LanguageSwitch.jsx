import React from "react";

const LANGS = [
  { code: "en", label: "EN" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" }
];

/**
 * Trilingual language switch (EN / 中文 / 日本語) as a glass pill. Active fills
 * cobalt. The demo runs in Chinese. Small enough to sit as a top control.
 */
export function LanguageSwitch({ value = "zh", onChange, langs = LANGS, style, ...rest }) {
  return (
    <div
      aria-label="Language selector"
      style={{
        display: "inline-flex",
        gap: 3,
        padding: 4,
        borderRadius: "var(--radius-pill)",
        border: "1px solid var(--glass-hairline)",
        borderTopColor: "var(--glass-edge)",
        background: "var(--glass-pill-fill)",
        WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
        backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
        ...style
      }}
      {...rest}
    >
      {langs.map((l) => {
        const active = l.code === value;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => onChange && onChange(l.code)}
            style={{
              border: 0,
              cursor: "pointer",
              padding: "6px 12px",
              borderRadius: "var(--radius-pill)",
              background: active ? "var(--accent)" : "transparent",
              color: active ? "var(--accent-ink)" : "var(--on-dark-2)",
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              transition: "background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)"
            }}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
