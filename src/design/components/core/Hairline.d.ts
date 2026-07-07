import * as React from "react";

/**
 * A crisp 1px hairline rule — the primary structural divider, used instead
 * of shadows or heavy borders.
 */
export interface HairlineProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render as a vertical divider. */
  vertical?: boolean;
  /** Inset (px) from the perpendicular edges. */
  inset?: number;
}

export function Hairline(props: HairlineProps): React.ReactElement;
