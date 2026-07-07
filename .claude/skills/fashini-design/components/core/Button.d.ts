import * as React from "react";

/**
 * Fashini primary action button. The cobalt accent is reserved for the
 * `primary` variant; use `secondary`/`ghost`/`text` for everything else.
 *
 * @startingPoint section="Core" subtitle="Primary / secondary / ghost / text buttons" viewport="700x150"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual weight. Only `primary` uses cobalt. */
  variant?: "primary" | "secondary" | "ghost" | "text";
  /** Control height. `lg` for mirror / big-screen touch targets. */
  size?: "sm" | "md" | "lg";
  /** Full-width. */
  block?: boolean;
  /** Leading icon node (e.g. a Lucide <i data-lucide>). */
  icon?: React.ReactNode;
  /** Trailing icon node — use for the "→" forward affordance. */
  iconRight?: React.ReactNode;
  children?: React.ReactNode;
}

export function Button(props: ButtonProps): React.ReactElement;
