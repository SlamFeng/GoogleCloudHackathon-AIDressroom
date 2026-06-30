"""试穿渲染:template_id + outfit (+ 人脸) → {view: image bytes}。

不在此做身材匹配——template_id 已由 match_body_template 选定。
分组渐进式换装 + 正面锁定派生多视图(沿用已验证的策略)。
"""

from __future__ import annotations

from .manifest import load_library, ModelLibrary
from .garment import resolve_outfit
from .prompt_builder import build_dressing_prompt, build_view_prompt

MAX_REFS_PER_GROUP = 3

_FACE_PROMPT = (
    "Replace the face of the person in the first image with the face from the second "
    "reference image. Keep the exact same body, hair, pose, lighting, background and "
    "everything else unchanged. Photorealistic, no text, no watermark."
)


def render_tryon(
    template_id: str,
    outfit: dict,
    views: list[str],
    *,
    client,
    library: ModelLibrary | None = None,
    use_own_face: bool = False,
    user_face: bytes | None = None,
) -> tuple[dict[str, bytes], list[str]]:
    """返回 ({view: png_bytes}, warnings)。"""
    library = library or load_library()
    base = library.by_id(template_id)
    if base is None:
        raise ValueError(f"unknown template_id: {template_id!r}")

    resolved = resolve_outfit(outfit)
    if not resolved.garments:
        raise ValueError("no usable garments in outfit")
    warnings = list(resolved.warnings)

    current = base.view_path("front").read_bytes()

    # 人脸:本人脸则先换脸;否则用底图自带脸(= 默认脸)
    if use_own_face and user_face:
        current = client.edit([current, user_face], _FACE_PROMPT)

    # 分组渐进式换装(正面)
    for i, group in enumerate(resolved.groups(MAX_REFS_PER_GROUP)):
        prompt = build_dressing_prompt(group, view="front", is_first=(i == 0))
        refs = [current] + [b for g in group if (b := g.load_bytes())]
        current = client.edit(refs, prompt)

    images = {"front": current}
    for v in views:
        if v == "front":
            continue
        images[v] = client.edit([current], build_view_prompt(v))
    return images, warnings
