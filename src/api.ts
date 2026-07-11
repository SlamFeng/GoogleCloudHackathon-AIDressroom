import type { AnalysisHandoff, BodyProfile, ManualProfile } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const ANALYSIS_MODE = import.meta.env.VITE_ANALYSIS_MODE ?? "auto";

export type SceneType = "mirror" | "entrance_screen" | "staff_ipad";
export type Route = "explicit" | "recommendation" | "unclear";
export type AgentSessionStatus =
  | "communicating"
  | "recommending"
  | "previewing"
  | "confirmed"
  | "handoff_ready"
  | "staff_takeover"
  | "ended";
export type RecommendationType = "explicit_need" | "similar" | "style" | "seasonal";
export type FeedbackType = "reject_all" | "partial_adjust" | "positive_keep" | "confirm" | "swap_slot";
export type FeedbackDimension = "color" | "fit" | "style" | "price" | "overall";
export type OutfitSlotName = "outerwear" | "top" | "bottom" | "dress" | "shoes" | "accessory";
export type LucyPreviewStatus = "previewing" | "stopped" | "failed";
export type AhaDemoStage =
  | "idle"
  | "lucy_preview"
  | "google_generating"
  | "google_ready"
  | "handoff_ready";
export type GoogleGenerationStatus = "idle" | "queued" | "generating" | "ready";

export interface AgentConstraint {
  dimension: FeedbackDimension | "category" | "body_template" | "occasion";
  value: string;
  reason: string;
}

export interface AgentConstraints {
  prefer: AgentConstraint[];
  avoid: AgentConstraint[];
  budget_yen?: number;
}

export interface Product {
  product_id: string;
  sku: string;
  name: string;
  category: OutfitSlotName;
  price_yen: number;
  colors: string[];
  style_tags: string[];
  body_template_tags: string[];
  seasonal_rank: number;
  stock: Record<string, number>;
  image_url: string;
  vton_reference_image_url: string;
  vton_prompt: string;
}

export interface OutfitSlot {
  slot: OutfitSlotName;
  product_id: string;
  image_url: string;
  vton_reference_image_url: string;
  prompt: string;
}

export interface OutfitPayload {
  slots: OutfitSlot[];
}

export interface RecommendationSet {
  set_id: string;
  round: number;
  rec_type: RecommendationType;
  products: Product[];
  outfit: OutfitPayload;
  reason: string;
}

export interface RecommendationResponse {
  session_id: string;
  round: number;
  route: Route;
  sets: RecommendationSet[];
  warnings: string[];
}

export interface LucyRealtimeTryonPayload {
  provider: "decart_lucy_vton";
  mode: "realtime";
  configured: boolean;
  model: string;
  session_id: string;
  set_id: string;
  slot: OutfitSlotName;
  product_id: string;
  garment_image_url: string;
  prompt: string;
  duration_limit_sec: number;
  enhance: boolean;
  client_token: string | null;
  expires_at: string | null;
  warnings: string[];
}

export interface AhaDemoState {
  stage: AhaDemoStage;
  lucy_preview_started_at?: string;
  lucy_preview_limit_sec: number;
  google_generation_status: GoogleGenerationStatus;
  google_generation_eta_sec?: number;
  narrative: string;
}

export interface ToolCallRecord {
  tool: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  called_at: string;
}

export interface TryonHandoffPayload {
  session_id: string;
  set_id: string;
  template_id: string;
  outfit: OutfitPayload;
  use_own_face: boolean;
  user_face: { face_profile_id: string } | null;
  lucy_realtime_preview: LucyRealtimeTryonPayload | null;
  google_fallback: {
    provider: "google_vertex_tryon";
    mode: "static_or_async_video";
    session_id: string;
    set_id: string;
    template_id: string;
    outfit: OutfitPayload;
  };
}

export interface AgentState {
  session_id: string;
  scene_type: SceneType;
  store_id: string;
  status: AgentSessionStatus;
  route: Route;
  analysis?: AnalysisHandoff;
  matched_body_template_id?: string;
  constraints: AgentConstraints;
  recommendation_round: number;
  shown_set_ids: string[];
  recommendation_sets: RecommendationSet[];
  selected_set_id?: string;
  camera_processing_consent: boolean;
  face: {
    consent_given: boolean;
    face_mode: "real_face" | "default_face";
    face_profile_id?: string;
    expire_at?: string;
  };
  aha_demo: AhaDemoState;
  tool_calls: ToolCallRecord[];
  lucy_session_status: "idle" | "ready" | "previewing" | "stopped" | "failed";
  loop_status: "idle" | "clarifying" | "active" | "confirmed" | "staff_takeover";
  errors: string[];
}

