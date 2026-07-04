import { randomUUID } from "node:crypto";
import type {
  AnalysisHandoff,
  ConstraintDelta,
  FeedbackDimension,
  RecommendationResponse,
  RecommendationSet,
  RecommendationType,
  TryonHandoffPayload
} from "./contracts.js";
import { MockAgentTools } from "./mock-tools.js";
import { parseFeedback, parseNeed, routeIntent } from "./parsers.js";
import { createInitialAgentState, type AgentState } from "./state.js";
import type {
  ConfirmPayloadInput,
  FeedbackPayloadInput,
  PreviewStatusPayloadInput,
  PreviewTryonInput,
  StartAgentSessionInput,
  AgentRequestContext
} from "./types.js";

export interface WorkflowResult {
  state: AgentState;
  output: Record<string, unknown>;
}

export class AgentWorkflow {
  constructor(
    readonly tools = new MockAgentTools(),
    readonly maxRounds = 3
  ) {}

  startSession(input: StartAgentSessionInput): AgentState {
    return createInitialAgentState({
      session_id: `agent_${randomUUID().slice(0, 12)}`,
      scene_type: input.scene_type,
      store_id: input.store_id,
      analysis: input.analysis
    });
  }

  attachAnalysis(state: AgentState, analysis: AnalysisHandoff): WorkflowResult {
    state.analysis = analysis;
    return {
      state,
      output: {
        type: "analysis_attached",
        analysis_id: analysis.analysis_id
      }
    };
  }

  handleCustomerInput(state: AgentState, text: string): WorkflowResult {
    this.ensureBodyTemplate(state);
    const route = routeIntent(text);
    state.route = route;

    if (route === "unclear") {
      state.loop_status = "clarifying";
      state.status = "communicating";
      return {
        state,
        output: {
          type: "clarification",
          message: "请选一个方向：具体单品、使用场景，或者让我根据你当前穿搭推荐。"
        }
      };
    }

    state.status = "recommending";
    state.loop_status = "active";
    state.user_need = parseNeed(text);
    mergeParsedNeedIntoConstraints(state, state.user_need);

    const requestedTypes: RecommendationType[] =
      route === "explicit" ? ["explicit_need"] : ["similar", "style", "seasonal"];
    const response = this.callGetRecommendations(state, requestedTypes);
    return {
      state,
      output: {
        type: "recommendations",
        route,
        recommendation: response
      }
    };
  }

  async previewRealtimeTryon(
    state: AgentState,
    input: PreviewTryonInput,
    context: AgentRequestContext = {}
  ): Promise<WorkflowResult> {
    const set = findSet(state, input.set_id);
    if (!set) {
      state.errors.push("recommendation_set_not_found");
      return {
        state,
        output: {
          type: "failed",
          reason: "recommendation_set_not_found"
        }
      };
    }

    const payload = await this.tools.buildRealtimeTryonPayload({
      session_id: state.session_id,
      set,
      slot: input.slot,
      duration_limit_sec: input.duration_limit_sec,
      origin: context.origin
    });

    if (!payload) {
      state.errors.push("realtime_tryon_payload_empty");
      return {
        state,
        output: {
          type: "failed",
          reason: "realtime_tryon_payload_empty"
        }
      };
    }

    state.camera_processing_consent = true;
    state.selected_set_id = input.set_id;
    state.status = "previewing";
    state.lucy_session_status = "ready";
    state.aha_demo = {
      stage: "lucy_preview",
      lucy_preview_started_at: new Date().toISOString(),
      lucy_preview_limit_sec: payload.duration_limit_sec,
      google_generation_status: "queued",
      google_generation_eta_sec: payload.duration_limit_sec,
      narrative:
        "Lucy realtime preview starts immediately while the Google high-quality try-on fallback is queued in parallel."
    };
    syncToolCalls(state, this.tools);
    return {
      state,
      output: {
        type: "realtime_tryon_payload",
        payload
      }
    };
  }

