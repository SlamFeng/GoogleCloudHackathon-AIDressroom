import React from "react";

/**
 * Standing privacy reassurance chip — a quiet dot + line. Fashini shows
 * privacy plainly and repeatedly ("Photos deleted after this session").
 */
export function PrivacyChip({ children, style, ...rest }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        color: "var(--muted)",
        fontFamily: "var(--font-sans)",
        ...style
      }}
      {...rest}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: "var(--ok)",
          boxShadow: "0 0 0 4px var(--inset)",
          flex: "0 0 auto"
        }}
      />
      {children}
    </span>
  );
}
