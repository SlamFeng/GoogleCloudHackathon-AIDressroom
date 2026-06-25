"""Session state for the Agent foundation prototype."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .contracts import (
    AnalysisResult,
    FaceConsentState,
    FaceMode,
    RecommendationResponse,
    Route,
    SceneType,
    SessionStatus,
    UserNeedConstraints,
)


@dataclass(slots=True)
class AgentState:
    session_id: str
    scene_type: SceneType = SceneType.MIRROR
    store_id: str = "store_001"
    status: SessionStatus = SessionStatus.COMMUNICATING
    route: Route = Route.UNCLEAR
    analysis: AnalysisResult = field(
        default_factory=lambda: AnalysisResult(
            matched_body_template_id="body_template_03",
            current_style=["casual"],
            confidence=0.82,
        )
    )
    consent: FaceConsentState = field(
        default_factory=lambda: FaceConsentState(
            consent_given=False,
            face_mode=FaceMode.DEFAULT_FACE,
        )
    )
    user_need: UserNeedConstraints = field(default_factory=UserNeedConstraints)
    recommendation_round: int = 0
    shown_set_ids: list[str] = field(default_factory=list)
    selected_set_id: str | None = None
    feedback_history: list[dict[str, Any]] = field(default_factory=list)
    loop_status: str = "collecting"
    last_recommendation: RecommendationResponse | None = None
    last_tool_result: dict[str, Any] | None = None
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "session_id": self.session_id,
            "scene_type": self.scene_type.value,
            "store_id": self.store_id,
            "status": self.status.value,
            "route": self.route.value,
            "analysis": self.analysis.to_dict(),
            "consent": self.consent.to_dict(),
            "user_need": self.user_need.to_dict(),
            "recommendation_round": self.recommendation_round,
            "shown_set_ids": list(self.shown_set_ids),
            "selected_set_id": self.selected_set_id,
            "feedback_history": list(self.feedback_history),
            "loop_status": self.loop_status,
            "last_tool_result": self.last_tool_result,
            "errors": list(self.errors),
        }
