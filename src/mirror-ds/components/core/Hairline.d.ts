import * as React from "react";

/**
 * A crisp 1px hairline on the dark glass surface — the primary structural
 * divider, used instead of shadows or heavy borders.
 */
export interface HairlineProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render as a vertical rule (stretches to parent height). */
  vertical?: boolean;
  /** Inset margin in px along the rule's length. */
  inset?: number;
}

export function Hairline(props: HairlineProps): React.ReactElement;
