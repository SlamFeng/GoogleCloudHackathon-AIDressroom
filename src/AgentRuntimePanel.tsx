import { useMemo, useState } from "react";
import {
  confirmAgentSelection,
  createAgentSession,
  recordPreviewStatus,
  requestRealtimePreview,
  sendAgentChat,
  sendAgentFeedback,
  type AgentRunResponse,
  type AhaDemoState,
  type FeedbackDimension,
  type LucyRealtimeTryonPayload,
  type RecommendationSet,
  type ToolCallRecord
} from "./api";
import type { AnalysisHandoff } from "./types";
import { useLucyRealtimeTryon } from "./useLucyRealtimeTryon";

const defaultCustomerNeed = "没什么想法，请根据我当前穿搭推荐三套适合我的衣服。";

const feedbackActions: Array<{
  label: string;
  dimension: FeedbackDimension;
  dimensionValue: string;
  voice: string;
}> = [
  {
    label: "Color",
    dimension: "color",
    dimensionValue: "red",
    voice: "颜色不喜欢，避开这个颜色。"
  },
  {
    label: "Fit",
    dimension: "fit",
    dimensionValue: "too_loose",
    voice: "版型太宽松了，换更利落一点。"
  },
  {
    label: "Style",
    dimension: "style",
    dimensionValue: "too_formal",
    voice: "这套太正式了，换休闲一点。"
  },
  {
    label: "Price",
    dimension: "price",
    dimensionValue: "lower_price",
    voice: "价格有点高，换预算更低的。"
  },
  {
    label: "All",
    dimension: "overall",
    dimensionValue: "reject_all",
    voice: "都不喜欢，换一组。"
  }
];

