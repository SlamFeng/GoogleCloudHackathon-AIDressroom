import React from "react";

/**
 * Monospace, tabular-nums price in JPY (¥). Prices are the loudest mono voice
 * on the mirror. Optionally count-up to the value on mount (used on the confirm
 * total). Honors prefers-reduced-motion by snapping to the final value.
 */
export function PriceTag({
  amount,
  size = "md",
  countUp = false,
  currency = "¥",
  tone = "on-dark",
  style,
  ...rest
}) {
  const [display, setDisplay] = React.useState(countUp ? 0 : amount);

  React.useEffect(() => {
    if (!countUp) {
      setDisplay(amount);
      return;
    }
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(amount);
      return;
    }
    let raf;
    const start = performance.now();
    const dur = 700;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(amount * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [amount, countUp]);

  const fontSize =
    size === "sm" ? "16px" : size === "lg" ? "40px" : size === "xl" ? "56px" : "24px";
  const symSize =
    size === "sm" ? "11px" : size === "lg" ? "20px" : size === "xl" ? "28px" : "15px";
  const color = tone === "accent" ? "var(--accent-bright)" : "var(--on-dark)";

  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontVariantNumeric: "tabular-nums",
        fontWeight: "var(--weight-bold)",
        fontSize,
        letterSpacing: "-0.01em",
        color,
        lineHeight: 1,
        whiteSpace: "nowrap",
        ...style
      }}
      {...rest}
    >
      <span style={{ fontSize: symSize, fontWeight: "var(--weight-semibold)", marginRight: 2 }}>
        {currency}
      </span>
      {display.toLocaleString("ja-JP")}
    </span>
  );
}
