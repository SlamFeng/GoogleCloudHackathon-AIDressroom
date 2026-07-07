import * as React from "react";

/**
 * Large numeric field with trailing unit — the display value is big and
 * editorial. For height / weight in the profile form.
 */
export interface NumberFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number;
  onChange?: (value: number) => void;
  /** Trailing unit, e.g. "cm" / "kg". */
  unit?: string;
  min?: number;
  max?: number;
}

export function NumberField(props: NumberFieldProps): React.ReactElement;
