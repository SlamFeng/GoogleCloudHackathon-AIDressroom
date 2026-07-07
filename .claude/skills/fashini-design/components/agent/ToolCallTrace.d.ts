import * as React from "react";

export interface ToolCallRecordLike {
  tool: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  called_at: string;
}

/**
 * Tool-call trace inspector — the demo/judging evidence surface. Numbered
 * rows stream in staggered; each expands to show input/output JSON. Bind to
 * `AgentState.tool_calls` (`ToolCallRecord[]`).
 *
 * @startingPoint section="Agent" subtitle="Streaming tool-call trace with JSON inspector" viewport="720x420"
 */
export interface ToolCallTraceProps extends React.HTMLAttributes<HTMLDivElement> {
  toolCalls?: ToolCallRecordLike[];
  title?: string;
}

export function ToolCallTrace(props: ToolCallTraceProps): React.ReactElement;
