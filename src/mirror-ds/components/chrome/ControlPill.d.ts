import * as React from "react";

/**
 * ControlPill — a tiny glass pill for the top controls (back, camera source,
 * gestures, fit, mute). Icon-only by default; `active` lights it cobalt.
 */
export interface ControlPillProps extends React.HTMLAttributes<HTMLElement> {
  icon?: React.ReactNode;
  label?: string;
  active?: boolean;
  as?: keyof JSX.IntrinsicElements;
}

export function ControlPill(props: ControlPillProps): React.ReactElement;
