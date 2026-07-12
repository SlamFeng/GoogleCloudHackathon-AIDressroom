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
import { SiriOrb, type SiriOrbState } from "./SiriOrb";
import { useAudioLevel } from "./useAudioLevel";
import { LiveTranscript } from "./LiveTranscript";
import { GestureHint } from "./GestureHint";
import { GestureReadBar } from "./GestureReadBar";
import { LookStrip } from "./mirror-ds/components/looks/LookStrip";
import { Button } from "./design/components/core/Button";
import { MicroLabel } from "./design/components/core/MicroLabel";
import { PriceTag } from "./design/components/core/PriceTag";
import { RecTypeLabel } from "./design/components/agent/RecTypeLabel";
import { STYLING_COPY } from "./styling-copy";

// The App's Copy type is a large translation record; we only ever read from it
// loosely here (headings come from the mirror type scale), so accept it broadly.
type Copy = Record<string, unknown>;

// Mirror language — matches App.tsx's selector (defined locally per contract).
type Language = "en" | "zh" | "ja";

// BCP-47 locale for STT/TTS per mirror language.
const SPEECH_LANG: Record<Language, string> = {
  en: "en-US",
  ja: "ja-JP",
  zh: "zh-CN"
};

// How long the placeholder try-on window stays open before dropping back to the
// mirror. Drives both the auto-dismiss timer and the progress-bar animation
// (via the --tryon-ms CSS variable), so the two never drift apart.
const TRYON_WINDOW_MS = 15000;

// Each "thinking" step stays on screen at least this long, so even a fast
// (cache-hit) turn visibly walks step-by-step instead of snapping to done.
const TOOL_STEP_MS = 850;

