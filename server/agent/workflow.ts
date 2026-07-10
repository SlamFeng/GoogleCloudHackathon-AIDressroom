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
import { parseFeedback } from "./parsers.js";
import { classifyIntent, extractNeed } from "./reasoning.js";
import { requestTryonGeneration } from "./tryon-adapter.js";
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

  async handleCustomerInput(state: AgentState, text: string): Promise<WorkflowResult> {
    this.ensureBodyTemplate(state);
    // Intent and need both parse the same text — run them concurrently so their
    // two model calls overlap instead of stacking.
    const [route, need] = await Promise.all([classifyIntent(text), extractNeed(text)]);
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
    state.user_need = need;
    mergeParsedNeedIntoConstraints(state, state.user_need);

    const requestedTypes: RecommendationType[] =
      route === "explicit" ? ["explicit_need"] : ["similar", "style", "seasonal"];
    const response = await this.callGetRecommendations(state, requestedTypes);
    return {
      state,
      output: {
        type: "recommendations",
        route,
        message: buildRecoMessage(state, response),
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

  async applyFeedback(state: AgentState, feedback: FeedbackPayloadInput): Promise<WorkflowResult> {
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

    const response = await this.callRefineRecommendations(state, feedback.set_id, delta);
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

    // Place a hold on the selected outfit's stock. A failure here (an item sold
    // out between recommendation and confirmation) is surfaced so the flow can
    // re-plan the affected slot instead of silently proceeding.
    const reservation = await this.tools.reserveOutfit({ session_id: state.session_id, set: selected });
    if (reservation.ok) {
      state.reservation = {
        reservation_id: reservation.reservation.reservation_id,
        status: reservation.reservation.status
      };
    } else {
      state.reservation = { ok: false, reason: reservation.reason, shortfalls: reservation.shortfalls };
      state.errors.push("reservation_failed");
    }
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
    // If the image_tryon service is configured, kick off real generation;
    // otherwise this is null and the mock handoff stands (offline/demo path).
    const generation = await requestTryonGeneration(handoff);
    syncToolCalls(state, this.tools);
    return {
      state,
      output: {
        type: "tryon_handoff",
        handoff: accepted,
        reservation: state.reservation,
        generation
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

  private async callGetRecommendations(
    state: AgentState,
    requestedTypes: RecommendationType[]
  ): Promise<RecommendationResponse> {
    state.recommendation_round += 1;
    const response = await this.tools.getRecommendations({
      session_id: state.session_id,
      route: state.route,
      requested_types: requestedTypes,
      matched_body_template_id: state.matched_body_template_id ?? "body_template_unknown_unknown",
      current_style: state.analysis?.outfit_profile.overall_style ?? ["unknown"],
      current_colors: state.analysis?.outfit_profile.dominant_colors.map((color) => color.name) ?? [],
      gender: state.analysis?.body_profile.gender_presentation,
      age_range: state.analysis?.body_profile.age_range,
      constraints: state.constraints,
      round: state.recommendation_round
    });
    addRecommendationResponse(state, response);
    syncToolCalls(state, this.tools);
    return response;
  }

  private async callRefineRecommendations(
    state: AgentState,
    previousSetId: string,
    delta: ConstraintDelta
  ): Promise<RecommendationResponse> {
    state.recommendation_round += 1;
    const response = await this.tools.refineRecommendations({
      session_id: state.session_id,
      route: state.route === "unclear" ? "recommendation" : state.route,
      previous_set_id: previousSetId,
      delta,
      matched_body_template_id: state.matched_body_template_id ?? "body_template_unknown_unknown",
      current_style: state.analysis?.outfit_profile.overall_style ?? ["unknown"],
      current_colors: state.analysis?.outfit_profile.dominant_colors.map((color) => color.name) ?? [],
      gender: state.analysis?.body_profile.gender_presentation,
      age_range: state.analysis?.body_profile.age_range,
      constraints: state.constraints,
      round: state.recommendation_round
    });
    addRecommendationResponse(state, response);
    syncToolCalls(state, this.tools);
    return response;
  }

  /**
   * Terminal purchase step (user picked "确认购买"). Commits the hold placed at
   * confirm time to a real stock decrement and returns the in-store pickup route.
   */
  async purchaseSelected(state: AgentState): Promise<WorkflowResult> {
    const held = state.reservation;
    if (!held || !("reservation_id" in held)) {
      return { state, output: { type: "failed", reason: "no_active_reservation" } };
    }

    const reservation = await this.tools.confirmPurchase({
      session_id: state.session_id,
      reservation_id: held.reservation_id
    });
    if (!reservation || reservation.status !== "confirmed") {
      state.errors.push("purchase_failed");
      syncToolCalls(state, this.tools);
      return { state, output: { type: "failed", reason: "purchase_failed" } };
    }

    const selected = findSet(state, state.selected_set_id ?? "");
    const productIds = selected ? selected.products.map((product) => product.product_id) : [];
    const route = await this.tools.createStoreRoute({ session_id: state.session_id, product_ids: productIds });

    state.reservation = { reservation_id: reservation.reservation_id, status: reservation.status };
    state.store_route = route;
    state.loop_status = "confirmed";
    syncToolCalls(state, this.tools);
    return {
      state,
      output: {
        type: "purchase_completed",
        reservation_id: reservation.reservation_id,
        store_route: route
      }
    };
  }
}

// Echo the customer's own words instead of a hardcoded occasion table: pull a
// short "(要)去 / 参加 / 上 …" phrase straight from their message, stopping at the
// next particle so it doesn't over-match.
function occasionEcho(raw: string): string | undefined {
  const m = raw.match(/(要?去|参加|上)([一-龥]{2,4}?)(?=[的了，。！？、\s穿玩时想要能有请帮给吗呢啊]|$)/);
  return m ? `${m[1]}${m[2]}` : undefined;
}

/** A spoken acknowledgement that echoes the customer's actual request + whether trends were used. */
function buildRecoMessage(state: AgentState, response: RecommendationResponse): string {
  const echo = occasionEcho(state.user_need?.raw_text ?? "");
  const trendUsed = state.tool_calls.some(
    (call) => call.tool === "get_trending_styles" && (call.output as { used_google_search?: boolean }).used_google_search
  );
  const lead = echo ? `你${echo}对吧？` : "";
  const trend = trendUsed ? "结合当季流行趋势，" : "";
  return `${lead}OK，${trend}帮你挑了${response.sets.length}套现货，选一套试穿吧。`;
}

function addRecommendationResponse(state: AgentState, response: RecommendationResponse) {
  state.recommendation_sets.push(...response.sets);
  state.shown_set_ids.push(...response.sets.map((set) => set.set_id));
}

function findSet(state: AgentState, setId: string): RecommendationSet | undefined {
  return state.recommendation_sets.find((set) => set.set_id === setId);
}

function mergeParsedNeedIntoConstraints(
  state: AgentState,
  need: { colors: string[]; style_tags: string[]; categories?: string[]; occasion?: string; budget_yen?: number }
) {
  for (const color of need.colors) {
    state.constraints.prefer.push({ dimension: "color", value: color, reason: "explicit_need" });
  }
  for (const style of need.style_tags) {
    state.constraints.prefer.push({ dimension: "style", value: style, reason: "explicit_need" });
  }
  for (const category of need.categories ?? []) {
    state.constraints.prefer.push({ dimension: "category", value: category, reason: "explicit_need" });
  }
  if (need.occasion) {
    state.constraints.prefer.push({ dimension: "occasion", value: need.occasion, reason: "explicit_need" });
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
