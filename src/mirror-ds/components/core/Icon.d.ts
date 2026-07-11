import * as React from "react";

/**
 * The Fashini Mirror icon set — crafted 24×24, 2px-stroke, round-cap SVG glyphs
 * on currentColor. Includes the hands-free gesture glyphs: `hand` (✋ talk),
 * `thumbs-up` (👍 confirm), `fist` (✊ back).
 *
 * Names: arrow-left · arrow-right · camera · hand · thumbs-up · fist · expand ·
 * volume · volume-x · mic · check · ruler · scale · user · calendar.
 *
 * @startingPoint section="Core" subtitle="Crafted 2px-stroke SVG icon set + gesture glyphs" viewport="700x150"
 */
export interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  name:
    | "arrow-left" | "arrow-right" | "camera" | "hand" | "thumbs-up" | "fist"
    | "expand" | "volume" | "volume-x" | "mic" | "check" | "ruler" | "scale"
    | "user" | "calendar";
  /** Pixel box size. Default 20. */
  size?: number;
  /** Stroke width. Default 2. */
  stroke?: number;
}

export function Icon(props: IconProps): React.ReactElement;
export const iconNames: string[];
