import { randomUUID } from "node:crypto";
import { Router, type Response } from "express";
import {
  agentChatSchema,
  confirmPayloadSchema,
  feedbackPayloadSchema,
  previewStatusPayloadSchema,
  previewTryonSchema,
  startAgentSessionSchema
} from "./contracts.js";
import { AgentAdkRuntime, redactSensitive, serializeAdkRun } from "./adk-runtime.js";
import { AgentSessionStore } from "./session-store.js";
import type { AgentState } from "./state.js";

const router = Router();
const runtime = new AgentAdkRuntime();
const sessions = new Map<string, AgentState>();
const adkSessionIds = new Map<string, string>();
const sessionStore = new AgentSessionStore();
const restoreReady = restorePersistedSessions();

router.use(async (_request, response, next) => {
  try {
    await restoreReady;
    next();
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : "failed to restore persisted agent sessions"
    });
  }
});

router.post("/sessions", async (request, response) => {
  const parsed = startAgentSessionSchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    response.status(400).json({
      error: parsed.error.issues[0]?.message ?? "agent session payload is invalid"
    });
    return;
  }

  try {
    const run = await runtime.start(parsed.data);
    rememberRun(run.result.state.session_id, run.adk_session.session_id, run.result.state, run.result.output);
    response.status(201).json(serializeAdkRun(run));
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : "failed to start ADK agent session"
    });
  }
});

router.get("/sessions/:sessionId", (request, response) => {
  const state = sessions.get(request.params.sessionId);
  if (!state) {
    response.status(404).json({ error: "agent session not found" });
    return;
  }
  response.json({ state });
});

router.post("/sessions/:sessionId/chat", async (request, response) => {
  const parsed = agentChatSchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    response.status(400).json({
      error: parsed.error.issues[0]?.message ?? "chat payload is invalid"
    });
    return;
  }

  await runAdkCommand(request.params.sessionId, "chat", parsed.data, requestOrigin(request), response);
});

router.post("/sessions/:sessionId/preview", async (request, response) => {
  const parsed = previewTryonSchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    response.status(400).json({
      error: parsed.error.issues[0]?.message ?? "preview payload is invalid"
    });
    return;
  }

  await runAdkCommand(request.params.sessionId, "preview", parsed.data, requestOrigin(request), response);
});

router.post("/sessions/:sessionId/preview/status", async (request, response) => {
  const parsed = previewStatusPayloadSchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    response.status(400).json({
      error: parsed.error.issues[0]?.message ?? "preview status payload is invalid"
    });
    return;
  }

  await runAdkCommand(request.params.sessionId, "preview_status", parsed.data, requestOrigin(request), response);
});

router.post("/sessions/:sessionId/feedback", async (request, response) => {
  const parsed = feedbackPayloadSchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    response.status(400).json({
      error: parsed.error.issues[0]?.message ?? "feedback payload is invalid"
    });
    return;
  }

  await runAdkCommand(request.params.sessionId, "feedback", parsed.data, requestOrigin(request), response);
});

router.post("/sessions/:sessionId/confirm", async (request, response) => {
  const parsed = confirmPayloadSchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    response.status(400).json({
      error: parsed.error.issues[0]?.message ?? "confirm payload is invalid"
    });
    return;
  }

  await runAdkCommand(request.params.sessionId, "confirm", parsed.data, requestOrigin(request), response);
});

router.get("/tool-calls", (_request, response) => {
  response.json({
    tool_calls: Array.from(sessions.values()).flatMap((state) =>
      state.tool_calls.map((call) => ({
        trace_id: `trace_${randomUUID().slice(0, 8)}`,
        session_id: state.session_id,
        ...call
      }))
    )
  });
});

export const agentRouter = router;
export const agentSessions = sessions;

async function runAdkCommand(
  agentSessionId: string,
  action: "chat" | "preview" | "preview_status" | "feedback" | "confirm",
  payload: unknown,
  origin: string | undefined,
  response: Response
) {
  const adkSessionId = adkSessionIds.get(agentSessionId);
  if (!adkSessionId) {
    response.status(404).json({ error: "agent session not found" });
    return;
  }

  try {
    const run = await runtime.run(adkSessionId, { action, payload, requestContext: { origin } });
    rememberRun(run.result.state.session_id, adkSessionId, run.result.state, run.result.output);
    response.json(serializeAdkRun(run));
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : `failed to run ADK agent action ${action}`
    });
  }
}

function requestOrigin(request: { get(name: string): string | undefined }) {
  return request.get("origin");
}

function rememberRun(
  agentSessionId: string,
  adkSessionId: string,
  state: AgentState,
  lastOutput?: Record<string, unknown>
) {
  sessions.set(agentSessionId, state);
  adkSessionIds.set(agentSessionId, adkSessionId);
  sessionStore.saveSession({
    agentSessionId,
    adkSessionId,
    state,
    lastOutput: redactSensitive(lastOutput)
  });
}

async function restorePersistedSessions() {
  const persisted = sessionStore.load();
  for (const session of persisted) {
    sessions.set(session.agent_session_id, session.state);
    adkSessionIds.set(session.agent_session_id, session.adk_session_id);
    await runtime.restoreSession({
      adkSessionId: session.adk_session_id,
      state: session.state,
      lastOutput: session.last_output
    });
  }
}
