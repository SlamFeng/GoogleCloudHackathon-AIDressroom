"""身材匹配:body_profile → 最接近的模特底图 base_id。

算法见 docs/try-on-preview/MODULE_DESIGN.md §5:
  1. 按 gender_presentation 硬过滤候选(neutral 不过滤)。
  2. body_shape 缺失/低置信 → 从 proportions 反推(§2.3)。
  3. 加权最近邻:
       score = 3·shape_mismatch·w_shape + 2·size_distance·w_size + 1·proportion_mismatch
     w_* 取对应 field_confidence(默认 1.0,低置信自动降权)。
  4. overall_confidence 极低或无可用体型 → 回退该性别 body_size=average 默认体型。
取 score 最小者;并列时优先 qa_status=pass、其次按 base_id 稳定排序。
"""

from __future__ import annotations

from dataclasses import dataclass, field

from . import taxonomy
from .manifest import BaseModel, ModelLibrary, load_library
from .validator import validate_body_profile, ValidationIssue

# 权重(MODULE_DESIGN §5)
W_SHAPE = 3.0
W_SIZE = 2.0
W_PROPORTION = 1.0

LOW_CONFIDENCE_SHAPE = 0.5     # body_shape 置信度低于此 → 尝试 proportions 反推
LOW_OVERALL_CONFIDENCE = 0.3   # 整体置信度低于此 → 回退默认体型
DEFAULT_SIZE = "average"

_QA_RANK = {"pass": 0, "warn": 1, "fail": 2, "unknown": 1}


@dataclass(frozen=True)
class MatchResult:
    base_model: BaseModel
    score: float
    effective_shape: str            # 实际参与匹配的体型(可能是反推得到的)
    effective_size: str
    derived_shape: bool = False     # 体型是否由 proportions 反推
    fallback: bool = False          # 是否走了默认体型回退
    reason: str = ""
    issues: tuple[ValidationIssue, ...] = field(default_factory=tuple)
    candidates_considered: int = 0


class BodyMatcher:
    """持有模特库,可复用做多次匹配。"""

    def __init__(self, library: ModelLibrary | None = None):
        self.library = library or load_library()

    # ---------- 公开 API ----------
    def match(self, body_profile: dict) -> MatchResult:
        issues = tuple(validate_body_profile(body_profile))
        gender = body_profile.get("gender_presentation")
        if gender not in taxonomy.GENDERS:
            gender = "neutral"

        candidates = self.library.for_gender(gender)
        if not candidates:
            raise ValueError(f"模特库中没有 gender={gender!r} 的候选")

        fc = _field_confidence(body_profile)
        overall = _overall_confidence(body_profile)

        size = body_profile.get("body_size")
        if size not in taxonomy.BODY_SIZES:
            size = DEFAULT_SIZE

        # 体型:缺失或低置信 → 反推
        shape = body_profile.get("body_shape")
        derived = False
        valid_shapes = taxonomy.shapes_for_gender(gender)
        shape_conf = fc.get("body_shape", 1.0)
        if shape not in valid_shapes or shape_conf < LOW_CONFIDENCE_SHAPE:
            inferred = derive_shape_from_proportions(body_profile.get("proportions"), gender, size)
            if inferred is not None:
                shape = inferred
                derived = True

        # 整体置信度过低 → 回退默认体型
        fallback = False
        if shape not in valid_shapes or overall < LOW_OVERALL_CONFIDENCE:
            fallback = True
            return self._fallback_match(candidates, gender, size, issues, len(candidates), shape)

        w_shape = W_SHAPE * _clamp01(fc.get("body_shape", 1.0))
        w_size = W_SIZE * _clamp01(fc.get("body_size", 1.0))
        profile_props = body_profile.get("proportions") or {}

        best = min(
            candidates,
            key=lambda m: _sort_key(
                self._score(m, gender, shape, size, w_shape, w_size, profile_props), m
            ),
        )
        score = self._score(best, gender, shape, size, w_shape, w_size, profile_props)
        reason = (
            f"matched shape={shape}{'(derived)' if derived else ''} size={size} "
            f"-> {best.base_id} (score={score:.2f})"
        )
        return MatchResult(
            base_model=best,
            score=score,
            effective_shape=shape,
            effective_size=size,
            derived_shape=derived,
            fallback=False,
            reason=reason,
            issues=issues,
            candidates_considered=len(candidates),
        )

    # ---------- 内部 ----------
    def _score(self, m: BaseModel, gender, shape, size, w_shape, w_size, profile_props) -> float:
        sm = taxonomy.shape_mismatch(shape, m.body_shape, gender)
        sd = taxonomy.size_distance(size, m.body_size)
        pm = _proportion_mismatch(profile_props, m.proportions)
        return w_shape * sm + w_size * sd + W_PROPORTION * pm

    def _fallback_match(self, candidates, gender, size, issues, n, shape) -> MatchResult:
        # 优先该性别 average 体量、且体型最接近(若 shape 可用)的默认体型
        def key(m: BaseModel):
            size_pen = taxonomy.size_distance(size, m.body_size)
            shape_pen = (
                taxonomy.shape_mismatch(shape, m.body_shape, gender)
                if shape in taxonomy.shapes_for_gender(gender)
                else 0
            )
            prefer_avg = 0 if m.body_size == DEFAULT_SIZE else 1
            return (prefer_avg, shape_pen, size_pen, _QA_RANK.get(m.qa_status, 1), m.base_id)

        best = min(candidates, key=key)
        return MatchResult(
            base_model=best,
            score=float("inf"),
            effective_shape=best.body_shape,
            effective_size=best.body_size,
            derived_shape=False,
            fallback=True,
            reason=f"low confidence / unknown shape -> fallback default {best.base_id}",
            issues=issues,
            candidates_considered=n,
        )