  recordPreviewStatus(state: AgentState, input: PreviewStatusPayloadInput): WorkflowResult {
    state.lucy_session_status = input.status;
    if (input.status === "failed" && input.reason) state.errors.push(input.reason);

    if (input.status === "previewing") {
      state.status = "previewing";
      state.aha_demo = {
        ...state.aha_demo,
        stage: "lucy_preview",
        google_generation_status:
          state.aha_demo.google_generation_status === "idle"
            ? "queued"
            : state.aha_demo.google_generation_status,
        narrative:
          "The customer is seeing a low-latency Lucy preview; the higher-quality Google result is prepared as fallback."
      };
    }

    if (input.status === "stopped") {
      state.aha_demo = {
        ...state.aha_demo,
        stage:
          state.aha_demo.google_generation_status === "ready" ? "google_ready" : "google_generating",
        google_generation_status:
          state.aha_demo.google_generation_status === "idle"
            ? "generating"
            : state.aha_demo.google_generation_status,
        google_generation_eta_sec: 0,
        narrative:
          input.reason === "duration_limit_reached"
            ? "The realtime preview window ended; the demo can now switch attention to the high-quality Google fallback result."
            : "Realtime preview stopped; the Agent keeps the selected outfit and fallback handoff state."
      };
    }

    if (input.status === "failed") {
      state.aha_demo = {
        ...state.aha_demo,
        stage: "google_generating",
        google_generation_status: "generating",
        google_generation_eta_sec: 0,
        narrative:
          "Lucy realtime preview failed or was unavailable, so the flow keeps moving through the Google fallback handoff."
      };
    }

    return {
      state,
      output: {
        type: "preview_status_recorded",
        status: input.status,
        lucy_session_id: input.lucy_session_id,
        reason: input.reason
      }
    };
  }

  applyFeedback(state: AgentState, feedback: FeedbackPayloadInput): WorkflowResult {
    if (feedback.feedback_type === "confirm") {
      state.selected_set_id = feedback.set_id;
      state.status = "confirmed";
      state.loop_status = "confirmed";
      return {
        state,
        output: {
          type: "confirmed",
          set_id: feedback.set_id
        }
      };
    }

    const delta = parseFeedback(feedback);
    mergeConstraintDelta(state, delta);
    state.feedback_history.push({
      set_id: feedback.set_id,
      feedback,
      constraint_delta: delta,
      created_at: new Date().toISOString()
    });
    this.tools.recordFeedback({
      session_id: state.session_id,
      set_id: feedback.set_id,
      feedback,
      constraint_delta: delta
    });

    if (!delta.requires_new_recommendation) {
      syncToolCalls(state, this.tools);
      return {
        state,
        output: {
          type: "feedback_recorded",
          constraint_delta: delta
        }
      };
    }

    if (state.recommendation_round >= this.maxRounds) {
      state.status = "staff_takeover";
      state.loop_status = "staff_takeover";
      syncToolCalls(state, this.tools);
      return {
        state,
        output: {
          type: "staff_takeover",
          reason: "max_rounds_reached",
          constraint_delta: delta
        }
      };
    }

    const response = this.callRefineRecommendations(state, feedback.set_id, delta);
    return {
      state,
      output: {
        type: "recommendations_refined",
        constraint_delta: delta,
        recommendation: response
      }
    };
  }

  async confirmAndHandoff(
    state: AgentState,
    input: ConfirmPayloadInput,
    context: AgentRequestContext = {}
  ): Promise<WorkflowResult> {
    this.ensureBodyTemplate(state);
    const selected = findSet(state, input.set_id);
    if (!selected) {
      state.errors.push("recommendation_set_not_found");
      return {
        state,
        output: {
          type: "failed",
          reason: "recommendation_set_not_found"
        }
      };
    }

    state.selected_set_id = input.set_id;
    state.camera_processing_consent = input.camera_processing_consent;
    state.status = "handoff_ready";
    state.loop_status = "confirmed";
    state.lucy_session_status = "stopped";
    state.aha_demo = {
      ...state.aha_demo,
      stage: "handoff_ready",
      google_generation_status: "ready",
      google_generation_eta_sec: 0,
      narrative:
        "The selected outfit is confirmed; realtime preview is stopped and the high-quality try-on handoff is ready."
    };

    if (input.face_profile_consent) {
      const face = this.tools.createRealFaceProfile({
        session_id: state.session_id,
        image_ref: input.image_ref ?? `capture://${state.session_id}/latest`,
        consent_given: true,
        expire_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      });
      state.face = face;
    } else {
      state.face = {
        consent_given: false,
        face_mode: "default_face"
      };
    }

    const realtimePreview = input.camera_processing_consent
      ? await this.tools.buildRealtimeTryonPayload({
          session_id: state.session_id,
          set: selected,
          duration_limit_sec: 10,
          origin: context.origin
        })
      : null;

    const handoff: TryonHandoffPayload = {
      session_id: state.session_id,
      set_id: selected.set_id,
      template_id: state.matched_body_template_id ?? "",
      outfit: selected.outfit,
      use_own_face: state.face.face_mode === "real_face",
      user_face:
        state.face.face_mode === "real_face" && state.face.face_profile_id
          ? { face_profile_id: state.face.face_profile_id }
          : null,
      lucy_realtime_preview: realtimePreview,
      google_fallback: {
        provider: "google_vertex_tryon",
        mode: "static_or_async_video",
        session_id: state.session_id,
        set_id: selected.set_id,
        template_id: state.matched_body_template_id ?? "",
        outfit: selected.outfit
      }
    };
    const accepted = this.tools.handoffTryonGeneration(handoff);
    syncToolCalls(state, this.tools);
    return {
      state,
      output: {
        type: "tryon_handoff",
        handoff: accepted
      }
    };
  }

