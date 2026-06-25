"""Deterministic Agent workflow prototype."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import uuid4

from .contracts import (
    AnalysisResult,
    FaceMode,
    FeedbackPayload,
    FeedbackType,
    InputSource,
    RecommendationType,
    Route,
    SceneType,
    SessionContext,
    SessionStatus,
    ToolStatus,
)
from .mock_tools import MockRetailTools
from .parsers import parse_feedback, parse_need, route_intent
from .state import AgentState


@dataclass(slots=True)
class WorkflowResult:
    state: AgentState
    output: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {"state": self.state.to_dict(), "output": self.output}


class AgentWorkflow:
    def __init__(self, tools: MockRetailTools | None = None, max_rounds: int = 3):
        self.tools = tools or MockRetailTools()
        self.max_rounds = max_rounds

    def start_session(
        self,
        scene_type: SceneType = SceneType.MIRROR,
        store_id: str = "store_001",
        session_id: str | None = None,
        analysis: AnalysisResult | None = None,
    ) -> AgentState:
        state = AgentState(
            session_id=session_id or f"s_{uuid4().hex[:8]}",
            scene_type=scene_type,
            store_id=store_id,
            status=SessionStatus.COMMUNICATING,
        )
        if analysis:
            state.analysis = analysis
        return state

    def handle_customer_input(self, state: AgentState, text: str) -> WorkflowResult:
        route = route_intent(text)
        state.route = route
        state.status = SessionStatus.RECOMMENDING

        if route == Route.UNCLEAR:
            state.loop_status = "clarifying"
            return WorkflowResult(
                state=state,
                output={
                    "type": "clarification",
                    "message": "Can you choose a direction: specific item, occasion, or recommendation?",
                },
            )

        if route == Route.EXPLICIT:
            state.user_need = parse_need(text)
            requested = [RecommendationType.EXPLICIT_NEED]
        else:
            state.user_need = parse_need(text)
            requested = [
                RecommendationType.SIMILAR,
                RecommendationType.STYLE,
                RecommendationType.SEASONAL,
            ]

        response = self._call_get_recommendations(state, requested)
        return WorkflowResult(
            state=state,
            output={
                "type": "recommendations",
                "route": route.value,
                "recommendation": response.to_dict(),
            },
        )

    def apply_feedback(
        self,
        state: AgentState,
        feedback: FeedbackPayload,
    ) -> WorkflowResult:
        if feedback.feedback_type == FeedbackType.CONFIRM:
            state.selected_set_id = feedback.set_id
            state.status = SessionStatus.CONFIRMED
            state.loop_status = "confirmed"
            return WorkflowResult(
                state=state,
                output={"type": "confirmed", "set_id": feedback.set_id},
            )

        delta = parse_feedback(feedback)
        self._merge_constraint_delta(state, delta)
        state.feedback_history.append(
            {
                "set_id": feedback.set_id,
                "feedback": feedback.to_dict(),
                "constraint_delta": delta.to_dict(),
            }
        )
        self.tools.record_feedback(
            session_id=state.session_id,
            set_id=feedback.set_id,
            feedback=feedback.to_dict(),
            constraint_delta=delta,
            idempotency_key=f"{state.session_id}-{feedback.set_id}-feedback-{len(state.feedback_history)}",
        )

        if not delta.requires_new_recommendation:
            return WorkflowResult(
                state=state,
                output={"type": "feedback_recorded", "constraint_delta": delta.to_dict()},
            )

        if state.recommendation_round >= self.max_rounds:
            state.loop_status = "staff_takeover"
            return WorkflowResult(
                state=state,
                output={
                    "type": "staff_takeover",
                    "reason": "max_rounds_reached",
                    "constraint_delta": delta.to_dict(),
                },
            )

        response = self._call_refine_recommendations(state, feedback.set_id, delta)
        return WorkflowResult(
            state=state,
            output={
                "type": "recommendations_refined",
                "constraint_delta": delta.to_dict(),
                "recommendation": response.to_dict(),
            },
        )

    def confirm_and_handoff(
        self,
        state: AgentState,
        set_id: str,
        consent_given: bool = False,
        image_ref: str | None = None,
    ) -> WorkflowResult:
        state.selected_set_id = set_id
        state.status = SessionStatus.CONFIRMED
        selected = self._find_set(state, set_id)
        product_combo = [product.product_id for product in selected.products] if selected else []

        if consent_given:
            face_result = self.tools.create_real_face_profile(
                session_id=state.session_id,
                image_ref=image_ref or f"gs://mock/{state.session_id}/frame.jpg",
                consent_given=True,
                expire_at="2026-07-10T23:59:00+09:00",
                idempotency_key=f"{state.session_id}-create-real-face",
            )
        else:
            face_result = self.tools.select_default_face_template(
                session_id=state.session_id,
                matched_body_template_id=state.analysis.matched_body_template_id,
                style_context=state.analysis.current_style,
                explicit_user_choice=None,
                idempotency_key=f"{state.session_id}-select-default-face",
            )

        if face_result["status"] != ToolStatus.SUCCESS.value:
            state.errors.append("face_profile_failed")
            return WorkflowResult(state=state, output={"type": "failed", "face": face_result})

        face_profile = face_result["face_profile"]
        state.consent.consent_given = face_profile["consent_given"]
        state.consent.face_mode = FaceMode(face_profile["face_mode"])
        state.consent.face_profile_id = face_profile.get("face_profile_id")
        state.consent.default_face_template_id = face_profile.get(
            "default_face_template_id"
        )
        state.consent.expire_at = face_profile.get("expire_at")

        handoff = self.tools.handoff_tryon_generation(
            session_id=state.session_id,
            set_id=set_id,
            product_combo=product_combo,
            base_template_id=state.analysis.matched_body_template_id,
            face_mode=state.consent.face_mode,
            face_profile_id=state.consent.face_profile_id,
            default_face_template_id=state.consent.default_face_template_id,
            idempotency_key=f"{state.session_id}-{set_id}-tryon",
        )
        return WorkflowResult(
            state=state,
            output={"type": "tryon_handoff", "face": face_result, "handoff": handoff},
        )

    def run_demo(
        self,
        text: str = "没想法，你推荐一套适合我的",
        feedback_text: str = "颜色太亮了",
        consent_given: bool = False,
    ) -> dict[str, Any]:
        state = self.start_session(session_id="s_demo")
        first = self.handle_customer_input(state, text)
        first_set_id = first.output["recommendation"]["sets"][0]["set_id"]
        feedback = FeedbackPayload(
            session_id=state.session_id,
            set_id=first_set_id,
            feedback_type=FeedbackType.PARTIAL_ADJUST,
            source=InputSource.QUICK_TAG,
            raw_voice_text=feedback_text,
        )
        refined = self.apply_feedback(state, feedback)
        refined_set_id = refined.output["recommendation"]["sets"][0]["set_id"]
        handoff = self.confirm_and_handoff(
            state,
            set_id=refined_set_id,
            consent_given=consent_given,
        )
        return {
            "first": first.output,
            "refined": refined.output,
            "handoff": handoff.output,
            "state": state.to_dict(),
            "tool_calls": list(self.tools.log.calls),
        }

    def _call_get_recommendations(
        self,
        state: AgentState,
        requested: list[RecommendationType],
    ):
        state.recommendation_round += 1
        context = self._context(state, "get-recommendations")
        response = self.tools.get_recommendations(
            session=context,
            analysis=state.analysis,
            constraints=state.user_need,
            requested_rec_types=requested,
        )
        state.last_recommendation = response
        state.shown_set_ids.extend(item.set_id for item in response.sets)
        state.last_tool_result = {
            "tool": "get_recommendations",
            "status": response.status.value,
        }
        state.loop_status = "recommending"
        return response

    def _call_refine_recommendations(
        self,
        state: AgentState,
        previous_set_id: str,
        delta,
    ):
        state.recommendation_round += 1
        context = self._context(state, "refine")
        response = self.tools.refine_recommendations(
            session=context,
            previous_set_id=previous_set_id,
            shown_set_ids=state.shown_set_ids,
            constraints=state.user_need,
            constraint_delta=delta,
        )
        state.last_recommendation = response
        state.shown_set_ids.extend(item.set_id for item in response.sets)
        state.last_tool_result = {
            "tool": "refine_recommendations",
            "status": response.status.value,
        }
        state.loop_status = "refining"
        return response

    def _context(self, state: AgentState, action: str) -> SessionContext:
        return SessionContext(
            session_id=state.session_id,
            scene_type=state.scene_type,
            store_id=state.store_id,
            route=state.route,
            status=state.status,
            round=state.recommendation_round,
            idempotency_key=f"{state.session_id}-r{state.recommendation_round}-{action}",
        )

    def _merge_constraint_delta(self, state: AgentState, delta) -> None:
        state.user_need.avoid = _dedupe_constraints(
            state.user_need.avoid + delta.avoid_add
        )
        state.user_need.keep = _dedupe_constraints(state.user_need.keep + delta.keep_add)
        if delta.budget_update:
            state.user_need.budget_range = delta.budget_update
        if delta.style_shift and delta.style_shift not in state.user_need.style_tags:
            state.user_need.style_tags.append(delta.style_shift)

    def _find_set(self, state: AgentState, set_id: str):
        if not state.last_recommendation:
            return None
        for recommendation_set in state.last_recommendation.sets:
            if recommendation_set.set_id == set_id:
                return recommendation_set
        return None


def _dedupe_constraints(items):
    result = []
    seen = set()
    for item in items:
        key = (item.dimension, item.value)
        if key not in seen:
            result.append(item)
            seen.add(key)
    return result