# ---------- 评分辅助 ----------
def _sort_key(score: float, m: BaseModel):
    """并列时:分低优先 → qa pass 优先 → base_id 稳定。"""
    return (round(score, 6), _QA_RANK.get(m.qa_status, 1), m.base_id)


def _proportion_mismatch(profile_props: dict, model_props: dict) -> int:
    """proportions 序数距离之和(仅当双方都有该维度时计入)。"""
    if not profile_props or not model_props:
        return 0
    total = 0
    for dim, order in taxonomy.PROPORTION_ORDER.items():
        a, b = profile_props.get(dim), model_props.get(dim)
        if a in order and b in order:
            total += abs(order[a] - order[b])
    return total


def derive_shape_from_proportions(props: dict | None, gender: str, size: str) -> str | None:
    """由 proportions 反推 body_shape(MODULE_DESIGN §2.3)。无法判断返回 None。"""
    if not props:
        return None
    shoulder = props.get("shoulder_width")
    waist = props.get("waist_definition")
    hip = props.get("hip_width")

    if gender == "male":
        if hip == "wide" and shoulder in ("narrow", "average"):
            return "triangle"
        if shoulder == "broad":
            return "inverted_triangle"
        if waist == "straight" and size in ("curvy", "plus"):
            return "oval"
        if shoulder == "average" and hip == "average":
            return "rectangle"
        return "trapezoid"

    # female / neutral
    if waist == "defined" and shoulder == hip:
        return "hourglass"
    if hip == "wide" and shoulder in ("narrow", "average"):
        return "pear"
    if shoulder == "broad" and hip in ("narrow", "average"):
        return "inverted_triangle"
    if waist == "straight" and size in ("curvy", "plus"):
        return "apple"
    if shoulder == "average" and hip == "average" and waist in ("straight", "moderate"):
        return "rectangle"
    return None


# ---------- 置信度提取 ----------
def _field_confidence(profile: dict) -> dict:
    fc = profile.get("field_confidence")
    if isinstance(fc, dict):
        return fc
    extraction = profile.get("extraction")
    if isinstance(extraction, dict) and isinstance(extraction.get("field_confidence"), dict):
        return extraction["field_confidence"]
    return {}


def _overall_confidence(profile: dict) -> float:
    extraction = profile.get("extraction")
    if isinstance(extraction, dict) and isinstance(extraction.get("overall_confidence"), (int, float)):
        return float(extraction["overall_confidence"])
    # 未提供视为可信(1.0),不触发回退
    return 1.0


def _clamp01(v) -> float:
    try:
        v = float(v)
    except (TypeError, ValueError):
        return 1.0
    return max(0.0, min(1.0, v))


# ---------- 便捷函数 ----------
def match_base_model(body_profile: dict, library: ModelLibrary | None = None) -> MatchResult:
    """无状态便捷入口。"""
    return BodyMatcher(library).match(body_profile)
