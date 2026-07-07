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
 * A single product line inside a recommendation set: catalog thumbnail
 * (`image_url`, falls back to a neutral tile) + name, slot / color / fit meta,
 * and price (¥). Bind to `Product`.
 */
export function ProductRow({ product, style, ...rest }) {
  const { name, category, price_yen, colors = [], style_tags = [], fit, image_url } = product;
  const meta = [SLOT_LABEL[category] || category, colors.join(" / "), fit || style_tags[0]]
    .filter(Boolean)
    .join(" · ");
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 0",
        borderBottom: "1px solid var(--hairline)",
        ...style
      }}
      {...rest}
    >
      <span
        style={{
          width: 44,
          height: 54,
          flex: "0 0 auto",
          borderRadius: 8,
          overflow: "hidden",
          background: "var(--inset)",
          border: "1px solid var(--hairline)",
          display: "block"
        }}
      >
        {image_url ? (
          <img
            src={image_url}
            alt=""
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : null}
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
