import React from "react";

const LANGS = [
  { code: "en", label: "EN" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" }
];

/**
 * Trilingual language switch (EN / 中文 / 日本語). Active fills ink.
 */
export function LanguageSwitch({ value = "en", onChange, langs = LANGS, style, ...rest }) {
  return (
    <div
      aria-label="Language selector"
      style={{
        display: "inline-flex",
        gap: 3,
        padding: 3,
        border: "1px solid var(--hairline)",
        borderRadius: "var(--radius-control)",
        background: "var(--surface)",
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
              padding: "6px 10px",
              borderRadius: 5,
              background: active ? "var(--ink)" : "transparent",
              color: active ? "var(--accent-ink)" : "var(--muted)",
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em"
            }}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
