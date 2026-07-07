import * as React from "react";

export type TryOnPhase = "idle" | "reveal";

/**
 * Realtime try-on stage (Lucy) — the signature climax. A thin accent
 * scan-line sweeps top→bottom, the recommended outfit fills in behind it, a
 * soft fabric shimmer passes, and a "スタイリング完了 / Styled." label rises.
 * Set `phase="reveal"` to play the choreographed sequence. Honors
 * prefers-reduced-motion (shows final state).
 *
 * @startingPoint section="Try-on" subtitle="Scan-line try-on reveal stage" viewport="420x560"
 */
export interface TryOnStageProps extends React.HTMLAttributes<HTMLDivElement> {
  phase?: TryOnPhase;
  /** Current-figure image URL (base layer). */
  baseSrc?: string;
  /** Recommended-look image URL that fills in behind the scan-line. */
  outfitSrc?: string;
  /** Small corner badge, e.g. "Lucy · realtime". */
  badge?: string;
  /** Katakana + latin completion lockup. */
  labelJa?: string;
  labelEn?: string;
  /** Idle-state hint text. */
  idleHint?: string;
  /** Custom figure node (used when no image src given). */
  children?: React.ReactNode;
}

export function TryOnStage(props: TryOnStageProps): React.ReactElement;
