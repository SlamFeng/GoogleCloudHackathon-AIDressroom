"""body_profile 校验(对照 BODY_PROFILE_CONTRACT.md)。

匹配是容错的:缺失/非法字段不抛异常,而是返回 issue 列表,匹配器据此降级
(缺 body_shape → 从 proportions 反推;缺 body_size → 按 average;低置信 → 降权)。
"""

from __future__ import annotations

from dataclasses import dataclass

from . import taxonomy

# 用户手输的必填项(契约 §3.0)
REQUIRED_USER_INPUT = ("gender_presentation", "height_cm", "weight_kg", "age_range")
# 照片提取的核心匹配项
CORE_MATCH_FIELDS = ("body_shape", "body_size")

SEVERITY_ERROR = "error"      # 无法匹配,需上游修
SEVERITY_WARN = "warn"        # 可降级继续


@dataclass(frozen=True)
class ValidationIssue:
    field: str
    severity: str
    message: str


def _is_number(value) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def validate_body_profile(profile: dict) -> list[ValidationIssue]:
    """返回 issue 列表(空=完全合规)。不修改输入。"""
    issues: list[ValidationIssue] = []

    if not isinstance(profile, dict):
        return [ValidationIssue("body_profile", SEVERITY_ERROR, "body_profile 必须是对象")]

    gender = profile.get("gender_presentation")
    if gender is None:
        issues.append(ValidationIssue("gender_presentation", SEVERITY_ERROR, "缺失(用户手输必填)"))
    elif gender not in taxonomy.GENDERS:
        issues.append(
            ValidationIssue("gender_presentation", SEVERITY_ERROR, f"非法枚举值: {gender!r}")
        )

    # 手输标量
    for fld in ("height_cm", "weight_kg"):
        val = profile.get(fld)
        if val is None:
            issues.append(ValidationIssue(fld, SEVERITY_WARN, "缺失(尺码推荐需要,匹配不依赖)"))
        elif not _is_number(val) or val <= 0:
            issues.append(ValidationIssue(fld, SEVERITY_WARN, f"应为正数: {val!r}"))

    if profile.get("age_range") is None:
        issues.append(ValidationIssue("age_range", SEVERITY_WARN, "缺失(图像生成用,匹配不依赖)"))

    # 体型:缺失可由 proportions 反推 → warn 而非 error
    shape = profile.get("body_shape")
    if shape is None:
        issues.append(ValidationIssue("body_shape", SEVERITY_WARN, "缺失,将尝试从 proportions 反推"))
    else:
        valid_shapes = taxonomy.shapes_for_gender(gender if gender in taxonomy.GENDERS else "neutral")
        if shape not in valid_shapes:
            issues.append(ValidationIssue("body_shape", SEVERITY_WARN, f"非法/性别不符: {shape!r}"))

    # 体量:缺失按 average
    size = profile.get("body_size")
    if size is None:
        issues.append(ValidationIssue("body_size", SEVERITY_WARN, "缺失,将按 average 处理"))
    elif size not in taxonomy.BODY_SIZES:
        issues.append(ValidationIssue("body_size", SEVERITY_WARN, f"非法枚举值: {size!r}"))

    # 置信度范围
    fc = profile.get("field_confidence") or _nested_field_confidence(profile)
    if isinstance(fc, dict):
        for k, v in fc.items():
            if not _is_number(v) or not (0.0 <= v <= 1.0):
                issues.append(
                    ValidationIssue(f"field_confidence.{k}", SEVERITY_WARN, f"应在 [0,1]: {v!r}")
                )

    return issues


def _nested_field_confidence(profile: dict) -> dict:
    """兼容 extraction.field_confidence 的嵌套位置(契约 §2.1 E 组)。"""
    extraction = profile.get("extraction")
    if isinstance(extraction, dict) and isinstance(extraction.get("field_confidence"), dict):
        return extraction["field_confidence"]
    return {}


def has_errors(issues: list[ValidationIssue]) -> bool:
    return any(i.severity == SEVERITY_ERROR for i in issues)