export interface AgentRunResponse {
  state: AgentState;
  output:
    | { type: "agent_session_started"; session_id: string }
    | { type: "clarification"; message: string }
    | { type: "recommendations"; route: Route; recommendation: RecommendationResponse }
    | { type: "recommendations_refined"; recommendation: RecommendationResponse; constraint_delta: unknown }
    | { type: "realtime_tryon_payload"; payload: LucyRealtimeTryonPayload }
    | {
        type: "preview_status_recorded";
        status: LucyPreviewStatus;
        lucy_session_id?: string;
        reason?: string;
      }
    | { type: "confirmed"; set_id: string }
    | { type: "tryon_handoff"; handoff: TryonHandoffPayload }
    | { type: "feedback_recorded"; constraint_delta: unknown }
    | { type: "staff_takeover"; reason: string; constraint_delta: unknown }
    | { type: "failed"; reason: string };
  adk_session?: {
    app_name: string;
    user_id: string;
    session_id: string;
    event_count: number;
  };
  adk_events?: Array<{
    id?: string;
    invocation_id?: string;
    author: string;
    text: string;
    state_delta_keys: string[];
    timestamp?: number;
  }>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `请求失败（${response.status}）`);
  }

  return response.json() as Promise<T>;
}

export async function createSession(): Promise<{ session_id: string }> {
  return request("/api/sessions", { method: "POST", body: "{}" });
}

// Fire-and-forget: kick off the background Google trend search the moment the
// customer submits their profile, so later recommendations read it from cache.
export async function prewarmTrends(gender: string, ageRange: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/agent/prewarm-trends`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gender, age_range: ageRange })
    });
  } catch {
    // A failed prewarm just means the first turn may be trend-agnostic.
  }
}

export async function analyzeCapture(
  sessionId: string,
  manualProfile: ManualProfile,
  captureDataUrl: string,
  mode: string = ANALYSIS_MODE
): Promise<AnalysisHandoff> {
  return request(`/api/sessions/${sessionId}/analyses`, {
    method: "POST",
    body: JSON.stringify({
      manual_profile: manualProfile,
      capture_data_url: captureDataUrl,
      analysis_mode: mode
    })
  });
}

export async function confirmAnalysis(
  analysisId: string,
  bodyProfile: BodyProfile
): Promise<AnalysisHandoff> {
  return request(`/api/analyses/${analysisId}/confirm`, {
    method: "POST",
    body: JSON.stringify({ body_profile: bodyProfile })
  });
}

export async function createAgentSession(
  analysis: AnalysisHandoff,
  sceneType: SceneType = "mirror",
  storeId = "store_001"
): Promise<AgentRunResponse> {
  return request("/api/agent/sessions", {
    method: "POST",
    body: JSON.stringify({
      scene_type: sceneType,
      store_id: storeId,
      analysis
    })
  });
}

export async function sendAgentChat(
  agentSessionId: string,
  text: string
): Promise<AgentRunResponse> {
  return request(`/api/agent/sessions/${agentSessionId}/chat`, {
    method: "POST",
    body: JSON.stringify({ text })
  });
}

export async function requestRealtimePreview(
  agentSessionId: string,
  setId: string,
  slot?: OutfitSlotName,
  durationLimitSec = 12
): Promise<AgentRunResponse> {
  return request(`/api/agent/sessions/${agentSessionId}/preview`, {
    method: "POST",
    body: JSON.stringify({
      set_id: setId,
      slot,
      duration_limit_sec: durationLimitSec
    })
  });
}

// Gemini TTS for a line of agent speech → a playable audio data URL, or null
// when unavailable (client falls back to on-device speechSynthesis).
export async function synthesizeSpeech(text: string): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { audio_data_url: string | null };
    return data.audio_data_url ?? null;
  } catch {
    return null;
  }
}

// Background "high-quality try-on" image: the customer wearing the selected
// outfit. Returns null when generation isn't available (client keeps the
// live-mirror placeholder).
export async function generateTryonImage(
  personImage: string,
  productIds: string[],
  lookLabel?: string
): Promise<string | null> {
  const response = await fetch(`${API_BASE}/api/tryon-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ person_image: personImage, product_ids: productIds, look_label: lookLabel })
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { image_data_url: string | null };
  return data.image_data_url ?? null;
}

export async function recordPreviewStatus(
  agentSessionId: string,
  payload: {
    status: LucyPreviewStatus;
    reason?: string;
    lucy_session_id?: string;
  }
): Promise<AgentRunResponse> {
  return request(`/api/agent/sessions/${agentSessionId}/preview/status`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function sendAgentFeedback(
  agentSessionId: string,
  payload: {
    set_id: string;
    feedback_type?: FeedbackType;
    dimension?: FeedbackDimension;
    dimension_value?: string;
    raw_voice_text?: string;
  }
): Promise<AgentRunResponse> {
  return request(`/api/agent/sessions/${agentSessionId}/feedback`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function confirmAgentSelection(
  agentSessionId: string,
  payload: {
    set_id: string;
    camera_processing_consent?: boolean;
    face_profile_consent?: boolean;
    image_ref?: string;
  }
): Promise<AgentRunResponse> {
  return request(`/api/agent/sessions/${agentSessionId}/confirm`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
