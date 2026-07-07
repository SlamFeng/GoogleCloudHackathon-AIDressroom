import * as React from "react";

export type SegmentOption = string | { value: string; label: React.ReactNode };

/**
 * Segmented single-select. Active segment fills cobalt. For gender
 * presentation, age range, and other discrete picks.
 */
export interface SegmentedControlProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  options: SegmentOption[];
  value: string;
  onChange?: (value: string) => void;
  size?: "sm" | "md" | "lg";
}

export function SegmentedControl(props: SegmentedControlProps): React.ReactElement;
