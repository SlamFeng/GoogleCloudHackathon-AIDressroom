import * as React from "react";
import { FeedbackTag } from "../forms/FeedbackTags";

export interface LookItem {
  id?: string;
  name?: string;
  /** Category / meta line under the name (e.g. "外套"). */
  category?: string;
  /** Catalog thumbnail. Falls back to a dominant-colour glass tile. */
  imageUrl?: string;
  /** Dominant colour of the garment, used for the fallback tile. */
  colorHex?: string;
  price_yen?: number;
}

export interface Look {
  id?: string;
  recType?: "explicit_need" | "similar" | "style" | "seasonal";
  /** Override the rec-type label text. */
  recLabel?: string;
  /** Total ¥. If omitted, summed from items[].price_yen. */
  totalYen?: number;
  items?: LookItem[];
}

/**
 * LookStrip — the compact three-looks strip: number tabs 1·2·3 (finger-count
 * maps here, with a dwell ring), one active look (rec-type, ¥ total, garment
 * thumbnails, Try it on / Choose), and feedback chips. A slim bottom panel so
 * the reflection dominates.
 *
 * @startingPoint section="Mirror" subtitle="Compact three-looks strip with number tabs + feedback" viewport="440x520"
 */
export interface LookStripProps extends React.HTMLAttributes<HTMLDivElement> {
  looks: Look[];
  activeIndex?: number;
  onSelect?: (index: number) => void;
  /** 0-based tab currently being armed by a held finger count (dwell ring). */
  armedIndex?: number | null;
  dwellMs?: number;
  /** Show the Try-on / Choose buttons + feedback chips (touch). When false,
   *  gestures drive those (👍 try on, ✊ back) and the garments get the space. */
  showActions?: boolean;
  onTryOn?: (look: Look, index: number) => void;
  onChoose?: (look: Look, index: number) => void;
  onFeedback?: (tag: FeedbackTag) => void;
  disabled?: boolean;
  hint?: string;
}

export function LookStrip(props: LookStripProps): React.ReactElement;
