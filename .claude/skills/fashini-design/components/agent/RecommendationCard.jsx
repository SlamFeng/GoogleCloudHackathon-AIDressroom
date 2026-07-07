import React from "react";
import { RecTypeLabel } from "./RecTypeLabel.jsx";
import { ProductRow } from "./ProductRow.jsx";
import { PriceTag } from "../core/PriceTag.jsx";
import { Button } from "../core/Button.jsx";

let injected = false;
function useStyles() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-fashini", "reccard");
  el.textContent = `
    .fsh-reccard {
      background: var(--surface);
      border: 1px solid var(--hairline);
      border-radius: var(--radius-card);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: transform var(--dur-base) var(--ease-out),
                  box-shadow var(--dur-base) var(--ease-out),
                  border-color var(--dur-base) var(--ease-out);
      animation: fashini-materialize var(--dur-slow) var(--ease-out) both;
    }
    .fsh-reccard:hover { transform: translateY(-3px); box-shadow: var(--shadow-lift); }
    .fsh-reccard[data-selected="true"] {
      border-color: var(--accent);
      box-shadow: 0 0 0 1px var(--accent);
    }
  `;
  document.head.appendChild(el);
}

/**
 * Recommendation SET CARD. Header (rec-type + round), reason, product rows,
 * total, and Preview / Confirm actions. Bind to `RecommendationSet`.
 * Materializes on mount (blur→sharp + rise); use `index` for stagger.
 */
export function RecommendationCard({
  set,
  selected = false,
  index = 0,
  onSelect,
  onPreview,
  onConfirm,
  style,
  ...rest
}) {
  useStyles();
  const products = set.products || [];
  const total = products.reduce((sum, p) => sum + (p.price_yen || 0), 0);
  return (
    <div
      className="fsh-reccard"
      data-selected={selected}
      style={{ animationDelay: `${index * 0.09}s`, ...style }}
      onClick={onSelect}
      {...rest}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <RecTypeLabel recType={set.rec_type} />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--muted)"
          }}
        >
          Round {set.round} · {set.set_id}
        </span>
      </div>

      <p
        style={{
          margin: "12px 0 6px",
          fontSize: 14,
          lineHeight: 1.5,
          color: "var(--ink)",
          textWrap: "pretty"
        }}
      >
        {set.reason}
      </p>

      <div style={{ marginTop: 2 }}>
        {products.map((p) => (
          <ProductRow key={p.product_id || p.name} product={p} />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 16
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--faint)"
            }}
          >
            Set total
          </span>
          <PriceTag amount={total} size="lg" countUp />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Button
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onPreview && onPreview(set);
            }}
          >
            Preview
          </Button>
          <Button
            variant="primary"
            iconRight={<span aria-hidden="true">→</span>}
            onClick={(e) => {
              e.stopPropagation();
              onConfirm && onConfirm(set);
            }}
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
