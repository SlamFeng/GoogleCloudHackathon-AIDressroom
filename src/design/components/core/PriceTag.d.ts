import * as React from "react";

/**
 * Monospace, tabular-nums price in JPY (¥) — the loudest type on the screen.
 * Bind `amount` to `Product.price_yen`. Set `countUp` for the signature
 * price-ticking moment (honors prefers-reduced-motion).
 */
export interface PriceTagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Integer yen value, e.g. `Product.price_yen`. */
  amount: number;
  /** Size step. `xl` for entrance-screen climax. */
  size?: "sm" | "md" | "lg" | "xl";
  /** Animate a count-up to `amount` on mount. */
  countUp?: boolean;
  /** Currency glyph. Default `¥`. */
  currency?: string;
}

export function PriceTag(props: PriceTagProps): React.ReactElement;
