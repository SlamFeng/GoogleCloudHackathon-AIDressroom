"""契约枚举与常量(与 docs/TEAM_CONTRACTS.md 对齐)。

工具层入出参用普通 dict(契约 JSON 形状),这里只放枚举/状态常量,避免重复造 DTO。
TS/ADK Agent runtime 位于 server/agent,跨语言集成通过 HTTP 契约对齐。
"""

from __future__ import annotations

from enum import Enum


class ToolStatus(str, Enum):
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"


class FaceMode(str, Enum):
    REAL_FACE = "real_face"
    DEFAULT_FACE = "default_face"


class GenerationStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


DEFAULT_VIEWS = ["front"]
