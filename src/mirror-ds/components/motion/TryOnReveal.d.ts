import * as React from "react";

/**
 * TryOnReveal (signature D) — the choreographed full-bleed try-on climax: a
 * light bloom sweeps the reflection, the "you wearing it" view cross-fades in,
 * and a thin cobalt progress ring counts down the render window. Minimal bottom
 * action bar (back / choose). The one allowed full-bleed moment.
 *
 * @startingPoint section="Mirror" subtitle="Full-bleed try-on reveal with progress ring + action bar" viewport="440x780"
 */
export interface TryOnRevealProps extends React.HTMLAttributes<HTMLDivElement> {
  phase?: "revealing" | "active";
  /** The rendered "you wearing it" image; null shows the generating placeholder. */
  imageUrl?: string | null;
  /** Render window in ms (drives the ring). Default 15000. */
  windowMs?: number;
  generating?: boolean;
  recLabel?: string;
  totalYen?: number;
  headline?: string;
  subline?: string;
  showRing?: boolean;
  onBack?: () => void;
  onChoose?: () => void;
}

export function TryOnReveal(props: TryOnRevealProps): React.ReactElement;
