"""默认脸选择(我们拥有的工具)。

v1:默认脸 = 底图自带的脸,default_face_template_id 由模板派生;预置脸库后续再建。
真脸(real_face)由 biometric 组创建 profile、我们按 id 取像素,不在此实现。
"""

from __future__ import annotations

from .contracts import ToolStatus, FaceMode


def _default_face_for(template_id: str, style_context: list[str] | None) -> str:
    # 预置脸库建好后,这里按 template + style 选具体脸;现在用底图自带脸
    return f"face_default_{template_id}"


def select_default_face_template(
    *,
    session_id: str,
    template_id: str,
    style_context: list[str] | None = None,
    explicit_user_choice: str | None = None,
    idempotency_key: str | None = None,
) -> dict:
    template = explicit_user_choice or _default_face_for(template_id, style_context)
    return {
        "status": ToolStatus.SUCCESS.value,
        "session_id": session_id,
        "face_profile": {
            "consent_given": False,
            "face_mode": FaceMode.DEFAULT_FACE.value,
            "face_profile_id": None,
            "default_face_template_id": template,
            "expire_at": None,
        },
        "match_basis": "body_template_and_style_context",
        "warnings": [],
    }
