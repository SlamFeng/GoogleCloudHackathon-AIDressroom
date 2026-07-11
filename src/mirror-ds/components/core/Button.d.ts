import * as React from "react";

/**
 * Fashini Mirror action button. The cobalt accent is reserved for the
 * `primary` variant; `glass` / `ghost` / `text` are the neutral options on
 * the dark surface.
 *
 * @startingPoint section="Core" subtitle="Primary / glass / ghost / text buttons on dark" viewport="700x150"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual weight. Only `primary` uses cobalt. */
  variant?: "primary" | "glass" | "ghost" | "text";
  /** Control height. `lg` (64px) for mirror primary actions. */
  size?: "sm" | "md" | "lg";
  /** Full-width. */
  block?: boolean;
  /** Leading icon node. */
  icon?: React.ReactNode;
  /** Trailing icon node — use for the "→" forward affordance. */
  iconRight?: React.ReactNode;
  children?: React.ReactNode;
}

export function Button(props: ButtonProps): React.ReactElement;
