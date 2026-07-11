import * as React from "react";

/**
 * Monospace tabular-nums ¥ price. Prices are the loudest mono voice on the
 * mirror. `countUp` animates to the value on mount (confirm total).
 */
export interface PriceTagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Amount in yen (integer). */
  amount: number;
  size?: "sm" | "md" | "lg" | "xl";
  /** Animate a count-up on mount. */
  countUp?: boolean;
  /** Currency symbol. Default "¥". */
  currency?: string;
  tone?: "on-dark" | "accent";
}

export function PriceTag(props: PriceTagProps): React.ReactElement;
