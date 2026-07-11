import * as React from "react";

/**
 * Stepper — big numeric value with −/+ glass buttons and a trailing unit.
 * The hands-easy alternative to a text field for height / weight.
 */
export interface StepperProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value: number;
  onChange?: (value: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
}

export function Stepper(props: StepperProps): React.ReactElement;
