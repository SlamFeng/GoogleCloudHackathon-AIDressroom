"""对外 3 个工具 + 异步状态查询(契约形状的 dict 入出参)。

- match_body_template:无状态。身材信息 → template_id + 原样回传 body_profile。
- generate_tryon:异步。立即返回 pending + generation_id。
- get_generation_status:轮询生成结果。
- select_default_face_template:见 faces.py。
"""

from __future__ import annotations

import uuid

from .contracts import ToolStatus, GenerationStatus, DEFAULT_VIEWS
from .manifest import load_library
from .matcher import BodyMatcher
from .validator import SEVERITY_ERROR
from .garment import Garment
from .jobs import STORE
from .render import render_tryon
from .faces import select_default_face_template  # re-export

__all__ = [
    "match_body_template", "generate_tryon", "get_generation_status",
    "select_default_face_template",
]

_LIBRARY = None


def _library():
    global _LIBRARY
    if _LIBRARY is None:
        _LIBRARY = load_library()
    return _LIBRARY


# ---------- 工具1 ----------
def match_body_template(body_profile: dict) -> dict:
    result = BodyMatcher(_library()).match(body_profile)
    if result.fallback:
        confidence = 0.5
    elif result.score == 0:
        confidence = 0.95
    else:
        confidence = max(0.6, 1.0 - 0.05 * result.score)
    return {
        "status": ToolStatus.SUCCESS.value,
        "template_id": result.base_model.base_id,
        "body_profile": body_profile,                 # 原样回传
        "confidence": round(confidence, 2),
        "source": "match_body_template",
        "warnings": [i.message for i in result.issues if i.severity == SEVERITY_ERROR],
    }


# ---------- 工具2 ----------
def generate_tryon(
    *,
    session_id: str,
    set_id: str,
    template_id: str,
    outfit: dict,
    idempotency_key: str,
    use_own_face: bool = False,
    user_face=None,
    views: list[str] | None = None,
    client=None,
    sync: bool = False,
) -> dict:
    views = views or list(DEFAULT_VIEWS)

    existing = STORE.existing(idempotency_key)
    if existing is not None:
        return _ack(session_id, existing.generation_id)

    if client is None:
        from .gemini_client import GeminiImageClient
        client = GeminiImageClient()

    user_face_bytes = _resolve_face_bytes(user_face)
    generation_id = f"gen_{session_id}_{set_id}_{uuid.uuid4().hex[:8]}"
    library = _library()

    def _run():
        return render_tryon(
            template_id, outfit, views, client=client, library=library,
            use_own_face=use_own_face, user_face=user_face_bytes,
        )

    STORE.submit(generation_id, idempotency_key, _run, sync=sync)
    return _ack(session_id, generation_id)


def _ack(session_id: str, generation_id: str) -> dict:
    job = STORE.get(generation_id)
    return {
        "status": ToolStatus.SUCCESS.value,
        "session_id": session_id,
        "generation_id": generation_id,
        "generation_status": (job.status.value if job else GenerationStatus.PENDING.value),
        "result_url": None,
        "warnings": [],
    }


# ---------- 状态查询 ----------
def get_generation_status(generation_id: str) -> dict:
    job = STORE.get(generation_id)
    if job is None:
        return {
            "status": ToolStatus.FAILED.value,
            "generation_id": generation_id,
            "generation_status": GenerationStatus.FAILED.value,
            "error": "unknown generation_id",
        }
    ok = job.status != GenerationStatus.FAILED
    return {
        "status": ToolStatus.SUCCESS.value if ok else ToolStatus.FAILED.value,
        "generation_id": generation_id,
        "generation_status": job.status.value,
        "result_views": dict(job.views),          # {view: 仓库相对路径}(service 改写为 URL)
        "result_url": job.views.get("front"),
        "warnings": job.warnings,
        "error": job.error,
    }


def _resolve_face_bytes(user_face):
    if not user_face:
        return None
    if isinstance(user_face, (bytes, bytearray)):
        return bytes(user_face)
    return Garment("face", "face", image_url=str(user_face)).load_bytes()
