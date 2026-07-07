import React from "react";
import { PriceTag } from "../core/PriceTag.jsx";

const SLOT_LABEL = {
  outerwear: "Outerwear",
  top: "Top",
  bottom: "Bottom",
  dress: "Dress",
  shoes: "Shoes",
  accessory: "Accessory"
};

/**
 * A single product line inside a recommendation set: slot label + name,
 * price (¥), and color / fit meta. Bind to `Product`.
 */
export function ProductRow({ product, style, ...rest }) {
  const { name, category, price_yen, colors = [], style_tags = [], fit } = product;
  const meta = [colors.join(" / "), fit || style_tags[0]].filter(Boolean).join(" · ");
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 0",
        borderBottom: "1px solid var(--hairline)",
        ...style
      }}
      {...rest}
    >
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--faint)",
          width: 78,
          flex: "0 0 auto"
        }}
      >
        {SLOT_LABEL[category] || category}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--ink)",
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}
        >
          {name}
        </div>
        {meta && (
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{meta}</div>
        )}
      </div>
      <PriceTag amount={price_yen} size="md" />
    </div>
  );
}
