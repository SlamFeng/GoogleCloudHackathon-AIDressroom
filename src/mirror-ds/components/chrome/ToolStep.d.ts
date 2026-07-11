import * as React from "react";

/**
 * ToolStep — one designed "working" step: cobalt spinner while running, cobalt
 * check when done, with a human label. Stack several as the agent works.
 */
export interface ToolStepProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  done?: boolean;
  /** Position in the stack — drives the staggered entrance delay. */
  index?: number;
}

export function ToolStep(props: ToolStepProps): React.ReactElement;
