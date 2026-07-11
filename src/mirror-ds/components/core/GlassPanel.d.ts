import * as React from "react";

/**
 * GlassPanel — the signature frosted DARK-glass surface that all Fashini Mirror
 * UI floats on, over the live camera reflection.
 *
 * @startingPoint section="Core" subtitle="Frosted dark-glass panel — sheet / card / pill / inset" viewport="700x220"
 */
export interface GlassPanelProps extends React.HTMLAttributes<HTMLElement> {
  /** Depth. `sheet` bottom-anchored, `card` focused, `pill` floating, `inset` a well inside glass. */
  variant?: "sheet" | "card" | "pill" | "inset";
  /** Element tag to render. */
  as?: keyof JSX.IntrinsicElements;
  /** Bright top-edge highlight (light catching the glass). Default true. */
  edge?: boolean;
  children?: React.ReactNode;
}

export function GlassPanel(props: GlassPanelProps): React.ReactElement;
