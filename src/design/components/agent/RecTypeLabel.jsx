import React from "react";

const REC_TYPE_LABEL = {
  explicit_need: "Explicit need",
  similar: "Similar",
  style: "Style",
  seasonal: "Seasonal"
};

/**
 * The rec-type label on a recommendation set — one of the few places the
 * cobalt accent is allowed. Bind to `RecommendationSet.rec_type`.
 */
export function RecTypeLabel({ recType, style, ...rest }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--accent)",
        ...style
      }}
      {...rest}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
      {REC_TYPE_LABEL[recType] || recType}
    </span>
  );
}
