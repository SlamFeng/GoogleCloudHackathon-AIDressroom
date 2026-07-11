import * as React from "react";

export type SegOption = string | { value: string; label: string };

/**
 * Segmented single-select on dark glass. Active segment fills cobalt.
 */
export interface SegmentedControlProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  options: SegOption[];
  value: string;
  onChange?: (value: string) => void;
  size?: "sm" | "md" | "lg";
}

export function SegmentedControl(props: SegmentedControlProps): React.ReactElement;
