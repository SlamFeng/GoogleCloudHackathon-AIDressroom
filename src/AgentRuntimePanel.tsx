import "./design/screens/console.css";
import { useMemo, useState } from "react";
import {
  confirmAgentSelection,
  createAgentSession,
  recordPreviewStatus,
  requestRealtimePreview,
  sendAgentChat,
  sendAgentFeedback,
  type AgentRunResponse,
  type FeedbackDimension,
  type LucyRealtimeTryonPayload
} from "./api";
import type { AnalysisHandoff } from "./types";
import { useLucyRealtimeTryon } from "./useLucyRealtimeTryon";
import { Button } from "./design/components/core/Button";
import { MicroLabel } from "./design/components/core/MicroLabel";
import { PriceTag } from "./design/components/core/PriceTag";
import { AhaTimeline, type AhaDemoStage } from "./design/components/agent/AhaTimeline";
import { RecommendationCard } from "./design/components/agent/RecommendationCard";
import { RecTypeLabel } from "./design/components/agent/RecTypeLabel";
import { ToolCallTrace } from "./design/components/agent/ToolCallTrace";
import { FeedbackTags, type FeedbackTag } from "./design/components/forms/FeedbackTags";

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
  const latestEvents = adkEvents.slice(-4);
  const lucyStatus = run?.state.lucy_session_status ?? lucy.status;

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

  // --- Handlers (logic preserved verbatim) ---
  function handleStartAgent() {
    void execute("start_agent", async () => {
      const response = await createAgentSession(analysis);
      applyRun(response);
    });
  }

  function handleRecommend() {
    void execute("ask_recommendation", async () => {
      const sessionId = await ensureAgentSession();
      const response = await sendAgentChat(sessionId, customerNeed.trim());
      applyRun(response);
    });
  }

  function handlePreview() {
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
    });
  }

  function handleStop() {
    void execute("stop_lucy_preview", async () => {
      const reason = lucy.stop("manual_stop");
      if (!agentSessionId) return;
      const response = await recordPreviewStatus(agentSessionId, {
        status: "stopped",
        reason
      });
      applyRun(response);
    });
  }

  function handleFeedback(action: (typeof feedbackActions)[number]) {
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
    });
  }

  function handleConfirm() {
    void execute("confirm_selection", async () => {
      if (!agentSessionId || !selectedSet) return;
      const response = await confirmAgentSelection(agentSessionId, {
        set_id: selectedSet.set_id,
        camera_processing_consent: lastPreviewPayload?.configured ?? false,
        face_profile_consent: false
      });
      applyRun(response);
    });
  }

  const selectedTotal =
    selectedSet?.products.reduce((sum, product) => sum + product.price_yen, 0) ?? 0;
  const showMockPreview = !lastPreviewPayload?.configured || lucy.status === "idle";

  return (
    <section className="console" aria-label="Agent runtime">
      <header className="console-top">
        <div className="console-brand">
          <strong>FASHINI</strong>
          <MicroLabel>Sales Agent · ADK runtime</MicroLabel>
        </div>
        <div className="console-status">
          <StatusBadge label="agent" value={run?.state.status ?? "not started"} />
          <StatusBadge
            label="route"
            value={run?.state.route ?? "unclear"}
            active={Boolean(run?.state.route) && run?.state.route !== "unclear"}
          />
          <StatusBadge label="lucy" value={lucyStatus} active={lucyStatus === "previewing"} />
          <StatusBadge label="round" value={String(run?.state.recommendation_round ?? 0)} />
        </div>
      </header>

      <div className="console-grid">
        {/* Left — need + recommendation sets + feedback loop */}
        <section className="console-left">
          <div className="console-need">
            <div className="console-need-input">
              <MicroLabel>Customer need</MicroLabel>
              <textarea
                value={customerNeed}
                onChange={(event) => setCustomerNeed(event.target.value)}
                rows={2}
                aria-label="Customer need"
              />
            </div>
            <div className="console-need-actions">
              <Button
                variant="secondary"
                size="lg"
                disabled={busyAction !== null || Boolean(agentSessionId)}
                onClick={handleStartAgent}
              >
                Start Agent
              </Button>
              <Button
                variant="primary"
                size="lg"
                iconRight={<span aria-hidden="true">→</span>}
                disabled={busyAction !== null || customerNeed.trim().length === 0}
                onClick={handleRecommend}
              >
                Recommend
              </Button>
            </div>
          </div>

          {error && (
            <div className="console-note error" style={{ margin: "16px 20px 0" }}>
              {error}
            </div>
          )}

          <div className="console-rec-list">
            {recommendationSets.length === 0 ? (
              <div className="console-empty">
                <MicroLabel>No recommendation sets yet</MicroLabel>
                <p>
                  Start the agent and ask for a recommendation to see three in-stock sets
                  materialize here.
                </p>
              </div>
            ) : (
              recommendationSets.map((set, index) => (
                <RecommendationCard
                  key={set.set_id}
                  set={set}
                  index={index}
                  selected={set.set_id === selectedSet?.set_id}
                  onSelect={() => setSelectedSetId(set.set_id)}
                  onPreview={() => {
                    setSelectedSetId(set.set_id);
                    handlePreview();
                  }}
                  onConfirm={() => {
                    setSelectedSetId(set.set_id);
                    handleConfirm();
                  }}
                />
              ))
            )}
          </div>

          {recommendationSets.length > 0 && (
            <div className="console-feedback">
              <MicroLabel>Feedback</MicroLabel>
              <div className="console-feedback-actions">
                <FeedbackTags
                  disabled={!agentSessionId || !selectedSet || busyAction !== null}
                  onSelect={(tag: FeedbackTag) => {
                    const action = feedbackActions.find(
                      (item) => item.dimension === tag.dimension
                    );
                    if (action) handleFeedback(action);
                  }}
                />
                <Button
                  variant="primary"
                  iconRight={<span aria-hidden="true">→</span>}
                  disabled={!agentSessionId || !selectedSet || busyAction !== null}
                  onClick={handleConfirm}
                >
                  Confirm handoff
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Right — Lucy realtime preview + Aha timeline + tool-call trace */}
        <aside className="console-right">
          <div className="console-preview">
            <div className="console-stage">
              <span className="console-stage-badge">Lucy · realtime</span>
              <video className="video-output" ref={lucy.remoteVideoRef} autoPlay playsInline muted />
              {showMockPreview && (
                <div className="console-mock">
                  <strong>{lastPreviewPayload ? "Mock realtime preview" : "Ready for preview"}</strong>
                  <span>
                    {lastPreviewPayload
                      ? "Lucy API key not configured locally"
                      : "Waiting for selected outfit"}
                  </span>
                </div>
              )}
              <div className="video-input">
                <video ref={lucy.localVideoRef} autoPlay playsInline muted />
                <span>Camera</span>
              </div>
              <span className="video-output-label">Lucy output</span>
            </div>

            <div className="console-preview-toolbar">
              <div className="console-selected">
                <MicroLabel>Selected set</MicroLabel>
                <span className="set-id">{selectedSet?.set_id ?? "none"}</span>
              </div>
              <div className="console-preview-actions">
                <Button
                  variant="secondary"
                  disabled={!agentSessionId || !selectedSet || busyAction !== null}
                  onClick={handlePreview}
                >
                  Realtime preview
                </Button>
                <Button
                  variant="ghost"
                  disabled={lucy.status === "idle" || lucy.status === "stopped"}
                  onClick={handleStop}
                >
                  Stop
                </Button>
              </div>
            </div>

            {selectedSet && (
              <div className="console-preview-meta">
                <RecTypeLabel recType={selectedSet.rec_type} />
                <PriceTag amount={selectedTotal} size="lg" countUp />
              </div>
            )}

            <div className="console-meta-badges">
              <StatusBadge label="connection" value={lucy.connectionState ?? "idle"} />
              <StatusBadge label="model" value={lastPreviewPayload?.model ?? "lucy-vton-3"} />
              <StatusBadge
                label="token"
                value={
                  lastPreviewPayload ? (lastPreviewPayload.configured ? "live" : "mock") : "none"
                }
                active={lastPreviewPayload?.configured ?? false}
              />
            </div>

            {lastPreviewPayload?.warnings.map((warning) => (
              <div className="console-note warning" key={warning}>
                {warning}
              </div>
            ))}
            {lucy.error && <div className="console-note error">{lucy.error}</div>}
          </div>

          <AhaTimeline
            stage={(ahaDemo?.stage ?? "idle") as AhaDemoStage}
            narrative={
              ahaDemo?.narrative ??
              "Agent runtime is waiting for the first customer action."
            }
          />

          <ToolCallTrace toolCalls={toolCalls} />

          <div className="console-adk">
            <span>ADK events</span>
            <div className="console-meta-badges" style={{ marginBottom: 4 }}>
              <StatusBadge label="author" value={latestAdkEvent?.author ?? "none"} />
              <StatusBadge label="output" value={outputType} />
              <StatusBadge label="events" value={String(adkEvents.length)} />
            </div>
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
        </aside>
      </div>
    </section>
  );
}

function StatusBadge({
  label,
  value,
  active = false
}: {
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div className="console-badge" data-active={active}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
