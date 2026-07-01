"""image_tryon —— 试穿生成模块(image/try-on 团队)。

对外 3 个工具(契约 dict 形状),供 Agent 底座以"工具"形式调用:
  - match_body_template(body_profile) -> template_id + 原样回传 body_profile
  - generate_tryon(...) -> 异步,pending + generation_id
  - select_default_face_template(...) -> 默认脸
  - get_generation_status(generation_id) -> 轮询结果

HTTP 服务见 image_tryon/service.py。契约见 docs/TEAM_CONTRACTS.md。
"""

from .tools import (
    match_body_template,
    generate_tryon,
    get_generation_status,
    select_default_face_template,
)

__all__ = [
    "match_body_template",
    "generate_tryon",
    "get_generation_status",
    "select_default_face_template",
]
