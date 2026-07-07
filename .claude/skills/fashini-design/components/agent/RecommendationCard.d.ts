import * as React from "react";
import type { ProductLike } from "./ProductRow";
import type { RecommendationType } from "./RecTypeLabel";

export interface RecommendationSetLike {
  set_id: string;
  round: number;
  rec_type: RecommendationType | string;
  reason: string;
  products: (ProductLike & { product_id?: string })[];
}

/**
 * Recommendation SET CARD — the centerpiece of the sales console. Header
 * (rec-type + round + set_id), reason, product rows, set total (count-up),
 * and Preview / Confirm actions. Bind to `RecommendationSet`. Materializes
 * on mount; pass `index` for the staggered blur→sharp entrance.
 *
 * @startingPoint section="Agent" subtitle="Recommendation set card with products + actions" viewport="720x520"
 */
export interface RecommendationCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  set: RecommendationSetLike;
  selected?: boolean;
  /** Stagger index for the materialize entrance. */
  index?: number;
  onSelect?: () => void;
  onPreview?: (set: RecommendationSetLike) => void;
  onConfirm?: (set: RecommendationSetLike) => void;
}

export function RecommendationCard(props: RecommendationCardProps): React.ReactElement;
