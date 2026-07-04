"""FastAPI adapter for the Agent foundation prototype.

This API is intentionally backed by in-memory sessions and mock tools only.
It is suitable for frontend integration and local demos, not production storage.
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .contracts import (
    AnalysisResult,
    FaceMode,
    FeedbackDimension,
    FeedbackPayload,
    FeedbackType,
    InputSource,
    SceneType,
)
from .state import AgentState
from .workflow import AgentWorkflow

app = FastAPI(
    title="Clothing Store Inventory + Sales Agent API",
    version="0.1.0",
    description="Mock-first Agent foundation API for hackathon integration.",
)

workflow = AgentWorkflow()
sessions: dict[str, AgentState] = {}


class AnalysisInput(BaseModel):
    matched_body_template_id: str = "body_template_03"
    current_style: list[str] = Field(default_factory=lambda: ["casual"])
    confidence: float = 0.82
    dominant_colors: list[str] = Field(default_factory=list)
    analysis_id: str | None = None
    photo_url: str | None = None


class StartSessionRequest(BaseModel):
    scene_type: SceneType = SceneType.MIRROR
    store_id: str = "store_001"
    session_id: str | None = None
    analysis: AnalysisInput | None = None


class ChatRequest(BaseModel):
    session_id: str
    text: str


class FeedbackRequest(BaseModel):
    session_id: str
    set_id: str
    feedback_type: FeedbackType = FeedbackType.PARTIAL_ADJUST
    source: InputSource = InputSource.QUICK_TAG
    dimension: FeedbackDimension | None = None
    dimension_value: str | None = None
    raw_voice_text: str | None = None
    target_product_id: str | None = None


class ConfirmRequest(BaseModel):
    session_id: str
    set_id: str
    consent_given: bool = False
    image_ref: str | None = None


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "agent-foundation",
        "session_count": len(sessions),
    }


@app.post("/session/start")
def start_session(request: StartSessionRequest) -> dict[str, Any]:
    analysis = None
    if request.analysis:
        analysis = AnalysisResult(
            matched_body_template_id=request.analysis.matched_body_template_id,
            current_style=request.analysis.current_style,
            confidence=request.analysis.confidence,
            dominant_colors=request.analysis.dominant_colors,
            analysis_id=request.analysis.analysis_id,
            photo_url=request.analysis.photo_url,
        )
    state = workflow.start_session(
        scene_type=request.scene_type,
        store_id=request.store_id,
        session_id=request.session_id,
        analysis=analysis,
    )
    sessions[state.session_id] = state
    return {"session": state.to_dict()}


@app.post("/chat")
def chat(request: ChatRequest) -> dict[str, Any]:
    state = _get_session(request.session_id)
    result = workflow.handle_customer_input(state, request.text)
    return result.to_dict()


@app.post("/feedback")
def feedback(request: FeedbackRequest) -> dict[str, Any]:
    state = _get_session(request.session_id)
    payload = FeedbackPayload(
        session_id=request.session_id,
        set_id=request.set_id,
        feedback_type=request.feedback_type,
        source=request.source,
        dimension=request.dimension,
        dimension_value=request.dimension_value,
        raw_voice_text=request.raw_voice_text,
        target_product_id=request.target_product_id,
    )
    result = workflow.apply_feedback(state, payload)
    return result.to_dict()


@app.post("/confirm")
def confirm(request: ConfirmRequest) -> dict[str, Any]:
    state = _get_session(request.session_id)
    result = workflow.confirm_and_handoff(
        state,
        set_id=request.set_id,
        consent_given=request.consent_given,
        image_ref=request.image_ref,
    )
    return result.to_dict()


@app.get("/sessions/{session_id}")
def get_session(session_id: str) -> dict[str, Any]:
    state = _get_session(session_id)
    return {"session": state.to_dict()}


@app.get("/tool-calls")
def get_tool_calls() -> dict[str, Any]:
    return {"tool_calls": workflow.tools.log.calls}


def _get_session(session_id: str) -> AgentState:
    state = sessions.get(session_id)
    if state is None:
        raise HTTPException(status_code=404, detail=f"session not found: {session_id}")
    return state
