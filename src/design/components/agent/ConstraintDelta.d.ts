import * as React from "react";

export interface AgentConstraintLike {
  dimension: string;
  value: string;
  reason?: string;
}

/**
 * Constraint delta — the demo evidence that feedback updated the agent's
 * constraints (prefer +, avoid −) and re-recommended. Bind to
 * `AgentConstraints`.
 */
export interface ConstraintDeltaProps extends React.HTMLAttributes<HTMLDivElement> {
  prefer?: AgentConstraintLike[];
  avoid?: AgentConstraintLike[];
  /** `constraints.budget_yen`. */
  budgetYen?: number;
}

export function ConstraintDelta(props: ConstraintDeltaProps): React.ReactElement;
