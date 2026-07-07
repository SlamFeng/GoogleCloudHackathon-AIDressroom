import * as React from "react";

/**
 * Standing privacy reassurance chip (dot + line). Fashini surfaces privacy
 * plainly and repeatedly; never hidden.
 */
export interface PrivacyChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
}

export function PrivacyChip(props: PrivacyChipProps): React.ReactElement;
