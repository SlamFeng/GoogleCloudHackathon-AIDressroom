import * as React from "react";

export type ToolTone = "ok" | "held" | "failed" | "neutral";

/**
 * Small pill for tool-call status. `held` is the only accent-colored
 * status; `ok`/`failed`/`neutral` stay in the semantic (non-accent) set.
 */
export interface ToolStatusChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: ToolTone;
  /** Override the displayed text (defaults to the status word). */
  label?: string;
}

export function ToolStatusChip(props: ToolStatusChipProps): React.ReactElement;

/** Maps a ToolCallRecord.output object to a tone (mirrors source logic). */
export function toolTone(output: Record<string, unknown>): ToolTone;
