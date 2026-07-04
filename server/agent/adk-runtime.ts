import {
  BaseAgent,
  InMemoryRunner,
  createEvent,
  createEventActions,
  stringifyContent,
  type Event,
  type InvocationContext
} from "@google/adk";
import type { Content } from "@google/genai";
import type { AgentState } from "./state.js";
import { AgentWorkflow, type WorkflowResult } from "./workflow.js";
import {
  agentChatSchema,
  confirmPayloadSchema,
  feedbackPayloadSchema,
  previewStatusPayloadSchema,
  previewTryonSchema,
  purchasePayloadSchema,
  startAgentSessionSchema
} from "./contracts.js";

const appName = "aida_agent_foundation";
const userId = "local_demo_user";

type AgentCommand =
  | { action: "start"; payload: unknown; requestContext?: Record<string, unknown> }
  | { action: "chat"; payload: unknown; requestContext?: Record<string, unknown> }
  | { action: "preview"; payload: unknown; requestContext?: Record<string, unknown> }
  | { action: "preview_status"; payload: unknown; requestContext?: Record<string, unknown> }
  | { action: "feedback"; payload: unknown; requestContext?: Record<string, unknown> }
  | { action: "confirm"; payload: unknown; requestContext?: Record<string, unknown> }
  | { action: "purchase"; payload: unknown; requestContext?: Record<string, unknown> };

export interface AdkRunResult {
  result: WorkflowResult;
  events: Event[];
  adk_session: {
    app_name: string;
    user_id: string;
    session_id: string;
    event_count: number;
  };
}

class DressroomWorkflowAgent extends BaseAgent {
  private readonly fullResultsByInvocation = new Map<string, WorkflowResult>();

  constructor(readonly workflow: AgentWorkflow) {
    super({
      name: "dressroom_workflow_agent",
      description:
        "Runs the deterministic AI dressroom sales workflow inside Google ADK Runner."
    });
  }

  protected async *runAsyncImpl(context: InvocationContext): AsyncGenerator<Event, void, void> {
    const command = parseCommand(context.userContent);
    const currentState = context.session.state.agent_state as AgentState | undefined;
    const result = await this.runCommand(command, currentState);
    this.fullResultsByInvocation.set(context.invocationId, result);
    const redactedOutput = redactSensitive(result.output);

    yield createEvent({
      invocationId: context.invocationId,
      author: this.name,
      content: {
        role: "model",
        parts: [
          {
            text: JSON.stringify(redactedOutput)
          }
        ]
      },
      actions: createEventActions({
        stateDelta: {
          agent_state: result.state,
          last_agent_output: redactedOutput
        }
      })
    });
  }

  protected async *runLiveImpl(context: InvocationContext): AsyncGenerator<Event, void, void> {
    yield* this.runAsyncImpl(context);
  }

  private async runCommand(command: AgentCommand, state?: AgentState): Promise<WorkflowResult> {
    if (command.action === "start") {
      const parsed = startAgentSessionSchema.parse(command.payload ?? {});
      const nextState = this.workflow.startSession(parsed);
      return {
        state: nextState,
        output: {
          type: "agent_session_started",
          session_id: nextState.session_id
        }
      };
    }

    if (!state) {
      throw new Error(`agent_state is required before ${command.action}`);
    }

    if (command.action === "chat") {
      const parsed = agentChatSchema.parse(command.payload ?? {});
      return this.workflow.handleCustomerInput(state, parsed.text);
    }
    if (command.action === "preview") {
      const parsed = previewTryonSchema.parse(command.payload ?? {});
      return this.workflow.previewRealtimeTryon(state, parsed, {
        origin: typeof command.requestContext?.origin === "string" ? command.requestContext.origin : undefined
      });
    }
    if (command.action === "preview_status") {
      const parsed = previewStatusPayloadSchema.parse(command.payload ?? {});
      return this.workflow.recordPreviewStatus(state, parsed);
    }
    if (command.action === "feedback") {
      const parsed = feedbackPayloadSchema.parse(command.payload ?? {});
      return this.workflow.applyFeedback(state, parsed);
    }
    if (command.action === "purchase") {
      purchasePayloadSchema.parse(command.payload ?? {});
      return this.workflow.purchaseSelected(state);
    }

    const parsed = confirmPayloadSchema.parse(command.payload ?? {});
    return this.workflow.confirmAndHandoff(state, parsed, {
      origin: typeof command.requestContext?.origin === "string" ? command.requestContext.origin : undefined
    });
  }

