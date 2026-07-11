import React from "react";

/**
 * A crisp 1px hairline on the dark glass surface — the primary structural
 * divider in Fashini, used instead of shadows or heavy borders. Renders at
 * the low-alpha light hairline token so it reads on ink.
 */
export function Hairline({ vertical = false, inset = 0, style, ...rest }) {
  return (
    <div
      role="separator"
      style={
        vertical
          ? {
              width: 1,
              alignSelf: "stretch",
              background: "var(--border-hairline)",
              margin: `${inset}px 0`,
              ...style
            }
          : {
              height: 1,
              width: "100%",
              background: "var(--border-hairline)",
              margin: `0 ${inset}px`,
              ...style
            }
      }
      {...rest}
    />
  );
}
