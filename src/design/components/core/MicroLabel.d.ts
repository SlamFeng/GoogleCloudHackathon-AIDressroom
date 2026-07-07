import * as React from "react";

/**
 * Uppercase micro-label with wide tracking (0.14em). For step markers
 * (`STEP 03 · CAPTURE`), section eyebrows, and code-voice labels.
 */
export interface MicroLabelProps extends React.HTMLAttributes<HTMLElement> {
  /** Text color. `accent` for the rec-type label only. */
  tone?: "muted" | "ink" | "accent";
  /** Element tag to render. */
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export function MicroLabel(props: MicroLabelProps): React.ReactElement;