export function AgentRuntimePanel({ analysis }: { analysis: AnalysisHandoff }) {
  const [run, setRun] = useState<AgentRunResponse | null>(null);
  const [customerNeed, setCustomerNeed] = useState(defaultCustomerNeed);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [lastPreviewPayload, setLastPreviewPayload] = useState<LucyRealtimeTryonPayload | null>(
    null
  );
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lucy = useLucyRealtimeTryon();

  const agentSessionId = run?.state.session_id ?? null;
  const recommendationSets = run?.state.recommendation_sets ?? [];
  const ahaDemo = run?.state.aha_demo ?? null;
  const adkEvents = run?.adk_events ?? [];
  const toolCalls = run?.state.tool_calls ?? [];
  const outputType = run?.output.type ?? "none";
  const selectedSet = useMemo(
    () => recommendationSets.find((set) => set.set_id === selectedSetId) ?? recommendationSets[0],
    [recommendationSets, selectedSetId]
  );
  const latestAdkEvent = adkEvents.at(-1);

  async function execute(label: string, action: () => Promise<void>) {
    setBusyAction(label);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `${label} failed`);
    } finally {
      setBusyAction(null);
    }
  }

  async function ensureAgentSession() {
    if (agentSessionId) return agentSessionId;
    const response = await createAgentSession(analysis);
    applyRun(response);
    return response.state.session_id;
  }

  function applyRun(response: AgentRunResponse) {
    setRun(response);
    const outputSetId =
      response.output.type === "recommendations" ||
      response.output.type === "recommendations_refined"
        ? response.output.recommendation.sets[0]?.set_id
        : response.output.type === "realtime_tryon_payload"
          ? response.output.payload.set_id
          : response.output.type === "tryon_handoff"
            ? response.output.handoff.set_id
            : response.output.type === "confirmed"
              ? response.output.set_id
              : undefined;
    const knownSetId = response.state.recommendation_sets[0]?.set_id;
    setSelectedSetId((current) => outputSetId ?? current ?? knownSetId ?? null);
  }

  return (
    <section className="agent-panel" aria-label="Agent runtime">
      <div className="agent-panel-header">
        <div>
          <p className="step-label">ADK RUNTIME</p>
          <h3>Sales Agent control plane</h3>
        </div>
        <div className="agent-status-grid">
          <RuntimeBadge label="agent" value={run?.state.status ?? "not started"} />
          <RuntimeBadge label="route" value={run?.state.route ?? "unclear"} />
          <RuntimeBadge label="lucy" value={run?.state.lucy_session_status ?? lucy.status} />
          <RuntimeBadge label="round" value={String(run?.state.recommendation_round ?? 0)} />
        </div>
      </div>

      <AhaTimeline
        aha={ahaDemo}
        lucyStatus={run?.state.lucy_session_status ?? lucy.status}
        outputType={outputType}
      />

      <div className="agent-command-row">
        <button
          className="secondary-button"
          disabled={busyAction !== null || Boolean(agentSessionId)}
          onClick={() =>
            void execute("start_agent", async () => {
              const response = await createAgentSession(analysis);
              applyRun(response);
            })
          }
        >
          Start Agent
        </button>
        <input
          value={customerNeed}
          onChange={(event) => setCustomerNeed(event.target.value)}
          aria-label="Customer need"
        />
        <button
          className="primary-button"
          disabled={busyAction !== null || customerNeed.trim().length === 0}
          onClick={() =>
            void execute("ask_recommendation", async () => {
              const sessionId = await ensureAgentSession();
              const response = await sendAgentChat(sessionId, customerNeed.trim());
              applyRun(response);
            })
          }
        >
          Recommend
        </button>
      </div>

      {error && <div className="agent-error">{error}</div>}

      <div className="agent-runtime-grid">
        <div className="recommendation-list">
          {recommendationSets.length === 0 ? (
            <div className="empty-recommendations">No recommendation sets yet.</div>
          ) : (
            recommendationSets.map((set) => (
              <RecommendationCard
                key={set.set_id}
                set={set}
                selected={set.set_id === selectedSet?.set_id}
                onSelect={() => setSelectedSetId(set.set_id)}
              />
            ))
          )}
        </div>

        <div className="tryon-console">
          <div className="tryon-toolbar">
            <div>
              <span>Selected set</span>
              <strong>{selectedSet?.set_id ?? "none"}</strong>
            </div>
            <button
              className="secondary-button"
              disabled={!agentSessionId || !selectedSet || busyAction !== null}
              onClick={() =>
                void execute("lucy_preview", async () => {
                  if (!agentSessionId || !selectedSet) return;
                  const response = await requestRealtimePreview(agentSessionId, selectedSet.set_id);
                  applyRun(response);
                  if (response.output.type !== "realtime_tryon_payload") return;
                  setLastPreviewPayload(response.output.payload);
                  await lucy.start({
                    payload: response.output.payload,
                    onStatusChange: async (statusPayload) => {
                      const statusResponse = await recordPreviewStatus(agentSessionId, statusPayload);
                      applyRun(statusResponse);
                    }
                  });
                })
              }
            >
              Realtime preview
            </button>
            <button
              className="secondary-button"
              disabled={lucy.status === "idle" || lucy.status === "stopped"}
              onClick={() =>
                void execute("stop_lucy_preview", async () => {
                  const reason = lucy.stop("manual_stop");
                  if (!agentSessionId) return;
                  const response = await recordPreviewStatus(agentSessionId, {
                    status: "stopped",
                    reason
                  });
                  applyRun(response);
                })
              }
            >
              Stop
            </button>
          </div>

          <div className="tryon-stage">
            <div className="video-frame output">
              <video ref={lucy.remoteVideoRef} autoPlay playsInline muted />
              {(!lastPreviewPayload?.configured || lucy.status === "idle") && (
                <div className="mock-preview-surface">
                  <strong>{lastPreviewPayload ? "Mock realtime preview" : "Ready for preview"}</strong>
                  <span>
                    {lastPreviewPayload
                      ? "Lucy API key not configured locally"
                      : "Waiting for selected outfit"}
                  </span>
                </div>
              )}
              <span>Lucy output</span>
            </div>
            <div className="video-frame input">
              <video ref={lucy.localVideoRef} autoPlay playsInline muted />
              <span>Camera</span>
            </div>
          </div>

          <div className="tryon-meta">
            <RuntimeBadge label="connection" value={lucy.connectionState ?? "idle"} />
            <RuntimeBadge label="model" value={lastPreviewPayload?.model ?? "lucy-vton-3"} />
            <RuntimeBadge
              label="token"
              value={lastPreviewPayload ? (lastPreviewPayload.configured ? "live" : "mock") : "none"}
            />
          </div>
          {lastPreviewPayload?.warnings.map((warning) => (
            <div className="agent-warning" key={warning}>
              {warning}
            </div>
          ))}
          {lucy.error && <div className="agent-error">{lucy.error}</div>}
        </div>
      </div>

      <div className="agent-feedback-row">
        <div className="feedback-buttons" aria-label="Feedback controls">
          {feedbackActions.map((action) => (
            <button
              key={action.label}
              className="secondary-button"
              disabled={!agentSessionId || !selectedSet || busyAction !== null}
              onClick={() =>
                void execute(`feedback_${action.dimension}`, async () => {
                  if (!agentSessionId || !selectedSet) return;
                  const response = await sendAgentFeedback(agentSessionId, {
                    set_id: selectedSet.set_id,
                    feedback_type: action.dimension === "overall" ? "reject_all" : "partial_adjust",
                    dimension: action.dimension,
                    dimension_value: action.dimensionValue,
                    raw_voice_text: action.voice
                  });
                  applyRun(response);
                })
              }
            >
              {action.label}
            </button>
          ))}
        </div>
        <button
          className="primary-button"
          disabled={!agentSessionId || !selectedSet || busyAction !== null}
          onClick={() =>
            void execute("confirm_selection", async () => {
              if (!agentSessionId || !selectedSet) return;
              const response = await confirmAgentSelection(agentSessionId, {
                set_id: selectedSet.set_id,
                camera_processing_consent: lastPreviewPayload?.configured ?? false,
                face_profile_consent: false
              });
              applyRun(response);
            })
          }
        >
          Confirm handoff
        </button>
      </div>

      <RuntimeTrace
        adkEvents={adkEvents}
        latestAdkEventAuthor={latestAdkEvent?.author ?? "none"}
        outputType={outputType}
        toolCalls={toolCalls}
      />
    </section>
  );
}

