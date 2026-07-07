import * as React from "react";

/**
 * Labelled runtime badge (caption over a mono value). For agent status,
 * route, round, connection, model — bind to `AgentState`.
 *
 * @startingPoint section="Status" subtitle="Agent status / route / round badges" viewport="700x120"
 */
export interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Uppercase caption, e.g. "agent", "route", "round". */
  label: string;
  /** The value, e.g. AgentState.status / route / recommendation_round. */
  value: string | number;
  /** Highlight in cobalt (active / held state). */
  active?: boolean;
}

export function StatusBadge(props: StatusBadgeProps): React.ReactElement;