// Pull the customer's own occasion phrase ("明天要参加朋友的婚礼" / "a friend's
// wedding") out of what they just said, so the agent can acknowledge it in their
// words immediately — before the backend even responds. Regex, not a lookup table.
function echoRequest(text: string, language: Language): string | undefined {
  if (language === "zh") {
    const m = text.match(
      // The lookbehind keeps bare 上 as a verb ("上班") but not as the tail of a
      // compound like 穿上/试上/配上 ("我想穿上这件外套" must not echo "上这件外套").
      /((?:今天|明天|后天|这周末|周末|下周)?[要想]?(?:去|参加|(?<![穿试戴配加披套换])上))((?:[一-龥]{1,4}的)?[一-龥]{1,6}?)(?=[了，。！？、\s吗呢啊]|穿|想|要|能|有|帮|给|$)/
    );
    return m ? `${m[1]}${m[2]}` : undefined;
  }
  if (language === "en") {
    // "going to a friend's wedding tomorrow" → "a friend's wedding".
    const m = text.match(
      /\b(?:for|to|at|attend(?:ing)?|going to|have|got)\s+((?:a|an|my|the)\s+)?((?:[a-z]+(?:'s)?\s+){0,2}?(?:wedding|interview|date|party|trip|work|meeting|dinner|funeral|concert|graduation|prom|vacation|conference|presentation|birthday|anniversary|reunion|festival|gala|brunch|picnic|beach))\b/i
    );
    return m ? `${m[1] ?? ""}${m[2]}`.trim() : undefined;
  }
  // ja — just the occasion noun ("結婚式ですね！").
  const m = text.match(/(結婚式|面接|デート|パーティー|旅行|出張|会議|飲み会|食事会|卒業式|発表会|お出かけ)/);
  return m ? m[1] : undefined;
}

// --- Feedback action mapping (payload preserved from AgentRuntimePanel; the
//     synthetic voice line comes from STYLING_COPY[language].feedbackVoice). ---
const feedbackActions: Array<{
  label: string;
  dimension: FeedbackDimension;
  dimensionValue: string;
}> = [
  { label: "Color", dimension: "color", dimensionValue: "red" },
  { label: "Fit", dimension: "fit", dimensionValue: "too_loose" },
  { label: "Style", dimension: "style", dimensionValue: "too_formal" },
  { label: "Price", dimension: "price", dimensionValue: "lower_price" },
  { label: "All", dimension: "overall", dimensionValue: "reject_all" }
];

// The outfit-slot key set (matches RecProduct.category / OutfitSlotName).
const SLOT_KEYS = ["outerwear", "top", "bottom", "dress", "shoes", "accessory"];

// Phrasing → outfit slot, merged across zh/en/ja so the NLU works in whatever
// language the customer speaks. Multi-char zh words (连衣裙) listed before their
// substrings so they win; English terms are word-bounded.
const SLOT_PATTERNS: Array<{ slot: string; re: RegExp }> = [
  {
    slot: "outerwear",
    re: /(外套|大衣|夹克|风衣|羽绒服|\bjackets?\b|\bcoats?\b|\bouterwear\b|\bblazers?\b|ジャケット|コート|アウター)/i
  },
  { slot: "dress", re: /(连衣裙|连身裙|长裙|裙装|\bdress(?:es)?\b|ワンピース|ドレス)/i },
  {
    slot: "top",
    re: /(上衣|上装|衬衫|衬衣|t恤|体恤|毛衣|卫衣|针织|上半身|上身|\btops?\b|\bshirts?\b|\btees?\b|\bt-shirts?\b|\bsweaters?\b|\bblouses?\b|\bhoodies?\b|トップス|シャツ|セーター|ニット)/i
  },
  {
    slot: "bottom",
    re: /(裤子|裤|下装|下半身|下身|短裤|长裤|牛仔裤|半身裙|\bpants\b|\btrousers\b|\bjeans\b|\bskirts?\b|\bshorts\b|\bbottoms?\b|パンツ|ズボン|スカート|ジーンズ)/i
  },
  {
    slot: "shoes",
    re: /(鞋子|鞋|靴子|高跟|运动鞋|\bshoes?\b|\bsneakers?\b|\bboots?\b|\bheels?\b|\bloafers?\b|シューズ|スニーカー|ブーツ|ヒール|靴)/i
  },
  {
    slot: "accessory",
    re: /(配饰|饰品|包包|包|帽子|帽|项链|围巾|腰带|首饰|\bbags?\b|\baccessor\w*\b|\bhats?\b|\bscar(?:f|ves)\b|\bbelts?\b|\bnecklaces?\b|\bjewelry\b|バッグ|かばん|アクセサリー|ネックレス|マフラー|ベルト)/i
  }
];

// "换掉/不喜欢/don't like/替えて…" — a dislike or replace intent (NOT 不错, which
// is positive). English verbs are word-bounded so "exchange" noise doesn't misfire.
const SWAP_VERB =
  /(换|不喜欢|不太喜欢|不想要|不要|不满意|不行|不合适|不好看|重新|重挑|再换|难看|丑|\bswap\b|\bchange\b|\breplace\b|\bdon'?t\s+(?:like|want)\b|\bnot\s+a\s+fan\b|\bdifferent\b|\banother\b|\bugly\b|\bhate\b|変え|替え|好きじゃない|嫌い|ダサい|イマイチ)/gi;

/**
 * Does the customer want ONE slot swapped ("不喜欢上衣，其余都不错")? Returns the
 * slot whose keyword sits CLOSEST to a dislike/replace verb — so "上衣不错，鞋子
 * 换一下" swaps the shoes, not the top. Only returns slots the current look
 * actually has (`availableSlots`). Null when it reads as a fresh request.
 */
function detectSlotSwap(text: string, availableSlots: string[]): string | null {
  const verbs = [...text.matchAll(SWAP_VERB)].map((m) => m.index ?? 0);
  if (verbs.length === 0) return null;
  let best: string | null = null;
  let bestDist = Infinity;
  for (const { slot, re } of SLOT_PATTERNS) {
    if (!availableSlots.includes(slot)) continue;
    const match = re.exec(text);
    if (!match || match.index === undefined) continue;
    for (const v of verbs) {
      const dist = Math.abs(v - match.index);
      if (dist < bestDist) {
        bestDist = dist;
        best = slot;
      }
    }
  }
  return best;
}

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
  language,
  captureDataUrl,
  onComplete,
  onBack
}: {
  analysis: AnalysisHandoff;
  copy: Copy;
  language: Language;
  captureDataUrl: string | null;
  onComplete: () => void;
  onBack: () => void;
}) {
  // All customer-facing copy (text + spoken lines) for the selected language.
  const T = STYLING_COPY[language];
  const [run, setRun] = useState<AgentRunResponse | null>(null);
  const [customerNeed, setCustomerNeed] = useState(T.defaultCustomerNeed);
  // What the customer has said this session — kept only in memory, shown top-right
  // as conversation context (most-recent first). Not persisted.
  const [utterances, setUtterances] = useState<string[]>([]);
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
  // Last live camera frame, frozen under the scan-line while Lucy connects, and
  // whether Lucy's real stream has painted its first frame yet.
  const [frozenFrame, setFrozenFrame] = useState<string | null>(null);
  const [lucyPainted, setLucyPainted] = useState(false);
  const [petMessage, setPetMessage] = useState<string | undefined>(T.petGreeting);
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
    const response = await createAgentSession(analysis, "mirror", "store_001", language);
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
      runTools(T.toolsRecommend);
      // Phase 1 — acknowledge in the customer's own words the moment they finish
      // speaking, while the steps run: "啊，明天要参加朋友的婚礼是吗？…"
      const echo = echoRequest(text, language);
      const ack = echo ? T.ackEcho(echo) : T.ackPlain;
      setPetMessage(ack);
      speech.speak(ack);
      let line: string | undefined;
      try {
        const sessionId = await ensureAgentSession();
        const response = await sendAgentChat(sessionId, text, language);
        applyRun(response);
        setShowConfirm(false);
        if (response.state.recommendation_sets.length > 0) {
          line = (response.output as { message?: string }).message ?? T.lineLooksReady;
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

    // Freeze the last live camera frame so there's a still of the customer to
    // hold under the scan-line while Lucy's stream connects — no black gap.
    const frame = captureMirrorFrame();
    setFrozenFrame(frame);
    setLucyPainted(false);

    const personImage = frame ?? captureDataUrl;
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
      speech.speak(T.lineOnYou);
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
    setFrozenFrame(null);
    setLucyPainted(false);
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
      runTools(T.toolsFeedback);
      setPetMessage(T.petAdjusting);
      let line: string | undefined;
      try {
        const response = await sendAgentFeedback(agentSessionId, {
          set_id: selectedSet.set_id,
          feedback_type: action.dimension === "overall" ? "reject_all" : "partial_adjust",
          dimension: action.dimension,
          dimension_value: action.dimensionValue,
          raw_voice_text: T.feedbackVoice[action.dimension]
        });
        applyRun(response);
        if (response.state.recommendation_sets.length > 0) line = T.lineRestyled;
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

  // Swap a single slot in the selected look ("换掉上衣，其余保留"), keeping the
  // rest untouched. The disliked slot comes from the customer's own words.
  function handleSwapSlot(category: string, saidText: string) {
    void execute(`swap_${category}`, async () => {
      if (!agentSessionId || !selectedSet) return;
      const label = T.slotLabel[category] ?? T.slotFallback;
      runTools(T.toolsSwap(label));
      setPetMessage(T.petSwapping(label));
      let line: string | undefined;
      try {
        const response = await sendAgentFeedback(agentSessionId, {
          set_id: selectedSet.set_id,
          feedback_type: "swap_slot",
          dimension_value: category,
          raw_voice_text: saidText
        });
        applyRun(response);
        const swapped = (response.output as { type?: string }).type === "recommendations_refined";
        if (swapped) line = T.petSwapped(label);
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
      speech.speak(T.lineReserved);
      setPetMessage(T.lineReserved);
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
  const speech = useSpeech(SPEECH_LANG[language]);
  const stt = useSpeechRecognition({ lang: SPEECH_LANG[language], continuous: true });
  const micLevel = useAudioLevel(stt.listening);
  const auraState: SiriOrbState = stt.listening
    ? "listening"
    : speech.speaking
      ? "speaking"
      : "idle";

  // While the customer is talking (✋ / mic), take over the whole screen with the
  // same describe-your-need voice UI — hide the looks list so it's a focused
  // conversation, not a cluttered overlay. Not during a full-bleed try-on.
  const talking = stt.listening;
  const showVoice = (voiceMode || talking) && !tryonActive;

  // Reveal the live Lucy stream only once it has actually painted a frame — until
  // then the frozen camera still (with the scan-line) stays on top. Prefer the
  // exact first painted frame (requestVideoFrameCallback); fall back to media
  // events, and a hard timeout so a stalled stream never traps the freeze.
  useEffect(() => {
    if (!tryonActive || showMockPreview || !frozenFrame || lucyPainted) return;
    const video = lucy.remoteVideoRef.current;
    if (!video) return;
    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      setLucyPainted(true);
    };
    const onFrame = () => window.setTimeout(reveal, 120);
    type RVFCVideo = HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };
    const rvfc = video as RVFCVideo;
    if (typeof rvfc.requestVideoFrameCallback === "function") {
      rvfc.requestVideoFrameCallback(onFrame);
    } else {
      video.addEventListener("loadeddata", onFrame, { once: true });
      video.addEventListener("playing", onFrame, { once: true });
    }
    const fallback = window.setTimeout(reveal, 6000); // never trap the freeze
    return () => {
      done = true;
      window.clearTimeout(fallback);
      video.removeEventListener("loadeddata", onFrame);
      video.removeEventListener("playing", onFrame);
    };
  }, [tryonActive, showMockPreview, frozenFrame, lucyPainted, lucy.remoteVideoRef]);

  // Voice-first: a tap (or gesture) starts listening; the next one stops and
  // submits what was heard. No big form — just the mirror and your voice.
  function toggleVoice() {
    if (stt.listening) {
      // Wait for the recognizer to flush — the last words often finalize AFTER
      // stop() returns, so a synchronous transcript read drops the tail.
      void stt.stopAndFlush().then((said) => {
        if (!said) return;
        setCustomerNeed(said);
        setUtterances((prev) => [said, ...prev].slice(0, 4));
        // "不喜欢上衣，其余都不错" → swap just that slot in the current look,
        // rather than starting a whole new recommendation.
        // Consider every slot (not just the ones in this look) — the server
        // re-resolves the exact slot with the model and can add-or-replace.
        const slot = !tryonActive && selectedSet ? detectSlotSwap(said, SLOT_KEYS) : null;
        if (slot) handleSwapSlot(slot, said);
        else handleStyleMe(said);
      });
    } else {
      speech.warm();
      setPetMessage(T.petListening);
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
      setPetMessage(T.lineCompliment);
      setPetMood("happy");
      speech.speak(T.lineCompliment);
      window.setTimeout(() => setPetMood("idle"), 2600);
    }
  });

  // The pet greets when the try-on opens.
  useEffect(() => {
    if (tryonActive) setPetMessage(T.petTryon);
  }, [tryonActive, T.petTryon]);

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

  // Warm the Gemini voice cache for the fixed lines (current language only) — but
  // a few seconds in, so the TTS calls don't contend with the first styling request.
  useEffect(() => {
    const lines = [T.lineLooksReady, T.lineOnYou, T.lineRestyled, T.lineReserved, T.lineCompliment];
    const id = window.setTimeout(() => speech.prefetch(lines), 5000);
    return () => window.clearTimeout(id);
  }, [speech.prefetch, language]);

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
          {T.cameraOn}
        </div>
      )}
      {(mirror.state === "denied" || mirror.state === "error") && (
        <div className="mirror-cam-note">
          {mirror.state === "denied" ? T.cameraDenied : T.cameraError}
        </div>
      )}

      {/* Hands-free finger-count selection (opt-in; touch always works). */}
      {gestureOn && (
        <div className="gesture-hint">
          {gesture.handPresent ? T.gestureHintHand : T.gestureHintNoHand}
        </div>
      )}

      {/* Conversation context — what the customer has said, kept top-right so the
          mirror visibly "remembers" it while they talk. In-memory only. */}
      {showVoice && utterances.length > 0 && (
        <aside className="mirror-context" aria-label={T.contextAria}>
          <span className="mirror-context-label">{T.contextLabel}</span>
          <ul>
            {utterances.slice(0, 3).map((line, index) => (
              <li key={`${index}-${line}`} data-recent={index === 0 ? "true" : undefined}>
                “{line}”
              </li>
            ))}
          </ul>
        </aside>
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
          {/* Frozen last camera frame held under the scan-line until Lucy paints;
              fades out the moment the real stream has its first frame. */}
          {!showMockPreview && frozenFrame && (
            <img
              className="mirror-freeze"
              src={frozenFrame}
              alt=""
              aria-hidden="true"
              data-revealed={lucyPainted ? "true" : undefined}
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
                <strong>{tryonGenerating ? T.tryonApplying : T.tryonGenerating}</strong>
                <span>{T.tryonWait}</span>
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
                {T.tryonBackToLooks}
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
                {T.tryonChoose}
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
            <MicroLabel>{T.checkoutReserved}</MicroLabel>
            <h2 className="checkout-title">{T.checkoutTitle}</h2>
            <div className="checkout-lines">
              {reservedSet.products.map((product) => (
                <div className="checkout-line" key={product.product_id}>
                  <span>{product.name}</span>
                  <PriceTag amount={product.price_yen} size="md" />
                </div>
              ))}
            </div>
            <div className="checkout-total">
              <span>{T.checkoutTotal}</span>
              <PriceTag
                amount={reservedSet.products.reduce((sum, p) => sum + p.price_yen, 0)}
                size="lg"
                countUp
              />
            </div>
            <p className="checkout-note">{T.checkoutNote}</p>
            <Button variant="primary" size="lg" block onClick={onComplete}>
              {T.checkoutDone}
            </Button>
          </div>
        </div>
      )}

      {/* Read-bar for a held gesture — floats above the sheet. */}
      {gesture.armedGesture && (
        <div className="mirror-readbar">
          <GestureReadBar action={gesture.armedGesture} dwellMs={gesture.dwellMs} language={language} />
        </div>
      )}

      {/* Minimal controls floating over the reflection — no big sheet. */}
      <div
        className="mirror-content"
        data-dim={tryonActive ? "true" : undefined}
        data-mode={showVoice ? "voice" : "sheet"}
      >
        <div className="mirror-topbar">
          <button className="mirror-back" type="button" onClick={onBack} aria-label="Back">
            {T.back}
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

        {/* Voice-first panel — the describe-your-need UI. Shown when idle (no
            looks yet) AND whenever the customer is talking, so ✋ over a look
            list becomes a focused conversation instead of a cluttered overlay. */}
        {showVoice && (
          <div className="mirror-voice">
            <div className="mirror-voice-title">
              {hasSets ? T.voiceTitleAdjust : T.voiceTitleIdle}
            </div>
            <LiveTranscript text={stt.transcript} listening={stt.listening} />
            <div className="mirror-talk-wrap">
              {/* The orb IS the talk button — no separate cobalt mic disc. */}
              <button
                className={`mirror-talk mirror-talk-orb ${stt.listening ? "on" : ""}`}
                type="button"
                onClick={stt.supported ? toggleVoice : () => handleStyleMe(T.defaultCustomerNeed)}
                aria-pressed={stt.listening}
                aria-label={stt.listening ? "Stop and send" : "Tap to talk"}
              >
                <SiriOrb state={auraState} amplitude={micLevel} size={76} />
              </button>
            </div>
            <div className="mirror-voice-hint">
              {stt.listening ? T.voiceHintListening : T.voiceHintIdle}
            </div>
            {gestureOn && (
              <GestureHint only={["talk"]} active={stt.listening ? "talk" : null} language={language} />
            )}
            {!hasSets && (
              <button
                className="mirror-voice-skip"
                type="button"
                disabled={busyAction !== null}
                onClick={() => handleStyleMe(T.defaultCustomerNeed)}
              >
                {T.voiceSkip}
              </button>
            )}
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

        {/* Three looks as a compact strip — switch with fingers 1·2·3, still see
            yourself. Hidden while talking so the voice panel owns the screen, and
            while confirming so the confirm card takes its place (the sheet is
            height-capped and scroll-hidden — stacked below, it was never seen). */}
        {hasSets && !working && !talking && !showConfirm && (
          <div className="mirror-looks">
            <LookStrip
              looks={recommendationSets.map((set) => ({
                id: set.set_id,
                recType: set.rec_type,
                recLabel: T.recLabel[set.rec_type] ?? set.rec_type,
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
              hint={gestureOn ? T.lookHintGesture : T.lookHintTouch}
            />
            {gestureOn && (
              <GestureHint active={gesture.armedChoice !== null ? "pick" : null} language={language} />
            )}
          </div>
        )}

        {/* Confirm summary. */}
        {showConfirm && selectedSet && !talking && (
          <div className="styling-confirm">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <RecTypeLabel recType={selectedSet.rec_type} />
              <MicroLabel>{T.yourPick}</MicroLabel>
            </div>
            <div className="styling-confirm-total">
              <span>{T.confirmTotal}</span>
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
              {T.confirmReserve}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
