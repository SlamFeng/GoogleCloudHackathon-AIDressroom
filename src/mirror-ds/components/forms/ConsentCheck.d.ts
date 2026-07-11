import * as React from "react";

/**
 * ConsentCheck — a single graceful consent row; the tick fills cobalt when
 * agreed. This is the tap that turns the live camera on.
 */
export interface ConsentCheckProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  children?: React.ReactNode;
}

export function ConsentCheck(props: ConsentCheckProps): React.ReactElement;
