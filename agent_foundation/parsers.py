"""Rule-based parsers for the first Agent foundation prototype.

The first implementation is deliberately deterministic so tests and demos are
stable. Later, these functions can become Gemini/ADK tool-backed adapters.
"""

from __future__ import annotations

import re

from .contracts import (
    BudgetRange,
    ConstraintDelta,
    ConstraintItem,
    FeedbackDimension,
    FeedbackPayload,
    FeedbackType,
    Route,
    UserNeedConstraints,
)


RECOMMENDATION_PATTERNS = (
    "没想法",
    "沒有想法",
    "不知道",
    "你推荐",
    "你推薦",
    "推荐适合",
    "推薦適合",
    "帮我搭",
    "幫我搭",
    "随便",
    "適合我",
    "适合我",
)

EXPLICIT_PATTERNS = (
    "预算",
    "預算",
    "日元",
    "円",
    "外套",
    "上衣",
    "裤",
    "褲",
    "裙",
    "鞋",
    "约会",
    "約會",
    "面试",
    "面試",
    "通勤",
    "海边",
    "海邊",
    "黑",
    "白",
    "红",
    "紅",
    "蓝",
    "藍",
    "休闲",
    "休閒",
    "正式",
    "街头",
    "街頭",
)


def route_intent(text: str) -> Route:
    normalized = text.strip().lower()
    if not normalized:
        return Route.UNCLEAR

    if any(pattern in normalized for pattern in RECOMMENDATION_PATTERNS):
        if not any(pattern in normalized for pattern in EXPLICIT_PATTERNS):
            return Route.RECOMMENDATION

    if any(pattern in normalized for pattern in EXPLICIT_PATTERNS):
        return Route.EXPLICIT

    if len(normalized) <= 8:
        return Route.UNCLEAR
    return Route.UNCLEAR


def parse_need(text: str) -> UserNeedConstraints:
    need = UserNeedConstraints(free_text_summary=text.strip() or None)
    lower = text.lower()

    category_map = {
        "outerwear": ("外套", "夹克", "jacket", "coat"),
        "top": ("上衣", "内搭", "衬衫", "shirt", "top"),
        "bottom": ("裤", "褲", "长裤", "短裤", "pants"),
        "dress": ("裙", "连衣裙", "dress"),
        "shoes": ("鞋", "sneaker", "boots"),
    }
    for category, patterns in category_map.items():
        if any(pattern in lower for pattern in patterns):
            need.category.append(category)

    style_map = {
        "minimal": ("简约", "簡約", "minimal"),
        "casual": ("休闲", "休閒", "casual", "不太正式"),
        "formal": ("正式", "面试", "面試", "formal"),
        "street": ("街头", "街頭", "street"),
        "date": ("约会", "約會", "date"),
        "vacation": ("海边", "海邊", "旅行", "vacation"),
        "office": ("通勤", "office"),
    }
    for style, patterns in style_map.items():
        if any(pattern in lower for pattern in patterns):
            need.style_tags.append(style)

    color_map = {
        "black": ("黑", "black"),
        "white": ("白", "white"),
        "red": ("红", "紅", "red"),
        "blue": ("蓝", "藍", "blue"),
        "beige": ("米色", "beige"),
    }
    for color, patterns in color_map.items():
        if any(pattern in lower for pattern in patterns):
            need.colors.append(color)

    budget = _parse_budget_yen(lower)
    if budget:
        need.budget_range = BudgetRange(min=0, max=budget, currency="JPY")

    occasion_map = {
        "beach": ("海边", "海邊"),
        "date": ("约会", "約會"),
        "interview": ("面试", "面試"),
        "commute": ("通勤",),
    }
    for occasion, patterns in occasion_map.items():
        if any(pattern in lower for pattern in patterns):
            need.occasion = occasion
            break

    if "不喜欢露腿" in lower or "不想露腿" in lower:
        need.avoid.append(
            ConstraintItem(
                dimension=FeedbackDimension.FIT.value,
                value="leg_exposure",
                reason="customer_disliked",
            )
        )

    return _dedupe_need(need)


