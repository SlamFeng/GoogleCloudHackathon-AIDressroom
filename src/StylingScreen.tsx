import "./design/screens/styling.css";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  confirmAgentSelection,
  createAgentSession,
  recordPreviewStatus,
  requestRealtimePreview,
  sendAgentChat,
  sendAgentFeedback,
  type AgentRunResponse,
  type FeedbackDimension,
  type LucyRealtimeTryonPayload,
  type RecommendationSet
} from "./api";
import type { AnalysisHandoff } from "./types";
import { useLucyRealtimeTryon } from "./useLucyRealtimeTryon";
import { useMirrorCamera } from "./useMirrorCamera";
import { useSpeech } from "./useSpeech";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { Button } from "./design/components/core/Button";
import { MicroLabel } from "./design/components/core/MicroLabel";
import { PriceTag } from "./design/components/core/PriceTag";
import { RecommendationCard } from "./design/components/agent/RecommendationCard";
import { RecTypeLabel } from "./design/components/agent/RecTypeLabel";
import { FeedbackTags, type FeedbackTag } from "./design/components/forms/FeedbackTags";

// The App's Copy type is a large translation record; we only ever read from it
// loosely here (headings come from the mirror type scale), so accept it broadly.
type Copy = Record<string, unknown>;

const defaultCustomerNeed = "没什么想法，请根据我当前穿搭推荐三套适合我的衣服。";

// Quick-pick occasion presets (the "gesture preset" input, tappable now,
// gesture-selectable in P3) — each fills a concrete need for the stylist.
const OCCASION_PRESETS: { label: string; need: string }[] = [
  { label: "Date", need: "帮我搭一套约会穿的look，要好看但不用力过猛。" },
  { label: "Work", need: "帮我搭一套通勤上班的look，得体一点。" },
  { label: "Party", need: "帮我搭一套派对聚会的look，出挑一点。" },
  { label: "Casual", need: "帮我搭一套日常休闲的look，舒服好穿。" },
  { label: "Vacation", need: "帮我搭一套度假旅行的look，轻松透气。" }
];

// --- Feedback action mapping (preserved verbatim from AgentRuntimePanel). ---
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

// --- ToolStep — a single designed ReAct step: spinner while running, check
//     when done, with a human label. Several stack as the agent "works". ---
function ToolStep({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="styling-tool" data-done={done}>
      {done ? (
        <span className="styling-tool-check" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path
              d="M3.5 8.5l3 3 6-6.5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      ) : (
        <span className="styling-tool-spin" aria-hidden="true" />
      )}
      <span>{label}</span>
    </div>
  );
}

type ToolPhase = { labels: string[]; runningIndex: number } | null;

