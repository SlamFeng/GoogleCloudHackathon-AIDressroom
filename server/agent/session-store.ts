import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { AgentState } from "./state.js";

export interface PersistedAgentSession {
  agent_session_id: string;
  adk_session_id: string;
  state: AgentState;
  last_output?: Record<string, unknown>;
  updated_at: string;
}

interface PersistedAgentSessionFile {
  version: 1;
  sessions: PersistedAgentSession[];
}

const defaultStorePath = ".aida-agent-sessions.json";

export class AgentSessionStore {
  readonly filePath: string;

  constructor(filePath = process.env.AGENT_SESSION_STORE_PATH ?? defaultStorePath) {
    this.filePath = resolve(process.cwd(), filePath);
  }

  load() {
    try {
      const raw = readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as PersistedAgentSessionFile;
      if (parsed.version !== 1 || !Array.isArray(parsed.sessions)) return [];
      return parsed.sessions;
    } catch {
      return [];
    }
  }

  saveSession(input: {
    agentSessionId: string;
    adkSessionId: string;
    state: AgentState;
    lastOutput?: Record<string, unknown>;
  }) {
    const sessions = this.load().filter(
      (session) => session.agent_session_id !== input.agentSessionId
    );
    sessions.push({
      agent_session_id: input.agentSessionId,
      adk_session_id: input.adkSessionId,
      state: input.state,
      last_output: input.lastOutput,
      updated_at: new Date().toISOString()
    });
    this.write(sessions);
  }

  private write(sessions: PersistedAgentSession[]) {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(
      this.filePath,
      JSON.stringify(
        {
          version: 1,
          sessions
        } satisfies PersistedAgentSessionFile,
        null,
        2
      )
    );
  }
}
