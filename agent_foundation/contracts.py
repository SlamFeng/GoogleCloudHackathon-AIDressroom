"""Shared contract models for the Agent foundation.

These dataclasses mirror docs/TEAM_CONTRACTS.md and docs/TOOL_SCHEMAS.md.
They intentionally use only the Python standard library for the first prototype.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class SceneType(StrEnum):
    MIRROR = "mirror"
    STOREFRONT_SCREEN = "storefront_screen"
    STAFF_IPAD = "staff_ipad"


class Route(StrEnum):
    EXPLICIT = "explicit"
    RECOMMENDATION = "recommendation"
    UNCLEAR = "unclear"


class SessionStatus(StrEnum):
    ANALYZING = "analyzing"
    COMMUNICATING = "communicating"
    RECOMMENDING = "recommending"
    REFINING = "refining"
    CONFIRMED = "confirmed"
    ENDED = "ended"


class RecommendationType(StrEnum):
    SIMILAR = "similar"
    STYLE = "style"
    SEASONAL = "seasonal"
    EXPLICIT_NEED = "explicit_need"


class FeedbackType(StrEnum):
    REJECT_ALL = "reject_all"
    PARTIAL_ADJUST = "partial_adjust"
    POSITIVE_KEEP = "positive_keep"
    CONFIRM = "confirm"


class FeedbackDimension(StrEnum):
    COLOR = "color"
    FIT = "fit"
    STYLE = "style"
    PRICE = "price"
    OVERALL = "overall"


class FaceMode(StrEnum):
    REAL_FACE = "real_face"
    DEFAULT_FACE = "default_face"


class ToolStatus(StrEnum):
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"


class InputSource(StrEnum):
    VOICE = "voice"
    QUICK_TAG = "quick_tag"
    UI_CLICK = "ui_click"
    STAFF_INPUT = "staff_input"
    SYSTEM = "system"


@dataclass(slots=True)
class BudgetRange:
    min: int = 0
    max: int | None = None
    currency: str = "JPY"

    def to_dict(self) -> dict[str, Any]:
        return {"min": self.min, "max": self.max, "currency": self.currency}


@dataclass(slots=True)
class ConstraintItem:
    dimension: str
    value: str
    reason: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "dimension": self.dimension,
            "value": self.value,
            "reason": self.reason,
        }


@dataclass(slots=True)
class AnalysisResult:
    matched_body_template_id: str
    current_style: list[str]
    confidence: float
    dominant_colors: list[str] = field(default_factory=list)
    analysis_id: str | None = None
    photo_url: str | None = None

    def to_dict(self) -> dict[str, Any]:
        data: dict[str, Any] = {
            "matched_body_template_id": self.matched_body_template_id,
            "current_style": list(self.current_style),
            "confidence": self.confidence,
        }
        if self.dominant_colors:
            data["dominant_colors"] = list(self.dominant_colors)
        if self.analysis_id:
            data["analysis_id"] = self.analysis_id
        if self.photo_url:
            data["photo_url"] = self.photo_url
        return data


@dataclass(slots=True)
class UserNeedConstraints:
    category: list[str] = field(default_factory=list)
    style_tags: list[str] = field(default_factory=list)
    colors: list[str] = field(default_factory=list)
    budget_range: BudgetRange | None = None
    occasion: str | None = None
    avoid: list[ConstraintItem] = field(default_factory=list)
    keep: list[ConstraintItem] = field(default_factory=list)
    free_text_summary: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "category": list(self.category),
            "style_tags": list(self.style_tags),
            "colors": list(self.colors),
            "budget_range": self.budget_range.to_dict() if self.budget_range else None,
            "occasion": self.occasion,
            "avoid": [item.to_dict() for item in self.avoid],
            "keep": [item.to_dict() for item in self.keep],
            "free_text_summary": self.free_text_summary,
        }


@dataclass(slots=True)
class SessionContext:
    session_id: str
    scene_type: SceneType
    store_id: str
    round: int
    idempotency_key: str
    route: Route | None = None
    status: SessionStatus | None = None

    def to_dict(self) -> dict[str, Any]:
        data: dict[str, Any] = {
            "session_id": self.session_id,
            "scene_type": self.scene_type.value,
            "store_id": self.store_id,
            "round": self.round,
            "idempotency_key": self.idempotency_key,
        }
        if self.route:
            data["route"] = self.route.value
        if self.status:
            data["status"] = self.status.value
        return data


@dataclass(slots=True)
class ProductSummary:
    product_id: str
    name: str
    category: str
    price: int
    currency: str
    color: str
    image_url: str
    in_stock: bool
    sku: str | None = None
    sizes: list[str] = field(default_factory=list)
    style_tags: list[str] = field(default_factory=list)
    body_fit_tags: list[str] = field(default_factory=list)
    fabric: str | None = None
    store_location: str | None = None
    stock_quantity: int | None = None

    def to_dict(self) -> dict[str, Any]:
        data: dict[str, Any] = {
            "product_id": self.product_id,
            "name": self.name,
            "category": self.category,
            "price": self.price,
            "currency": self.currency,
            "color": self.color,
            "image_url": self.image_url,
            "in_stock": self.in_stock,
        }
        optional = {
            "sku": self.sku,
            "sizes": self.sizes,
            "style_tags": self.style_tags,
            "body_fit_tags": self.body_fit_tags,
            "fabric": self.fabric,
            "store_location": self.store_location,
            "stock_quantity": self.stock_quantity,
        }
        for key, value in optional.items():
            if value not in (None, [], {}):
                data[key] = value
        return data


@dataclass(slots=True)
class RecommendationSet:
    set_id: str
    rec_type: RecommendationType
    products: list[ProductSummary]
    reason: str
    title: str | None = None
    total_price: int | None = None
    currency: str = "JPY"
    score: float | None = None
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        total_price = self.total_price
        if total_price is None:
            total_price = sum(product.price for product in self.products)
        data: dict[str, Any] = {
            "set_id": self.set_id,
            "rec_type": self.rec_type.value,
            "products": [product.to_dict() for product in self.products],
            "reason": self.reason,
            "total_price": total_price,
            "currency": self.currency,
        }
        if self.title:
            data["title"] = self.title
        if self.score is not None:
            data["score"] = self.score
        if self.warnings:
            data["warnings"] = list(self.warnings)
        return data


@dataclass(slots=True)
class RecommendationResponse:
    status: ToolStatus
    session_id: str
    round: int
    sets: list[RecommendationSet]
    applied_constraints: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)
    debug_trace_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        data: dict[str, Any] = {
            "status": self.status.value,
            "session_id": self.session_id,
            "round": self.round,
            "sets": [item.to_dict() for item in self.sets],
            "applied_constraints": dict(self.applied_constraints),
            "warnings": list(self.warnings),
        }
        if self.debug_trace_id:
            data["debug_trace_id"] = self.debug_trace_id
        return data


@dataclass(slots=True)
class FeedbackPayload:
    session_id: str
    set_id: str
    feedback_type: FeedbackType
    source: InputSource
    dimension: FeedbackDimension | None = None
    dimension_value: str | None = None
    raw_voice_text: str | None = None
    target_product_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        data: dict[str, Any] = {
            "session_id": self.session_id,
            "set_id": self.set_id,
            "feedback_type": self.feedback_type.value,
            "source": self.source.value,
        }
        if self.dimension:
            data["dimension"] = self.dimension.value
        if self.dimension_value:
            data["dimension_value"] = self.dimension_value
        if self.raw_voice_text:
            data["raw_voice_text"] = self.raw_voice_text
        if self.target_product_id:
            data["target_product_id"] = self.target_product_id
        return data


@dataclass(slots=True)
class ConstraintDelta:
    avoid_add: list[ConstraintItem] = field(default_factory=list)
    keep_add: list[ConstraintItem] = field(default_factory=list)
    requires_new_recommendation: bool = True
    budget_update: BudgetRange | None = None
    style_shift: str | None = None
    fit_update: str | None = None
    notes: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "avoid_add": [item.to_dict() for item in self.avoid_add],
            "keep_add": [item.to_dict() for item in self.keep_add],
            "requires_new_recommendation": self.requires_new_recommendation,
            "budget_update": self.budget_update.to_dict() if self.budget_update else None,
            "style_shift": self.style_shift,
            "fit_update": self.fit_update,
            "notes": self.notes,
        }


@dataclass(slots=True)
class FaceConsentState:
    consent_given: bool
    face_mode: FaceMode
    face_profile_id: str | None = None
    default_face_template_id: str | None = None
    expire_at: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "consent_given": self.consent_given,
            "face_mode": self.face_mode.value,
            "face_profile_id": self.face_profile_id,
            "default_face_template_id": self.default_face_template_id,
            "expire_at": self.expire_at,
        }
