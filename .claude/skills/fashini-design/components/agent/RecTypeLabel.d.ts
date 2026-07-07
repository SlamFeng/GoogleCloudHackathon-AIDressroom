import * as React from "react";

export type RecommendationType = "explicit_need" | "similar" | "style" | "seasonal";

/**
 * The cobalt rec-type label on a recommendation set — one of the few
 * accent-colored elements. Bind to `RecommendationSet.rec_type`.
 */
export interface RecTypeLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  recType: RecommendationType | string;
}

export function RecTypeLabel(props: RecTypeLabelProps): React.ReactElement;
