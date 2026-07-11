import * as React from "react";

/**
 * Uppercase micro-label with wide tracking — step markers and eyebrows.
 * `tone="accent"` is one of the few sanctioned uses of cobalt.
 */
export interface MicroLabelProps extends React.HTMLAttributes<HTMLElement> {
  tone?: "muted" | "accent" | "on-dark";
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export function MicroLabel(props: MicroLabelProps): React.ReactElement;
