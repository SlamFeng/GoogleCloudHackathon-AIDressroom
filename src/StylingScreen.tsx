import "./design/screens/styling.css";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  confirmAgentSelection,
  createAgentSession,
  generateTryonImage,
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
import { useGestureControl } from "./useGestureControl";
import { useExpression } from "./useExpression";
import { GuidePet, type PetMood } from "./GuidePet";
import { VoiceAura, type VoiceAuraState } from "./VoiceAura";
import { useAudioLevel } from "./useAudioLevel";
import { LiveTranscript } from "./LiveTranscript";
import { GestureHint } from "./GestureHint";
import { GestureReadBar } from "./GestureReadBar";
import { LookStrip } from "./mirror-ds/components/looks/LookStrip";
import { Button } from "./design/components/core/Button";
import { MicroLabel } from "./design/components/core/MicroLabel";
import { PriceTag } from "./design/components/core/PriceTag";
import { RecTypeLabel } from "./design/components/agent/RecTypeLabel";

// The App's Copy type is a large translation record; we only ever read from it
// loosely here (headings come from the mirror type scale), so accept it broadly.
type Copy = Record<string, unknown>;

const defaultCustomerNeed = "没什么想法，请根据我当前穿搭推荐三套适合我的衣服。";

// How long the placeholder try-on window stays open before dropping back to the
// mirror. Drives both the auto-dismiss timer and the progress-bar animation
// (via the --tryon-ms CSS variable), so the two never drift apart.
const TRYON_WINDOW_MS = 15000;

// The agent's fixed spoken lines — prefetched (and cached) on mount so the
// Gemini voice is ready and instant when each one is actually needed.
const LINE_LOOKS_READY = "给你搭好了三套，都是现货。选一套试穿吧。";
const LINE_ON_YOU = "看看你穿上的样子。";
const LINE_RESTYLED = "换了一版，选一套试穿。";
const LINE_RESERVED = "已预留，给你送到试衣间。";
// Spoken when the customer smiles at their try-on reflection (expression → TTS).
const LINE_COMPLIMENT = "哎呀，你好像很开心！看来这套很适合你～";
const AGENT_LINES = [LINE_LOOKS_READY, LINE_ON_YOU, LINE_RESTYLED, LINE_RESERVED, LINE_COMPLIMENT];

// Rec-type → a short Chinese label shown on the look strip.
const REC_LABEL: Record<string, string> = {
  explicit_need: "你的需求",
  similar: "同款风格",
  style: "造型推荐",
  seasonal: "当季精选"
};

// Each "thinking" step stays on screen at least this long, so even a fast
// (cache-hit) turn visibly walks step-by-step instead of snapping to done.
const TOOL_STEP_MS = 850;