  takeFullResult(invocationIds: string[]): WorkflowResult | undefined {
    for (let index = invocationIds.length - 1; index >= 0; index -= 1) {
      const invocationId = invocationIds[index];
      const result = this.fullResultsByInvocation.get(invocationId);
      if (result) {
        this.fullResultsByInvocation.delete(invocationId);
        return result;
      }
    }
    return undefined;
  }
}

export class AgentAdkRuntime {
  readonly workflow = new AgentWorkflow();
  readonly agent = new DressroomWorkflowAgent(this.workflow);
  readonly runner = new InMemoryRunner({
    appName,
    agent: this.agent
  });

  async start(payload: unknown): Promise<AdkRunResult> {
    const sessionId = `adk_${cryptoRandomSuffix()}`;
    await this.runner.sessionService.createSession({
      appName,
      userId,
      sessionId,
      state: {}
    });
    return this.run(sessionId, { action: "start", payload });
  }

  async run(sessionId: string, command: AgentCommand): Promise<AdkRunResult> {
    const events: Event[] = [];
    for await (const event of this.runner.runAsync({
      userId,
      sessionId,
      newMessage: commandToContent(command)
    })) {
      events.push(event);
    }

    const session = await this.runner.sessionService.getSession({
      appName,
      userId,
      sessionId
    });
    const state = session?.state.agent_state as AgentState | undefined;
    const redactedOutput = session?.state.last_agent_output as Record<string, unknown> | undefined;
    const fullResult = this.agent.takeFullResult(events.map((event) => event.invocationId));
    if (!state || !redactedOutput) {
      throw new Error("ADK session did not produce agent_state and last_agent_output.");
    }

    return {
      result: {
        state,
        output: fullResult?.output ?? redactedOutput
      },
      events,
      adk_session: {
        app_name: appName,
        user_id: userId,
        session_id: sessionId,
        event_count: session?.events.length ?? events.length
      }
    };
  }

  async restoreSession(input: {
    adkSessionId: string;
    state: AgentState;
    lastOutput?: Record<string, unknown>;
  }) {
    await this.runner.sessionService.createSession({
      appName,
      userId,
      sessionId: input.adkSessionId,
      state: {
        agent_state: input.state,
        last_agent_output:
          input.lastOutput ?? {
            type: "restored",
            session_id: input.state.session_id
          }
      }
    });
  }
}

export function serializeAdkRun(run: AdkRunResult) {
  return {
    state: redactSensitive(run.result.state),
    output: run.result.output,
    adk_session: run.adk_session,
    adk_events: run.events.map((event) => ({
      id: event.id,
      invocation_id: event.invocationId,
      author: event.author,
      text: redactSensitiveText(stringifyContent(event)),
      state_delta_keys: Object.keys(event.actions.stateDelta ?? {}),
      timestamp: event.timestamp
    }))
  };
}

function commandToContent(command: AgentCommand): Content {
  return {
    role: "user",
    parts: [
      {
        text: JSON.stringify(command)
      }
    ]
  };
}

function parseCommand(content?: Content): AgentCommand {
  const text = content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  const parsed = JSON.parse(text) as AgentCommand;
  if (!["start", "chat", "preview", "preview_status", "feedback", "confirm", "purchase"].includes(parsed.action)) {
    throw new Error(`Unsupported ADK agent action: ${String(parsed.action)}`);
  }
  return parsed;
}

function cryptoRandomSuffix() {
  return Math.random().toString(16).slice(2, 14);
}

export function redactSensitive<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item)) as T;
  if (!value || typeof value !== "object") return value;
  const redacted: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    redacted[key] = key === "client_token" ? "[redacted]" : redactSensitive(child);
  }
  return redacted as T;
}

function redactSensitiveText(text: string) {
  return text.replace(/"client_token"\s*:\s*"[^"]+"/g, '"client_token":"[redacted]"');
}