export function StylingScreen({
  analysis,
  copy: _copy,
  onComplete,
  onBack
}: {
  analysis: AnalysisHandoff;
  copy: Copy;
  onComplete: () => void;
  onBack: () => void;
}) {
  const [run, setRun] = useState<AgentRunResponse | null>(null);
  const [customerNeed, setCustomerNeed] = useState(defaultCustomerNeed);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [lastPreviewPayload, setLastPreviewPayload] = useState<LucyRealtimeTryonPayload | null>(
    null
  );
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toolPhase, setToolPhase] = useState<ToolPhase>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  // "cover" fills the frame (immersive, crops the sides); "contain" shows the
  // camera's whole wide frame (better on a narrow laptop webcam).
  const [feedFit, setFeedFit] = useState<"cover" | "contain">("cover");
  const lucy = useLucyRealtimeTryon();
  const toolTimersRef = useRef<number[]>([]);

  const agentSessionId = run?.state.session_id ?? null;
  const recommendationSets = run?.state.recommendation_sets ?? [];
  const selectedSet = useMemo(
    () => recommendationSets.find((set) => set.set_id === selectedSetId) ?? recommendationSets[0],
    [recommendationSets, selectedSetId]
  );

  useEffect(() => {
    return () => {
      toolTimersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);


  // Animate a stack of ToolStep pills while a request is in flight: reveal them
  // one at a time (running), so the agent visibly "works". We don't have SSE —
  // when the response arrives, `finishTools` flips them all to done.
  function runTools(labels: string[]) {
    toolTimersRef.current.forEach((id) => window.clearTimeout(id));
    toolTimersRef.current = [];
    setToolPhase({ labels, runningIndex: 0 });
    labels.forEach((_, index) => {
      if (index === 0) return;
      const id = window.setTimeout(() => {
        setToolPhase((current) =>
          current && current.labels === labels
            ? { labels, runningIndex: Math.min(index, labels.length - 1) }
            : current
        );
      }, index * 650);
      toolTimersRef.current.push(id);
    });
  }

  function finishTools() {
    toolTimersRef.current.forEach((id) => window.clearTimeout(id));
    toolTimersRef.current = [];
    setToolPhase((current) =>
      current ? { labels: current.labels, runningIndex: current.labels.length } : null
    );
    // Let the last "done" flash read, then clear.
    const id = window.setTimeout(() => setToolPhase(null), 700);
    toolTimersRef.current.push(id);
  }

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

  // --- Handlers (API request payloads / behavior preserved from AgentRuntimePanel) ---

  // On mount / "Style me": create session then ask for the recommendation.
  function handleStyleMe(need?: string) {
    const text = (need ?? customerNeed).trim();
    if (!text) return;
    speech.warm();
    void execute("recommend", async () => {
      runTools(["Reading your body template", "Searching in-stock outfits", "Styling three looks"]);
      try {
        const sessionId = await ensureAgentSession();
        const response = await sendAgentChat(sessionId, text);
        applyRun(response);
        setShowConfirm(false);
        const count = response.state.recommendation_sets.length;
        if (count > 0) speech.speak("Here are your looks, all in stock. Tap one to try it on.");
      } finally {
        finishTools();
      }
    });
  }

  function handlePreview(set: RecommendationSet | undefined = selectedSet) {
    void execute("lucy_preview", async () => {
      // Take the set explicitly so a fresh click previews THAT card, not the
      // set that happened to be selected on the previous render.
      if (!agentSessionId || !set) return;
      const response = await requestRealtimePreview(agentSessionId, set.set_id);
      applyRun(response);
      if (response.output.type !== "realtime_tryon_payload") {
        // Surface the reason instead of silently doing nothing.
        setError(
          response.output.type === "failed"
            ? `Preview unavailable: ${response.output.reason}`
            : "Preview unavailable"
        );
        return;
      }
      setLastPreviewPayload(response.output.payload);
      speech.speak("Here's how it looks on you.");
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
      runTools(["Updating your look", "Re-checking stock"]);
      try {
        const response = await sendAgentFeedback(agentSessionId, {
          set_id: selectedSet.set_id,
          feedback_type: action.dimension === "overall" ? "reject_all" : "partial_adjust",
          dimension: action.dimension,
          dimension_value: action.dimensionValue,
          raw_voice_text: action.voice
        });
        applyRun(response);
        if (response.state.recommendation_sets.length > 0) {
          speech.speak("Here's another take. Tap one to try it on.");
        }
      } finally {
        finishTools();
      }
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
      speech.speak("Reserved. I'll have it brought to your fitting room.");
      onComplete();
    });
  }

  const selectedTotal =
    selectedSet?.products.reduce((sum, product) => sum + product.price_yen, 0) ?? 0;
  const showMockPreview = !lastPreviewPayload?.configured || lucy.status === "idle";
  const hasSets = recommendationSets.length > 0;
  const working = toolPhase !== null;

  // Full-bleed Lucy try-on is showing (real stream, or the "not configured"
  // placeholder over the live reflection).
  const tryonActive = Boolean(selectedSet) && (lucy.status !== "idle" || lastPreviewPayload !== null);
  // Lucy grabs its own camera only for a real (configured) preview; keep the
  // ambient reflection running the rest of the time, and step aside when it does.
  const lucyHoldsCamera =
    !showMockPreview && (lucy.status === "connecting" || lucy.status === "previewing");
  const mirror = useMirrorCamera(!lucyHoldsCamera);
  const speech = useSpeech("en-US");
  const stt = useSpeechRecognition({
    lang: "en-US",
    onFinal: (transcript) => {
      setCustomerNeed(transcript);
      speech.warm();
      handleStyleMe(transcript);
    }
  });

  return (
    <section className="mirror-shell" aria-label="Styling recommendations">
      {/* Always-on reflection — the customer sees themselves the whole time. */}
      <video
        className="mirror-feed"
        ref={mirror.videoRef}
        autoPlay
        playsInline
        muted
        style={{ objectFit: feedFit }}
      />
      <div className="mirror-scrim" aria-hidden="true" />
      {(mirror.state === "denied" || mirror.state === "error") && (
        <div className="mirror-cam-note">
          {mirror.state === "denied"
            ? "Enable the camera to see yourself in the mirror."
            : "Camera unavailable on this device."}
        </div>
      )}

      {/* Full-bleed Lucy try-on: the customer sees themselves wearing the look. */}
      {tryonActive && (
        <div className="mirror-tryon" data-mock={showMockPreview ? "true" : undefined}>
          {!showMockPreview && (
            <video
              className="mirror-tryon-remote"
              ref={lucy.remoteVideoRef}
              autoPlay
              playsInline
              muted
              style={{ objectFit: feedFit }}
            />
          )}
          <video className="mirror-local-hidden" ref={lucy.localVideoRef} autoPlay playsInline muted />
          {showMockPreview && (
            <div className="mirror-tryon-mock">
              <strong>{lastPreviewPayload ? "Realtime try-on isn't set up on this mirror" : "Getting your preview ready"}</strong>
              <span>You're looking at the live mirror — connect Lucy to see the outfit on you.</span>
            </div>
          )}
          <div className="mirror-tryon-bar">
            <div className="mirror-tryon-meta">
              {selectedSet && (
                <>
                  <RecTypeLabel recType={selectedSet.rec_type} />
                  <PriceTag amount={selectedTotal} />
                </>
              )}
            </div>
            <div className="mirror-tryon-actions">
              <Button variant="secondary" onClick={handleStop}>
                Back to looks
              </Button>
              <Button
                variant="primary"
                iconRight={<span aria-hidden="true">→</span>}
                disabled={!agentSessionId || busyAction !== null}
                onClick={() => {
                  setShowConfirm(true);
                  handleStop();
                }}
              >
                Choose this
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Glass info sheet floating over the reflection. */}
      <div className="mirror-content" data-dim={tryonActive ? "true" : undefined}>
      <div className="mirror-topbar">
        <button className="mirror-back" type="button" onClick={onBack} aria-label="Back">
          ← Back
        </button>
        <div className="mirror-topbar-right">
          <button
            className="mirror-mute"
            type="button"
            onClick={() => setFeedFit((fit) => (fit === "cover" ? "contain" : "cover"))}
            aria-label={feedFit === "cover" ? "Show full camera view" : "Fill the frame"}
          >
            {feedFit === "cover" ? "⤢ Fit view" : "⤡ Fill frame"}
          </button>
          {speech.supported && (
          <button
            className="mirror-mute"
            type="button"
            onClick={speech.toggle}
            aria-pressed={speech.enabled}
            aria-label={speech.enabled ? "Turn voice off" : "Turn voice on"}
          >
            {speech.enabled ? "🔊 Voice" : "🔇 Muted"}
          </button>
          )}
        </div>
      </div>
      <MicroLabel>STYLING · YOUR LOOKS</MicroLabel>
      <h2 className="mirror-title">Let's style three looks for you</h2>

      {/* Need input — speak it, tap a preset, or type. */}
      <div className="styling-need">
        <MicroLabel>What are you after?</MicroLabel>
        <div className="styling-need-input">
          <textarea
            value={stt.listening ? stt.transcript || customerNeed : customerNeed}
            onChange={(event) => setCustomerNeed(event.target.value)}
            rows={2}
            aria-label="Your styling need"
            placeholder={stt.listening ? "Listening…" : defaultCustomerNeed}
          />
          {stt.supported && (
            <button
              className={`mirror-mic ${stt.listening ? "on" : ""}`}
              type="button"
              onClick={() => stt.toggle()}
              aria-pressed={stt.listening}
              aria-label={stt.listening ? "Stop listening" : "Speak your need"}
            >
              🎤
            </button>
          )}
        </div>
        <div className="styling-presets" role="group" aria-label="Occasion presets">
          {OCCASION_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="styling-preset"
              disabled={busyAction !== null}
              onClick={() => {
                setCustomerNeed(preset.need);
                handleStyleMe(preset.need);
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <Button
          variant="primary"
          size="lg"
          iconRight={<span aria-hidden="true">→</span>}
          disabled={busyAction !== null || customerNeed.trim().length === 0}
          onClick={() => handleStyleMe()}
        >
          {hasSets ? "Restyle with this" : "Style me"}
        </Button>
      </div>

      {error && <div className="styling-error">{error}</div>}

      {/* ToolStep pills — the agent visibly working. */}
      {working && toolPhase && (
        <div className="styling-tools" aria-live="polite">
          {toolPhase.labels.map((label, index) => (
            <ToolStep key={label} label={label} done={index < toolPhase.runningIndex} />
          ))}
        </div>
      )}

      {/* Recommendation set cards. */}
      {hasSets && !working && (
        <div className="styling-sets">
          {recommendationSets.map((set, index) => (
            <RecommendationCard
              key={set.set_id}
              set={set}
              index={index}
              selected={set.set_id === selectedSet?.set_id}
              onSelect={() => setSelectedSetId(set.set_id)}
              onPreview={() => {
                setSelectedSetId(set.set_id);
                handlePreview(set);
              }}
              onConfirm={() => {
                setSelectedSetId(set.set_id);
                setShowConfirm(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Feedback pills — ChoiceCard paradigm; drives the re-recommendation loop. */}
      {hasSets && !working && (
        <div className="styling-feedback">
          <MicroLabel>Not quite right? Nudge it</MicroLabel>
          <FeedbackTags
            disabled={!agentSessionId || !selectedSet || busyAction !== null}
            onSelect={(tag: FeedbackTag) => {
              const action = feedbackActions.find((item) => item.dimension === tag.dimension);
              if (action) handleFeedback(action);
            }}
          />
        </div>
      )}

      {/* Confirm summary card — selected set + count-up total + reserve. */}
      {showConfirm && selectedSet && (
        <div className="styling-confirm">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <RecTypeLabel recType={selectedSet.rec_type} />
            <MicroLabel>Your pick</MicroLabel>
          </div>
          <div className="styling-confirm-lines">
            {selectedSet.products.map((product) => (
              <div className="styling-confirm-line" key={product.product_id}>
                <span>{product.name}</span>
                <PriceTag amount={product.price_yen} />
              </div>
            ))}
          </div>
          <div className="styling-confirm-total">
            <span>Total</span>
            <PriceTag amount={selectedTotal} size="lg" countUp />
          </div>
          <Button
            variant="primary"
            size="lg"
            block
            iconRight={<span aria-hidden="true">→</span>}
            disabled={!agentSessionId || busyAction !== null}
            onClick={handleConfirm}
          >
            Reserve &amp; try on
          </Button>
        </div>
      )}

      <div className="styling-note">
        <span aria-hidden="true">i</span>
        Looks are pulled from live store stock. Reserve to have them brought to your fitting room.
      </div>
      </div>
    </section>
  );
}