function AhaTimeline({
  aha,
  lucyStatus,
  outputType
}: {
  aha: AhaDemoState | null;
  lucyStatus: string;
  outputType: string;
}) {
  const steps = [
    {
      key: "lucy_preview",
      label: "Lucy realtime",
      value: lucyStatus,
      active: aha?.stage === "lucy_preview"
    },
    {
      key: "google_fallback",
      label: "Google fallback",
      value: aha?.google_generation_status ?? "idle",
      active:
        aha?.stage === "google_generating" ||
        aha?.stage === "google_ready" ||
        aha?.google_generation_status === "queued" ||
        aha?.google_generation_status === "generating" ||
        aha?.google_generation_status === "ready"
    },
    {
      key: "handoff",
      label: "Try-on handoff",
      value: outputType,
      active: aha?.stage === "handoff_ready"
    }
  ];

  return (
    <div className="aha-demo-rail">
      <div className="aha-demo-copy">
        <span>AHA DEMO</span>
        <strong>{aha?.stage.replaceAll("_", " ") ?? "idle"}</strong>
        <p>{aha?.narrative ?? "Agent runtime is waiting for the first customer action."}</p>
      </div>
      <div className="aha-demo-steps">
        {steps.map((step) => (
          <div key={step.key} className={step.active ? "aha-step active" : "aha-step"}>
            <span>{step.label}</span>
            <strong>{step.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function RuntimeTrace({
  adkEvents,
  latestAdkEventAuthor,
  outputType,
  toolCalls
}: {
  adkEvents: NonNullable<AgentRunResponse["adk_events"]>;
  latestAdkEventAuthor: string;
  outputType: string;
  toolCalls: ToolCallRecord[];
}) {
  const latestToolCalls = toolCalls.slice(-6);
  const latestEvents = adkEvents.slice(-3);
  return (
    <div className="agent-trace">
      <div className="trace-head">
        <RuntimeBadge label="ADK author" value={latestAdkEventAuthor} />
        <RuntimeBadge label="output" value={outputType} />
        <RuntimeBadge label="events" value={String(adkEvents.length)} />
        <RuntimeBadge label="tools" value={String(toolCalls.length)} />
      </div>
      <div className="trace-grid">
        <div className="trace-column">
          <span>TOOL CALLS</span>
          {latestToolCalls.length === 0 ? (
            <code>none</code>
          ) : (
            latestToolCalls.map((call) => (
              <code key={`${call.tool}_${call.called_at}`}>
                {call.tool} · {new Date(call.called_at).toLocaleTimeString()}
              </code>
            ))
          )}
        </div>
        <div className="trace-column">
          <span>ADK EVENTS</span>
          {latestEvents.length === 0 ? (
            <code>none</code>
          ) : (
            latestEvents.map((event) => (
              <code key={event.invocation_id ?? event.id}>
                {event.author} · {event.state_delta_keys.join(",") || "no_delta"}
              </code>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function RuntimeBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="runtime-badge">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RecommendationCard({
  set,
  selected,
  onSelect
}: {
  set: RecommendationSet;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={selected ? "recommendation-card selected" : "recommendation-card"}
      onClick={onSelect}
    >
      <div className="recommendation-card-head">
        <span>{set.rec_type.replaceAll("_", " ")}</span>
        <strong>Round {set.round}</strong>
      </div>
      <p>{set.reason}</p>
      <div className="product-strip">
        {set.products.map((product) => (
          <div key={product.product_id}>
            <strong>{product.name}</strong>
            <span>
              ¥{product.price_yen.toLocaleString()} · {product.colors.join("/")}
            </span>
          </div>
        ))}
      </div>
    </button>
  );
}
