import type {
  AgentConstraints,
  AgentLanguage,
  AhaDemoState,
  AnalysisHandoff,
  ConstraintDelta,
  FaceConsentState,
  ParsedNeed,
  RecommendationSet,
  Route,
  SceneType,
  SessionStatus,
  ToolCallRecord
} from "./contracts.js";

export interface FeedbackHistoryEntry {
  set_id: string;
  feedback: Record<string, unknown>;
  constraint_delta: ConstraintDelta;
  created_at: string;
}

export type ReservationState =
  | { reservation_id: string; status: string }
  | { ok: false; reason: string; shortfalls: Array<{ product_id: string; size: string; requested: number; available: number }> };

export interface StoreRouteState {
  summary: string;
  stops: Array<{ product_id: string; name: string; area: string; shelf: string }>;
}

export interface AgentState {
  session_id: string;
  scene_type: SceneType;
  store_id: string;
  // Customer-facing output language. Optional because sessions persisted before
  // this field existed restore without it; readers must fall back to "zh".
  language?: AgentLanguage;
  status: SessionStatus;
  route: Route;
  analysis?: AnalysisHandoff;
  matched_body_template_id?: string;
  user_need?: ParsedNeed;
  constraints: AgentConstraints;
  recommendation_round: number;
  shown_set_ids: string[];
  recommendation_sets: RecommendationSet[];
  selected_set_id?: string;
  feedback_history: FeedbackHistoryEntry[];
  camera_processing_consent: boolean;
  reservation?: ReservationState;
  store_route?: StoreRouteState;
  face: FaceConsentState;
  aha_demo: AhaDemoState;
  lucy_session_status: "idle" | "ready" | "previewing" | "stopped" | "failed";
  loop_status: "idle" | "clarifying" | "active" | "confirmed" | "staff_takeover";
  tool_calls: ToolCallRecord[];
  errors: string[];
}

export function createInitialAgentState(input: {
  session_id: string;
  scene_type: SceneType;
  store_id: string;
  language?: AgentLanguage;
  analysis?: AnalysisHandoff;
}): AgentState {
  return {
    session_id: input.session_id,
    scene_type: input.scene_type,
    store_id: input.store_id,
    language: input.language ?? "zh",
    status: "communicating",
    route: "unclear",
    analysis: input.analysis,
    constraints: {
      prefer: [],
      avoid: []
    },
    recommendation_round: 0,
    shown_set_ids: [],
    recommendation_sets: [],
    feedback_history: [],
    camera_processing_consent: false,
    face: {
      consent_given: false,
      face_mode: "default_face"
    },
    aha_demo: {
      stage: "idle",
      lucy_preview_limit_sec: 10,
      google_generation_status: "idle",
      narrative: "Waiting for a recommendation before the realtime-to-high-quality try-on handoff starts."
    },
    lucy_session_status: "idle",
    loop_status: "idle",
    tool_calls: [],
    errors: []
  };
}