def parse_feedback(feedback: FeedbackPayload) -> ConstraintDelta:
    if feedback.feedback_type == FeedbackType.CONFIRM:
        return ConstraintDelta(requires_new_recommendation=False)

    if feedback.feedback_type == FeedbackType.POSITIVE_KEEP:
        return ConstraintDelta(
            avoid_add=[],
            keep_add=[
                ConstraintItem(
                    dimension=(feedback.dimension or FeedbackDimension.OVERALL).value,
                    value=feedback.dimension_value or "current_selection",
                    reason="positive_feedback",
                )
            ],
            requires_new_recommendation=True,
        )

    if feedback.feedback_type == FeedbackType.REJECT_ALL:
        return ConstraintDelta(
            avoid_add=[
                ConstraintItem(
                    dimension=FeedbackDimension.OVERALL.value,
                    value=feedback.set_id,
                    reason="reject_all",
                )
            ],
            requires_new_recommendation=True,
            notes="broaden_candidate_pool",
        )

    dimension = feedback.dimension or _infer_feedback_dimension(
        feedback.raw_voice_text or ""
    )
    value = feedback.dimension_value or _infer_feedback_value(
        dimension, feedback.raw_voice_text or ""
    )

    if dimension == FeedbackDimension.PRICE:
        budget = _parse_budget_yen(feedback.raw_voice_text or "")
        return ConstraintDelta(
            budget_update=BudgetRange(min=0, max=budget, currency="JPY")
            if budget
            else None,
            requires_new_recommendation=True,
            notes="price_feedback",
        )

    if dimension == FeedbackDimension.STYLE:
        return ConstraintDelta(
            style_shift=value,
            requires_new_recommendation=True,
            notes="style_feedback",
        )

    if dimension == FeedbackDimension.FIT:
        return ConstraintDelta(
            avoid_add=[
                ConstraintItem(
                    dimension=dimension.value,
                    value=value or "current_fit",
                    reason="customer_disliked",
                )
            ],
            fit_update=value,
            requires_new_recommendation=True,
        )

    return ConstraintDelta(
        avoid_add=[
            ConstraintItem(
                dimension=dimension.value,
                value=value or "current_selection",
                reason="customer_disliked",
            )
        ],
        requires_new_recommendation=True,
    )


def _parse_budget_yen(text: str) -> int | None:
    # Covers "两万日元", "2万日元", "20000円", and "一万以内" style inputs.
    cn_numbers = {
        "一": 1,
        "二": 2,
        "两": 2,
        "兩": 2,
        "三": 3,
        "四": 4,
        "五": 5,
        "六": 6,
        "七": 7,
        "八": 8,
        "九": 9,
    }
    match = re.search(r"(\d+)\s*万", text)
    if match:
        return int(match.group(1)) * 10000
    for char, number in cn_numbers.items():
        if f"{char}万" in text:
            return number * 10000
    match = re.search(r"(\d{4,6})\s*(日元|円|yen|jpy)?", text)
    if match and ("预算" in text or "預算" in text or "以内" in text or "以內" in text):
        return int(match.group(1))
    return None


def _infer_feedback_dimension(text: str) -> FeedbackDimension:
    lower = text.lower()
    if any(token in lower for token in ("颜色", "顏色", "色", "太亮", "太暗")):
        return FeedbackDimension.COLOR
    if any(token in lower for token in ("版型", "剪裁", "修身", "宽松", "寬鬆")):
        return FeedbackDimension.FIT
    if any(token in lower for token in ("风格", "風格", "正式", "休闲", "休閒")):
        return FeedbackDimension.STYLE
    if any(token in lower for token in ("贵", "貴", "便宜", "预算", "預算")):
        return FeedbackDimension.PRICE
    return FeedbackDimension.OVERALL


def _infer_feedback_value(dimension: FeedbackDimension, text: str) -> str | None:
    lower = text.lower()
    if dimension == FeedbackDimension.COLOR:
        color_map = {
            "red": ("红", "紅", "red"),
            "black": ("黑", "black"),
            "white": ("白", "white"),
            "blue": ("蓝", "藍", "blue"),
            "bright": ("太亮", "亮"),
            "dark": ("太暗", "暗"),
        }
        for value, patterns in color_map.items():
            if any(pattern in lower for pattern in patterns):
                return value
    if dimension == FeedbackDimension.FIT:
        if "修身" in lower:
            return "slim"
        if "宽松" in lower or "寬鬆" in lower:
            return "loose"
        if "露腿" in lower:
            return "leg_exposure"
    if dimension == FeedbackDimension.STYLE:
        if "正式" in lower:
            return "formal"
        if "休闲" in lower or "休閒" in lower:
            return "casual"
    return None


def _dedupe_need(need: UserNeedConstraints) -> UserNeedConstraints:
    need.category = _dedupe(need.category)
    need.style_tags = _dedupe(need.style_tags)
    need.colors = _dedupe(need.colors)
    need.avoid = _dedupe_constraints(need.avoid)
    need.keep = _dedupe_constraints(need.keep)
    return need


def _dedupe(values: list[str]) -> list[str]:
    result: list[str] = []
    for value in values:
        if value not in result:
            result.append(value)
    return result


def _dedupe_constraints(items: list[ConstraintItem]) -> list[ConstraintItem]:
    result: list[ConstraintItem] = []
    seen: set[tuple[str, str]] = set()
    for item in items:
        key = (item.dimension, item.value)
        if key not in seen:
            result.append(item)
            seen.add(key)
    return result
