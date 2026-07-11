import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
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

// The persisted file is a demo-restore convenience, not a database. Cap how many
// sessions it keeps so it can't grow without bound (it had reached ~1MB, and it
// used to be synchronously re-read + fully rewritten on EVERY agent turn).
const MAX_PERSISTED_SESSIONS = Number(process.env.AGENT_SESSION_STORE_MAX) || 50;

export class AgentSessionStore {
  readonly filePath: string;
  private cache: Map<string, PersistedAgentSession> | null = null;
  private writeChain: Promise<void> = Promise.resolve();

  constructor(filePath = process.env.AGENT_SESSION_STORE_PATH ?? defaultStorePath) {
    this.filePath = resolve(process.cwd(), filePath);
  }

  load(): PersistedAgentSession[] {
    return [...this.ensureCache().values()];
  }

  saveSession(input: {
    agentSessionId: string;
    adkSessionId: string;
    state: AgentState;
    lastOutput?: Record<string, unknown>;
  }) {
    const cache = this.ensureCache();
    cache.set(input.agentSessionId, {
      agent_session_id: input.agentSessionId,
      adk_session_id: input.adkSessionId,
      state: input.state,
      last_output: input.lastOutput,
      updated_at: new Date().toISOString()
    });
    this.prune(cache);
    this.scheduleWrite();
  }

  /** Disk is read once (startup); afterwards the in-memory map is authoritative. */
  private ensureCache(): Map<string, PersistedAgentSession> {
    if (this.cache) return this.cache;
    this.cache = new Map();
    try {
      const raw = readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as PersistedAgentSessionFile;
      if (parsed.version === 1 && Array.isArray(parsed.sessions)) {
        for (const session of parsed.sessions) this.cache.set(session.agent_session_id, session);
        this.prune(this.cache);
      }
    } catch {
      // Missing or corrupt file → start fresh.
    }
    return this.cache;
  }

  /** Keep only the most recently updated sessions. */
  private prune(cache: Map<string, PersistedAgentSession>) {
    if (cache.size <= MAX_PERSISTED_SESSIONS) return;
    const oldestFirst = [...cache.values()].sort((a, b) => a.updated_at.localeCompare(b.updated_at));
    for (const session of oldestFirst.slice(0, cache.size - MAX_PERSISTED_SESSIONS)) {
      cache.delete(session.agent_session_id);
    }
  }

  /**
   * Serialized async writes: turns never block on disk I/O (the old version did
   * a synchronous full-file read+rewrite on every turn, stalling the event loop
   * for all concurrent requests), and chained writes can't interleave.
   */
  private scheduleWrite() {
    this.writeChain = this.writeChain
      .then(() => this.write())
      .catch((error) => {
        console.error(
          "agent session store write failed:",
          error instanceof Error ? error.message : error
        );
      });
  }

  private async write() {
    const sessions = [...this.ensureCache().values()];
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(
      this.filePath,
      JSON.stringify({ version: 1, sessions } satisfies PersistedAgentSessionFile, null, 2)
    );
  }
}
