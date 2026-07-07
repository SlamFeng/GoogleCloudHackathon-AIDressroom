import * as React from "react";

/**
 * Square consent checkbox with the brand ✓ mark. Checked fills ink (neutral),
 * not cobalt — consent is not a primary action.
 */
export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "checked"> {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  children?: React.ReactNode;
}

export function Checkbox(props: CheckboxProps): React.ReactElement;