// Pull the customer's own occasion phrase ("明天要参加朋友的婚礼") out of what they
// just said, so the agent can acknowledge it in their words immediately — before
// the backend even responds. Regex, not a lookup table.
function echoRequest(text: string): string | undefined {
  const m = text.match(
    // The lookbehind keeps bare 上 as a verb ("上班") but not as the tail of a
    // compound like 穿上/试上/配上 ("我想穿上这件外套" must not echo "上这件外套").
    /((?:今天|明天|后天|这周末|周末|下周)?[要想]?(?:去|参加|(?<![穿试戴配加披套换])上))((?:[一-龥]{1,4}的)?[一-龥]{1,6}?)(?=[了，。！？、\s吗呢啊]|穿|想|要|能|有|帮|给|$)/
  );
  return m ? `${m[1]}${m[2]}` : undefined;
}

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
  captureDataUrl,
  onComplete,
  onBack
}: {
  analysis: AnalysisHandoff;
  copy: Copy;
  captureDataUrl: string | null;
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
  const [reservedSet, setReservedSet] = useState<RecommendationSet | null>(null);
  // "cover" fills the frame (immersive, crops the sides); "contain" shows the
  // camera's whole wide frame (better on a narrow laptop webcam).
  const [feedFit, setFeedFit] = useState<"cover" | "contain">("cover");
  const [gestureOn, setGestureOn] = useState(true);
  // Chosen camera (e.g. an iPhone via Continuity Camera). Remembered per device.
  const [camId, setCamId] = useState<string | undefined>(() => {
    try {
      return window.localStorage.getItem("fashini.camId") ?? undefined;
    } catch {
      return undefined;
    }
  });
  // Placeholder try-on: a 15s window (progress bar) while the "you wearing it"
  // image renders in the background; when it elapses we drop back to the mirror.
  const [tryonOpen, setTryonOpen] = useState(false);
  const [tryonImage, setTryonImage] = useState<string | null>(null);
  const [tryonGenerating, setTryonGenerating] = useState(false);
  const [petMessage, setPetMessage] = useState<string | undefined>(
    "你好呀～跟我说说你想去的场合或想要的风格！"
  );
  const [petMood, setPetMood] = useState<PetMood>("idle");
  const [petLeaving, setPetLeaving] = useState(false);
  const tryonTimerRef = useRef<number | null>(null);
  const lucy = useLucyRealtimeTryon();
  const toolTimersRef = useRef<number[]>([]);
  const toolStartRef = useRef(0);
  const toolStepsRef = useRef(0);

  const agentSessionId = run?.state.session_id ?? null;
  const recommendationSets = run?.state.recommendation_sets ?? [];
  const selectedSet = useMemo(
    () => recommendationSets.find((set) => set.set_id === selectedSetId) ?? recommendationSets[0],
    [recommendationSets, selectedSetId]
  );

  useEffect(() => {
    return () => {
      toolTimersRef.current.forEach((id) => window.clearTimeout(id));
      if (tryonTimerRef.current !== null) window.clearInterval(tryonTimerRef.current);
    };
  }, []);


  // Animate a stack of ToolStep pills while a request is in flight: reveal them
  // one at a time (running), so the agent visibly "works". We don't have SSE —
  // when the response arrives, `finishTools` flips them all to done.
  function runTools(labels: string[]) {
    toolTimersRef.current.forEach((id) => window.clearTimeout(id));
    toolTimersRef.current = [];
    toolStartRef.current = performance.now();
    toolStepsRef.current = labels.length;
    setToolPhase({ labels, runningIndex: 0 });
    labels.forEach((_, index) => {
      if (index === 0) return;
      const id = window.setTimeout(() => {
        setToolPhase((current) =>
          current && current.labels === labels
            ? { labels, runningIndex: Math.min(index, labels.length - 1) }
            : current
        );
      }, index * TOOL_STEP_MS);
      toolTimersRef.current.push(id);
    });
  }

  function finishTools(onDone?: () => void) {
    // Keep the steps on screen for a minimum time so a fast (cached) response
    // still visibly walks through each step instead of snapping straight to done.
    // `onDone` (e.g. the spoken reply) fires only once the steps complete, so the
    // agent never talks while the loading animation is still running.
    const minTotal = toolStepsRef.current * TOOL_STEP_MS;
    const wait = Math.max(0, minTotal - (performance.now() - toolStartRef.current));
    const doneId = window.setTimeout(() => {
      setToolPhase((current) =>
        current ? { labels: current.labels, runningIndex: current.labels.length } : null
      );
      onDone?.();
      const clearId = window.setTimeout(() => setToolPhase(null), 700);
      toolTimersRef.current.push(clearId);
    }, wait);
    toolTimersRef.current.push(doneId);
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
      runTools([
        "正在听取你的需求…",
        "🔎 正在用 Google 搜索当季流行…",
        "匹配店内现货…",
        "为你搭配三套…"
      ]);
      // Phase 1 — acknowledge in the customer's own words the moment they finish
      // speaking, while the steps run: "啊，明天要参加朋友的婚礼是吗？…"
      const echo = echoRequest(text);
      const ack = echo ? `啊，${echo}是吗？正在为你挑选合适的搭配…` : "好的，正在为你挑选合适的搭配…";
      setPetMessage(ack);
      speech.speak(ack);
      let line: string | undefined;
      try {
        const sessionId = await ensureAgentSession();
        const response = await sendAgentChat(sessionId, text);
        applyRun(response);
        setShowConfirm(false);
        if (response.state.recommendation_sets.length > 0) {
          line = (response.output as { message?: string }).message ?? LINE_LOOKS_READY;
        }
      } finally {
        // The pet announces the result only after the steps finish animating.
        const spoken = line;
        finishTools(
          spoken
            ? () => {
                setPetMessage(spoken);
                speech.speakSoon(spoken);
              }
            : undefined
        );
      }
    });
  }

  function clearTryonTimer() {
    if (tryonTimerRef.current !== null) {
      window.clearInterval(tryonTimerRef.current);
      tryonTimerRef.current = null;
    }
  }

  // Grab a still frame from the live mirror to stand in for an OOTD photo, so the
  // "you wearing this look" render has a picture of the customer even though we
  // no longer capture one up front.
  function captureMirrorFrame(): string | null {
    const video = mirror.videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    try {
      return canvas.toDataURL("image/jpeg", 0.85);
    } catch {
      return null;
    }
  }

  // Placeholder try-on: open a 15s window (a progress bar counts it down) while
  // the "you wearing this look" image renders in the background; when the window
  // elapses, drop the try-on layer and fall back to the plain mirror.
  function startTryonGeneration(set: RecommendationSet) {
    clearTryonTimer();
    setTryonImage(null);
    setTryonOpen(true);
    tryonTimerRef.current = window.setTimeout(() => handleStop(), TRYON_WINDOW_MS);

    const personImage = captureMirrorFrame() ?? captureDataUrl;
    if (personImage) {
      setTryonGenerating(true);
      generateTryonImage(
        personImage,
        set.products.map((product) => product.product_id),
        set.reason
      )
        .then((image) => {
          if (image) setTryonImage(image);
        })
        .catch(() => {})
        .finally(() => setTryonGenerating(false));
    }
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
      speech.speak(LINE_ON_YOU);
      startTryonGeneration(set);
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
    clearTryonTimer();
    setTryonOpen(false);
    setTryonImage(null);
    setTryonGenerating(false);
    setLastPreviewPayload(null);
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
      runTools(["更新你的偏好…", "重新检查现货…", "调整搭配…"]);
      setPetMessage("明白，我再调整一下…");
      let line: string | undefined;
      try {
        const response = await sendAgentFeedback(agentSessionId, {
          set_id: selectedSet.set_id,
          feedback_type: action.dimension === "overall" ? "reject_all" : "partial_adjust",
          dimension: action.dimension,
          dimension_value: action.dimensionValue,
          raw_voice_text: action.voice
        });
        applyRun(response);
        if (response.state.recommendation_sets.length > 0) line = LINE_RESTYLED;
      } finally {
        const spoken = line;
        finishTools(
          spoken
            ? () => {
                setPetMessage(spoken);
                speech.speakSoon(spoken);
              }
            : undefined
        );
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
      speech.speak(LINE_RESERVED);
      setPetMessage(LINE_RESERVED);
      setPetLeaving(true);
      // Show the dark-glass checkout (not the old light handoff screen).
      setReservedSet(selectedSet);
      setShowConfirm(false);
    });
  }

  const selectedTotal =
    selectedSet?.products.reduce((sum, product) => sum + product.price_yen, 0) ?? 0;
  const showMockPreview = !lastPreviewPayload?.configured || lucy.status === "idle";
  const hasSets = recommendationSets.length > 0;
  const working = toolPhase !== null;
  // Idle = nothing to browse yet → show only the floating mic over the mirror,
  // no big sheet. The sheet returns once the agent is working / has looks.
  const voiceMode = !hasSets && !working;

  // Full-bleed try-on layer is showing (real stream, or the placeholder window).
  const tryonActive = tryonOpen && Boolean(selectedSet);
  // Lucy grabs its own camera only for a real (configured) preview; keep the
  // ambient reflection running the rest of the time, and step aside when it does.
  const lucyHoldsCamera =
    !showMockPreview && (lucy.status === "connecting" || lucy.status === "previewing");
  const mirror = useMirrorCamera(!lucyHoldsCamera, camId);
  function pickCamera(id: string) {
    setCamId(id);
    try {
      window.localStorage.setItem("fashini.camId", id);
    } catch {
      /* storage unavailable — selection still applies for this session */
    }
  }
  const speech = useSpeech("zh-CN");
  const stt = useSpeechRecognition({ lang: "zh-CN", continuous: true });
  const micLevel = useAudioLevel(stt.listening);
  const auraState: VoiceAuraState = stt.listening
    ? "listening"
    : speech.speaking
      ? "speaking"
      : "idle";

  // Voice-first: a tap (or gesture) starts listening; the next one stops and
  // submits what was heard. No big form — just the mirror and your voice.
  function toggleVoice() {
    if (stt.listening) {
      // Wait for the recognizer to flush — the last words often finalize AFTER
      // stop() returns, so a synchronous transcript read drops the tail.
      void stt.stopAndFlush().then((said) => {
        if (said) {
          setCustomerNeed(said);
          handleStyleMe(said);
        }
      });
    } else {
      speech.warm();
      setPetMessage("我在听，请说～");
      stt.start();
    }
  }

  // Hands-free selection by finger count: 1/2/3 picks a look, 👍 choose, ✋ back.
  const gesture = useGestureControl({
    videoRef: mirror.videoRef,
    enabled: gestureOn && mirror.state === "live",
    choiceCount: recommendationSets.length,
    onSelect: (index) => {
      // Ignore gestures while the thinking steps are still animating — firing a
      // new turn mid-animation clears the pending completion (speech + pet line)
      // of the one in flight.
      if (working) return;
      // Fingers 1/2/3 just switch the active look; 👍 tries it on.
      const set = recommendationSets[index];
      if (set) setSelectedSetId(set.set_id);
    },
    onGesture: (action) => {
      if (working) return;
      if (action === "talk") {
        // ✋ = talk, in every context (starts a restyle when looks are up).
        if (busyAction === null) toggleVoice();
        return;
      }
      if (action === "confirm") {
        // 👍 = try on the active look (from the looks strip).
        if (!tryonActive && !showConfirm && selectedSet && busyAction === null) {
          handlePreview(selectedSet);
        }
        return;
      }
      if (action === "proceed") {
        // 👌 = OK / go to the next step: looks → choose, try-on → choose,
        // confirm → reserve.
        if (showConfirm) {
          if (agentSessionId && busyAction === null) handleConfirm();
        } else if (tryonActive) {
          setShowConfirm(true);
          handleStop();
        } else if (selectedSet && busyAction === null) {
          setShowConfirm(true);
        }
        return;
      }
      // ✊ = back / cancel.
      if (tryonActive) handleStop();
      else if (showConfirm) setShowConfirm(false);
    }
  });

  // Read the customer's reaction while they see themselves in the try-on: a
  // sustained smile triggers a spoken compliment (MediaPipe Face Landmarker ->
  // existing Gemini TTS). Only active during the try-on so it reacts to the
  // outfit, not to the browsing UI.
  // During a REAL Lucy preview the ambient mirror releases the camera and Lucy
  // captures its own local feed — read the smile from that feed instead, so the
  // compliment doesn't silently die at the flashiest moment of the demo.
  const expressionVideoRef = lucyHoldsCamera ? lucy.localVideoRef : mirror.videoRef;
  useExpression({
    videoRef: expressionVideoRef,
    enabled: tryonActive && (lucyHoldsCamera || mirror.state === "live"),
    onSatisfied: () => {
      if (busyAction !== null) return;
      setPetMessage(LINE_COMPLIMENT);
      setPetMood("happy");
      speech.speak(LINE_COMPLIMENT);
      window.setTimeout(() => setPetMood("idle"), 2600);
    }
  });

  // The pet greets when the try-on opens.
  useEffect(() => {
    if (tryonActive) setPetMessage("来，看看你穿上这套的样子～");
  }, [tryonActive]);

  // Pet mood follows what's actually happening: a cheer wins, then "listening"
  // while the mic is open, "working" while the tool steps animate, "talking"
  // while the voice is speaking, otherwise idle.
  const petMoodShown: PetMood =
    petMood === "happy"
      ? "happy"
      : stt.listening
        ? "listening"
        : working
          ? "working"
          : speech.speaking
            ? "talking"
            : "idle";

  // Warm the Gemini voice cache for the fixed lines — but a few seconds in, so
  // the TTS calls don't contend with the customer's first styling request.
  useEffect(() => {
    const id = window.setTimeout(() => speech.prefetch(AGENT_LINES), 5000);
    return () => window.clearTimeout(id);
  }, [speech.prefetch]);

  return (
    <section className="mirror-shell" aria-label="Styling recommendations">
      {/* Shopping-guide pet — present for the whole realtime mirror session;
          waves off (exit animation) once the purchase is confirmed. */}
      <GuidePet visible={!petLeaving} message={petMessage} mood={petMoodShown} />
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
      {mirror.state === "live" && (
        <div className="mirror-live" role="status">
          <span className="mirror-live-dot" aria-hidden="true" />
          Camera on · nothing is saved
        </div>
      )}
      {(mirror.state === "denied" || mirror.state === "error") && (
        <div className="mirror-cam-note">
          {mirror.state === "denied"
            ? "Enable the camera to see yourself in the mirror."
            : "Camera unavailable on this device."}
        </div>
      )}

      {/* Hands-free finger-count selection (opt-in; touch always works). */}
      {gestureOn && (
        <div className="gesture-hint">
          {gesture.handPresent
            ? "Hold up 1 · 2 · 3 to pick a look · 👍 choose · ✋ back"
            : "Raise 1, 2 or 3 fingers to pick a look"}
        </div>
      )}

      {/* Full-bleed Lucy try-on: the customer sees themselves wearing the look. */}
      {tryonActive && (
        <div
          className="mirror-tryon"
          data-mock={showMockPreview ? "true" : undefined}
          style={{ ["--tryon-ms" as string]: `${TRYON_WINDOW_MS}ms` }}
        >
          {/* Reveal bloom — a light sweep down the reflection as the try-on opens. */}
          <div className="mirror-bloom" aria-hidden="true" />
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
          {showMockPreview &&
            (tryonImage ? (
              <img
                className="mirror-tryon-remote"
                src={tryonImage}
                alt="You in this look"
                style={{ objectFit: feedFit }}
              />
            ) : (
              <div className="mirror-tryon-mock">
                <strong>{tryonGenerating ? "正在把这套穿到你身上…" : "正在生成试穿效果…"}</strong>
                <span>你正看着实时镜面，稍等就能看到自己穿上的样子。</span>
              </div>
            ))}
          {/* 15s window progress bar; on elapse the layer auto-dismisses. */}
          <div className="mirror-tryon-progress" aria-hidden="true">
            <span />
          </div>
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

      {/* Checkout / settlement — dark glass, shown after the outfit is reserved. */}
      {reservedSet && (
        <div className="mirror-checkout">
          <div className="mirror-checkout-card">
            <div className="checkout-mark" aria-hidden="true">✓</div>
            <MicroLabel>已预留</MicroLabel>
            <h2 className="checkout-title">这套帮你留好了</h2>
            <div className="checkout-lines">
              {reservedSet.products.map((product) => (
                <div className="checkout-line" key={product.product_id}>
                  <span>{product.name}</span>
                  <PriceTag amount={product.price_yen} size="md" />
                </div>
              ))}
            </div>
            <div className="checkout-total">
              <span>合计</span>
              <PriceTag
                amount={reservedSet.products.reduce((sum, p) => sum + p.price_yen, 0)}
                size="lg"
                countUp
              />
            </div>
            <p className="checkout-note">已送到你的试衣间，试好直接带走即可。</p>
            <Button variant="primary" size="lg" block onClick={onComplete}>
              完成
            </Button>
          </div>
        </div>
      )}

      {/* Read-bar for a held gesture — floats above the sheet. */}
      {gesture.armedGesture && (
        <div className="mirror-readbar">
          <GestureReadBar action={gesture.armedGesture} dwellMs={gesture.dwellMs} />
        </div>
      )}

      {/* Minimal controls floating over the reflection — no big sheet. */}
      <div
        className="mirror-content"
        data-dim={tryonActive ? "true" : undefined}
        data-mode={voiceMode ? "voice" : "sheet"}
      >
        <div className="mirror-topbar">
          <button className="mirror-back" type="button" onClick={onBack} aria-label="Back">
            ← Back
          </button>
          <div className="mirror-topbar-right">
            {mirror.devices.length > 1 && (
              <select
                className="mirror-cam-select"
                value={camId ?? ""}
                onChange={(event) => pickCamera(event.target.value)}
                aria-label="Camera"
              >
                {camId === undefined && <option value="">Camera</option>}
                {mirror.devices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${index + 1}`}
                  </option>
                ))}
              </select>
            )}
            <button
              className={`mirror-mute ${gestureOn ? "on" : ""}`}
              type="button"
              onClick={() => setGestureOn((on) => !on)}
              aria-pressed={gestureOn}
              aria-label={gestureOn ? "Turn gestures off" : "Control with gestures"}
            >
              {gestureOn ? "✋ On" : "✋"}
            </button>
            <button
              className="mirror-mute"
              type="button"
              onClick={() => setFeedFit((fit) => (fit === "cover" ? "contain" : "cover"))}
              aria-label={feedFit === "cover" ? "Show full camera view" : "Fill the frame"}
            >
              {feedFit === "cover" ? "⤢ Fit" : "⤡ Fill"}
            </button>
            {speech.supported && (
              <button
                className="mirror-mute"
                type="button"
                onClick={speech.toggle}
                aria-pressed={speech.enabled}
                aria-label={speech.enabled ? "Turn voice off" : "Turn voice on"}
              >
                {speech.enabled ? "🔊" : "🔇"}
              </button>
            )}
          </div>
        </div>

        {error && <div className="styling-error">{error}</div>}

        {/* Idle: just a floating mic (tap or ✋ to talk). */}
        {voiceMode && (
          <div className="mirror-voice">
            <LiveTranscript text={stt.transcript} listening={stt.listening} />
            <div className="mirror-talk-wrap">
              <VoiceAura
                state={auraState}
                amplitude={micLevel}
                size={240}
                style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
              />
              <button
                className={`mirror-talk ${stt.listening ? "on" : ""}`}
                type="button"
                onClick={stt.supported ? toggleVoice : () => handleStyleMe(defaultCustomerNeed)}
                aria-pressed={stt.listening}
                aria-label={stt.listening ? "Stop and send" : "Tap to talk"}
              >
                🎤
              </button>
            </div>
            <div className="mirror-voice-hint">
              {stt.listening ? "我在听，说完点一下发送～" : "点麦克风，或做手势说话"}
            </div>
            {gestureOn && <GestureHint only={["talk"]} active={stt.listening ? "talk" : null} />}
            <button
              className="mirror-voice-skip"
              type="button"
              disabled={busyAction !== null}
              onClick={() => handleStyleMe(defaultCustomerNeed)}
            >
              Just pick for me →
            </button>
          </div>
        )}

        {/* Agent working. */}
        {working && toolPhase && (
          <div className="styling-tools" aria-live="polite">
            {toolPhase.labels.map((label, index) => (
              <ToolStep key={label} label={label} done={index < toolPhase.runningIndex} />
            ))}
          </div>
        )}

        {/* Three looks as a compact strip — switch with fingers 1·2·3, still see yourself. */}
        {hasSets && !working && (
          <div className="mirror-looks">
            <LookStrip
              looks={recommendationSets.map((set) => ({
                id: set.set_id,
                recType: set.rec_type,
                recLabel: REC_LABEL[set.rec_type] ?? set.rec_type,
                totalYen: set.products.reduce((sum, p) => sum + p.price_yen, 0),
                items: set.products.map((product) => ({
                  id: product.product_id,
                  name: product.name,
                  category: product.category,
                  imageUrl: product.image_url,
                  price_yen: product.price_yen
                }))
              }))}
              activeIndex={Math.max(
                0,
                recommendationSets.findIndex((s) => s.set_id === selectedSet?.set_id)
              )}
              onSelect={(index) => {
                const s = recommendationSets[index];
                if (s) setSelectedSetId(s.set_id);
              }}
              armedIndex={gesture.armedChoice}
              dwellMs={gesture.dwellMs}
              disabled={busyAction !== null}
              onTryOn={(_look, index) => {
                const s = recommendationSets[index];
                if (s && agentSessionId && busyAction === null) {
                  setSelectedSetId(s.set_id);
                  handlePreview(s);
                }
              }}
              onChoose={(_look, index) => {
                const s = recommendationSets[index];
                if (s) {
                  setSelectedSetId(s.set_id);
                  setShowConfirm(true);
                }
              }}
              onFeedback={(tag) => {
                const action = feedbackActions.find((item) => item.dimension === tag.dimension);
                if (action) handleFeedback(action);
              }}
              hint={gestureOn ? "1·2·3 切换 · 👍 试穿 · ✊ 返回" : "点数字切换套装"}
            />
            {gestureOn && <GestureHint active={gesture.armedChoice !== null ? "pick" : null} />}
          </div>
        )}

        {/* Confirm summary. */}
        {showConfirm && selectedSet && (
          <div className="styling-confirm">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <RecTypeLabel recType={selectedSet.rec_type} />
              <MicroLabel>Your pick</MicroLabel>
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
      </div>
    </section>
  );
}
