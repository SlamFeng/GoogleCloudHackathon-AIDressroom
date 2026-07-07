// Structured, one-line-JSON logging. Cloud Run / Cloud Logging parses JSON on
// stdout into structured fields (including `severity`), so each agent turn
// becomes a queryable log entry with route / tool / status / latency.

type Severity = "DEBUG" | "INFO" | "WARNING" | "ERROR";

export interface AgentTurnLog {
  event: string;
  session_id?: string;
  action?: string;
  route?: string;
  status?: string;
  output_type?: string;
  tool?: string;
  tool_status?: string;
  recommendation_round?: number;
  tool_calls?: number;
  latency_ms?: number;
  errors?: string[];
}

export function logAgentTurn(entry: AgentTurnLog, severity: Severity = "INFO") {
  const line = JSON.stringify({
    severity,
    component: "agent",
    ts: new Date().toISOString(),
    ...entry
  });
  if (severity === "ERROR" || severity === "WARNING") console.error(line);
  else console.log(line);
}