  ensureBodyTemplate(state: AgentState) {
    if (state.matched_body_template_id) return state.matched_body_template_id;
    if (!state.analysis) {
      state.matched_body_template_id = "body_template_unknown_unknown";
      return state.matched_body_template_id;
    }

    const result = this.tools.matchBodyTemplate({
      session_id: state.session_id,
      body_profile: state.analysis.body_profile
    });
    state.matched_body_template_id = result.template_id;
    syncToolCalls(state, this.tools);
    return result.template_id;
  }

  private callGetRecommendations(
    state: AgentState,
    requestedTypes: RecommendationType[]
  ): RecommendationResponse {
    state.recommendation_round += 1;
    const response = this.tools.getRecommendations({
      session_id: state.session_id,
      route: state.route,
      requested_types: requestedTypes,
      matched_body_template_id: state.matched_body_template_id ?? "body_template_unknown_unknown",
      current_style: state.analysis?.outfit_profile.overall_style ?? ["unknown"],
      constraints: state.constraints,
      round: state.recommendation_round
    });
    addRecommendationResponse(state, response);
    syncToolCalls(state, this.tools);
    return response;
  }

  private callRefineRecommendations(
    state: AgentState,
    previousSetId: string,
    delta: ConstraintDelta
  ): RecommendationResponse {
    state.recommendation_round += 1;
    const response = this.tools.refineRecommendations({
      session_id: state.session_id,
      route: state.route === "unclear" ? "recommendation" : state.route,
      previous_set_id: previousSetId,
      delta,
      matched_body_template_id: state.matched_body_template_id ?? "body_template_unknown_unknown",
      current_style: state.analysis?.outfit_profile.overall_style ?? ["unknown"],
      constraints: state.constraints,
      round: state.recommendation_round
    });
    addRecommendationResponse(state, response);
    syncToolCalls(state, this.tools);
    return response;
  }
}

function addRecommendationResponse(state: AgentState, response: RecommendationResponse) {
  state.recommendation_sets.push(...response.sets);
  state.shown_set_ids.push(...response.sets.map((set) => set.set_id));
}

function findSet(state: AgentState, setId: string): RecommendationSet | undefined {
  return state.recommendation_sets.find((set) => set.set_id === setId);
}

function mergeParsedNeedIntoConstraints(state: AgentState, need: { colors: string[]; style_tags: string[]; budget_yen?: number }) {
  for (const color of need.colors) {
    state.constraints.prefer.push({
      dimension: "color",
      value: color,
      reason: "explicit_need"
    });
  }
  for (const style of need.style_tags) {
    state.constraints.prefer.push({
      dimension: "style",
      value: style,
      reason: "explicit_need"
    });
  }
  if (need.budget_yen) state.constraints.budget_yen = need.budget_yen;
}

function mergeConstraintDelta(state: AgentState, delta: ConstraintDelta) {
  state.constraints.prefer.push(...delta.prefer);
  state.constraints.avoid.push(...delta.avoid);
  if (delta.budget_yen) state.constraints.budget_yen = delta.budget_yen;
}

function syncToolCalls(state: AgentState, tools: MockAgentTools) {
  state.tool_calls = tools.log.calls.filter((call) => call.input.session_id === state.session_id);
}
