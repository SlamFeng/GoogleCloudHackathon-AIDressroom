import React from "react";
import { MicroLabel } from "../core/MicroLabel.jsx";
import { PriceTag } from "../core/PriceTag.jsx";
import { Button } from "../core/Button.jsx";
import { FeedbackTags } from "../forms/FeedbackTags.jsx";

const REC_LABEL = {
  explicit_need: "Explicit need",
  similar: "Similar",
  style: "Style",
  seasonal: "Seasonal"
};

/**
 * LookStrip — the compact three-looks strip (mirror · three looks). A slim
 * bottom panel so the reflection dominates: number tabs 1·2·3 (finger-count
 * maps here, with a dwell ring), the active look's rec-type + total ¥, and the
 * garment items shown as clear detail rows (thumbnail · name · price) so the
 * customer can see exactly what each piece is.
 *
 * Hands-free first: with `showActions={false}` the tappable Try-on / Choose
 * buttons and feedback chips are dropped entirely (gestures drive those — 👍
 * try on, ✊ back, ✋ talk), maximising the space given to the garments.
 * With `showActions` (default) the buttons + feedback chips are shown for touch.
 */
export function LookStrip({
  looks = [],
  activeIndex = 0,
  onSelect,
  armedIndex = null,
  dwellMs = 700,
  showActions = true,
  onTryOn,
  onChoose,
  onFeedback,
  disabled = false,
  hint = "1·2·3 switch · thumbs-up to try on · fist to go back",
  style,
  ...rest
}) {
  const look = looks[activeIndex];
  const total = look ? (look.totalYen ?? (look.items || []).reduce((s, i) => s + (i.price_yen || 0), 0)) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, ...style }} {...rest}>
      {/* number tabs */}
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }} role="tablist">
        {looks.map((l, i) => {
          const on = i === activeIndex;
          const armed = armedIndex === i;
          return (
            <button
              key={l.id || i}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onSelect && onSelect(i)}
              style={{
                position: "relative",
                width: 46,
                height: 46,
                borderRadius: "50%",
                overflow: "hidden",
                border: `1px solid ${on ? "var(--accent-bright)" : "var(--glass-hairline)"}`,
                background: on ? "var(--accent)" : "var(--glass-pill-fill)",
                WebkitBackdropFilter: "blur(var(--glass-blur))",
                backdropFilter: "blur(var(--glass-blur))",
                color: on ? "var(--accent-ink)" : "var(--on-dark-2)",
                fontFamily: "var(--font-mono)",
                fontSize: 17,
                fontWeight: 600,
                cursor: "pointer",
                transform: on ? "scale(1.06)" : "none",
                transition: "transform var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out)"
              }}
            >
              {armed && (
                <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "var(--accent-glow)", clipPath: "inset(100% 0 0 0)", animation: `fsh-dwell ${dwellMs}ms linear forwards` }} />
              )}
              <span style={{ position: "relative" }}>{i + 1}</span>
            </button>
          );
        })}
      </div>

      {look && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <MicroLabel tone="accent">{look.recLabel || REC_LABEL[look.recType] || look.recType}</MicroLabel>
            <PriceTag amount={total} size="md" />
          </div>

          {/* garment detail rows — thumbnail · name · category · price */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(look.items || []).map((item, k) => (
              <div
                key={item.id || item.name || k}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  padding: 10,
                  borderRadius: "var(--radius-control)",
                  background: "var(--glass-inset-fill)",
                  border: "1px solid var(--glass-hairline)"
                }}
              >
                <span
                  style={{
                    flex: "0 0 auto",
                    width: 52,
                    height: 64,
                    borderRadius: 8,
                    overflow: "hidden",
                    border: "1px solid var(--glass-hairline)",
                    background: item.imageUrl ? "var(--glass-inset-fill)" : `linear-gradient(160deg, ${item.colorHex || "#3a3d47"}, rgba(255,255,255,0.04))`,
                    display: "block"
                  }}
                >
                  {item.imageUrl && <img src={item.imageUrl} alt={item.name || ""} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                </span>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--on-dark)", letterSpacing: "-0.01em", lineHeight: 1.2 }}>{item.name}</div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                    {item.category && <span style={{ fontSize: 12, color: "var(--on-dark-2)" }}>{item.category}</span>}
                    <PriceTag amount={item.price_yen || 0} size="sm" style={{ color: "var(--on-dark-2)" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {showActions ? (
            <>
              <div style={{ display: "flex", gap: 10 }}>
                <Button variant="glass" disabled={disabled} onClick={() => onTryOn && onTryOn(look, activeIndex)} style={{ flex: 1 }}>
                  Try it on
                </Button>
                <Button variant="primary" iconRight={<span aria-hidden="true">→</span>} disabled={disabled} onClick={() => onChoose && onChoose(look, activeIndex)} style={{ flex: 1 }}>
                  Choose
                </Button>
              </div>
              <FeedbackTags disabled={disabled} onSelect={(tag) => onFeedback && onFeedback(tag)} />
            </>
          ) : null}
        </div>
      )}

      {hint && <div style={{ textAlign: "center", color: "var(--on-dark-3)", fontSize: 12 }}>{hint}</div>}
    </div>
  );
}
