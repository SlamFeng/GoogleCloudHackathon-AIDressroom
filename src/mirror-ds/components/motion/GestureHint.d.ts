import * as React from "react";

export interface GestureHintItem { key: string; icon?: string; glyph?: string; label: string; }

/**
 * GestureHint (signature B) — floating glass bubbles teaching the hands-free
 * gestures; the detected gesture lights up cobalt, and they auto-quiet once the
 * customer is confident.
 */
export interface GestureHintProps extends React.HTMLAttributes<HTMLDivElement> {
  hints?: GestureHintItem[];
  /** key of the currently-detected gesture (lights up). */
  active?: string | null;
  /** Fade the whole cluster back once the customer is confident. */
  quiet?: boolean;
}

export function GestureHint(props: GestureHintProps): React.ReactElement;
