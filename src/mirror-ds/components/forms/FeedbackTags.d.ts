import * as React from "react";

export type FeedbackDimension = "color" | "fit" | "style" | "price" | "overall";
export interface FeedbackTag { dimension: FeedbackDimension; label: string; }

/**
 * Structured feedback quick-tags on the mirror (color / fit / style / price /
 * reject) — the taps that drive Fashini's re-recommend loop.
 */
export interface FeedbackTagsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  tags?: FeedbackTag[];
  onSelect?: (tag: FeedbackTag) => void;
  active?: FeedbackDimension;
  disabled?: boolean;
}

export function FeedbackTags(props: FeedbackTagsProps): React.ReactElement;
