import React from "react";

/**
 * Monospace, tabular-nums price in JPY (¥). Prices are the loudest type
 * on the screen. Optionally animates a count-up to the value on mount.
 */
export function PriceTag({
  amount,
  size = "md",
  countUp = false,
  currency = "¥",
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
    size === "sm" ? "16px" : size === "lg" ? "46px" : size === "xl" ? "64px" : "24px";
  const symSize =
    size === "sm" ? "11px" : size === "lg" ? "22px" : size === "xl" ? "30px" : "15px";

  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontVariantNumeric: "tabular-nums",
        fontWeight: "var(--weight-bold)",
        fontSize,
        letterSpacing: "-0.01em",
        color: "var(--ink)",
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
