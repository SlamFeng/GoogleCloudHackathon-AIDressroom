// Structured, one-line-JSON logging. Cloud Run / Cloud Logging parses JSON on
// stdout into structured fields (including `severity`), so each agent turn
// becomes a queryable log entry with route / tool / status / latency.
//
// Locally we ALSO append each line to a file (AGENT_LOG_FILE, default
// `.aida-agent.log`) so the full turn history survives after the terminal
// scrolls — used to debug what the agent actually did during a session.

import { appendFileSync } from "node:fs";

type Severity = "DEBUG" | "INFO" | "WARNING" | "ERROR";

const LOG_FILE = process.env.AGENT_LOG_FILE ?? ".aida-agent.log";

export interface AgentTurnLog {
  event: string;
  session_id?: string;
  action?: string;
  input_text?: string;
  output_message?: string;
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
  try {
    appendFileSync(LOG_FILE, line + "\n");
  } catch {
    // Never let logging break a turn.
  }
}
