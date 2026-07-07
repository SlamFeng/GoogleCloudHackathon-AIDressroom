import * as React from "react";

export type FeedbackDimension = "color" | "fit" | "style" | "price" | "overall";

export interface FeedbackTag {
  dimension: FeedbackDimension;
  label: string;
}

/**
 * Structured feedback quick-tags (Color / Fit / Style / Price / Reject all).
 * These drive the re-recommendation loop — map the selected tag to a
 * `sendAgentFeedback` call. "Reject all" (`overall`) reads as reject_all.
 */
export interface FeedbackTagsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  tags?: FeedbackTag[];
  onSelect?: (tag: FeedbackTag) => void;
  /** Currently-active dimension. */
  active?: FeedbackDimension;
  disabled?: boolean;
}

export function FeedbackTags(props: FeedbackTagsProps): React.ReactElement;
