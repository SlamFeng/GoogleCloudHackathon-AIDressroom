import React from "react";

/**
 * A crisp 1px hairline rule. The primary structural divider in Fashini —
 * used instead of shadows or heavy borders.
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
              background: "var(--hairline)",
              margin: `${inset}px 0`,
              ...style
            }
          : {
              height: 1,
              width: "100%",
              background: "var(--hairline)",
              margin: `0 ${inset}px`,
              ...style
            }
      }
      {...rest}
    />
  );
}
