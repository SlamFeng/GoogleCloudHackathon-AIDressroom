"""Mock tools for inventory, recommendation, feedback, and try-on handoff."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .contracts import (
    AnalysisResult,
    ConstraintDelta,
    FaceConsentState,
    FaceMode,
    ProductSummary,
    RecommendationResponse,
    RecommendationSet,
    RecommendationType,
    SessionContext,
    ToolStatus,
    UserNeedConstraints,
)


@dataclass(slots=True)
class MockToolLog:
    calls: list[dict[str, Any]] = field(default_factory=list)

    def append(self, name: str, payload: dict[str, Any]) -> None:
        self.calls.append({"tool": name, "payload": payload})


class MockRetailTools:
    """Contract-compatible mock implementation.

    The mock deliberately keeps behavior simple and deterministic:
    - route B returns similar/style/seasonal sets
    - feedback avoid constraints filter matching colors/styles when possible
    - denied face consent selects a default face template
    """

    def __init__(self) -> None:
        self.log = MockToolLog()
        self.products = _seed_products()
        self.feedback_store: list[dict[str, Any]] = []

    def get_recommendations(
        self,
        session: SessionContext,
        analysis: AnalysisResult,
        constraints: UserNeedConstraints,
        requested_rec_types: list[RecommendationType],
    ) -> RecommendationResponse:
        payload = {
            "session": session.to_dict(),
            "analysis": analysis.to_dict(),
            "constraints": constraints.to_dict(),
            "requested_rec_types": [item.value for item in requested_rec_types],
        }
        self.log.append("get_recommendations", payload)
        sets = [
            self._build_set(session, rec_type, constraints, analysis, index)
            for index, rec_type in enumerate(requested_rec_types, start=1)
        ]
        return RecommendationResponse(
            status=ToolStatus.SUCCESS,
            session_id=session.session_id,
            round=session.round,
            sets=sets,
            applied_constraints=constraints.to_dict(),
            debug_trace_id=f"trace_{session.session_id}_{session.round}",
        )

    def refine_recommendations(
        self,
        session: SessionContext,
        previous_set_id: str,
        shown_set_ids: list[str],
        constraints: UserNeedConstraints,
        constraint_delta: ConstraintDelta,
    ) -> RecommendationResponse:
        payload = {
            "session": session.to_dict(),
            "previous_set_id": previous_set_id,
            "shown_set_ids": list(shown_set_ids),
            "constraints": constraints.to_dict(),
            "constraint_delta": constraint_delta.to_dict(),
        }
        self.log.append("refine_recommendations", payload)
        sets = [
            self._build_set(
                session,
                RecommendationType.SIMILAR,
                constraints,
                AnalysisResult("body_template_03", ["casual"], 0.8),
                1,
                suffix="refined",
            ),
            self._build_set(
                session,
                RecommendationType.STYLE,
                constraints,
                AnalysisResult("body_template_03", ["casual"], 0.8),
                2,
                suffix="refined",
            ),
        ]
        return RecommendationResponse(
            status=ToolStatus.SUCCESS,
            session_id=session.session_id,
            round=session.round,
            sets=sets,
            applied_constraints=constraints.to_dict(),
            debug_trace_id=f"trace_{session.session_id}_{session.round}",
        )

    def record_feedback(
        self,
        session_id: str,
        set_id: str,
        feedback: dict[str, Any],
        constraint_delta: ConstraintDelta,
        idempotency_key: str,
    ) -> dict[str, Any]:
        payload = {
            "session_id": session_id,
            "set_id": set_id,
            "feedback": feedback,
            "constraint_delta": constraint_delta.to_dict(),
            "idempotency_key": idempotency_key,
        }
        self.feedback_store.append(payload)
        self.log.append("record_feedback", payload)
        return {
            "status": ToolStatus.SUCCESS.value,
            "session_id": session_id,
            "feedback_id": f"feedback_{len(self.feedback_store):03d}",
            "warnings": [],
        }

    def select_default_face_template(
        self,
        session_id: str,
        matched_body_template_id: str,
        style_context: list[str],
        explicit_user_choice: str | None,
        idempotency_key: str,
    ) -> dict[str, Any]:
        template = explicit_user_choice or _default_face_for_body(matched_body_template_id)
        profile = FaceConsentState(
            consent_given=False,
            face_mode=FaceMode.DEFAULT_FACE,
            default_face_template_id=template,
        )
        payload = {
            "session_id": session_id,
            "matched_body_template_id": matched_body_template_id,
            "style_context": list(style_context),
            "explicit_user_choice": explicit_user_choice,
            "idempotency_key": idempotency_key,
        }
        self.log.append("select_default_face_template", payload)
        return {
            "status": ToolStatus.SUCCESS.value,
            "session_id": session_id,
            "face_profile": profile.to_dict(),
            "match_basis": "body_template_and_style_context",
            "warnings": [],
        }

    def create_real_face_profile(
        self,
        session_id: str,
        image_ref: str,
        consent_given: bool,
        expire_at: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        if not consent_given:
            return {
                "status": ToolStatus.FAILED.value,
                "session_id": session_id,
                "warnings": ["real face profile requires consent"],
            }
        profile = FaceConsentState(
            consent_given=True,
            face_mode=FaceMode.REAL_FACE,
            face_profile_id=f"face_profile_{session_id}",
            expire_at=expire_at,
        )
        payload = {
            "session_id": session_id,
            "image_ref": image_ref,
            "consent_given": consent_given,
            "expire_at": expire_at,
            "idempotency_key": idempotency_key,
        }
        self.log.append("create_real_face_profile", payload)
        return {
            "status": ToolStatus.SUCCESS.value,
            "session_id": session_id,
            "face_profile": profile.to_dict(),
            "warnings": [],
        }

    def handoff_tryon_generation(
        self,
        session_id: str,
        set_id: str,
        product_combo: list[str],
        base_template_id: str,
        face_mode: FaceMode,
        idempotency_key: str,
        face_profile_id: str | None = None,
        default_face_template_id: str | None = None,
    ) -> dict[str, Any]:
        payload = {
            "session_id": session_id,
            "set_id": set_id,
            "product_combo": list(product_combo),
            "base_template_id": base_template_id,
            "face_mode": face_mode.value,
            "face_profile_id": face_profile_id,
            "default_face_template_id": default_face_template_id,
            "idempotency_key": idempotency_key,
        }
        self.log.append("handoff_tryon_generation", payload)
        if face_mode == FaceMode.REAL_FACE and not face_profile_id:
            return {
                "status": ToolStatus.FAILED.value,
                "session_id": session_id,
                "warnings": ["face_profile_id required for real_face"],
            }
        if face_mode == FaceMode.DEFAULT_FACE and not default_face_template_id:
            return {
                "status": ToolStatus.FAILED.value,
                "session_id": session_id,
                "warnings": ["default_face_template_id required for default_face"],
            }
        return {
            "status": ToolStatus.SUCCESS.value,
            "session_id": session_id,
            "generation_id": f"gen_{session_id}_{set_id}",
            "generation_status": "pending",
            "result_url": None,
            "warnings": [],
        }

    def _build_set(
        self,
        session: SessionContext,
        rec_type: RecommendationType,
        constraints: UserNeedConstraints,
        analysis: AnalysisResult,
        index: int,
        suffix: str = "initial",
    ) -> RecommendationSet:
        products = self._filter_products(constraints, rec_type, analysis)
        selected = products[:2] if len(products) >= 2 else products
        return RecommendationSet(
            set_id=f"set_{session.round}_{index}_{suffix}",
            rec_type=rec_type,
            title=_title_for_type(rec_type),
            products=selected,
            reason=_reason_for_type(rec_type, constraints),
            score=round(0.88 - index * 0.03, 2),
        )

    def _filter_products(
        self,
        constraints: UserNeedConstraints,
        rec_type: RecommendationType,
        analysis: AnalysisResult,
    ) -> list[ProductSummary]:
        avoid_colors = {
            item.value for item in constraints.avoid if item.dimension == "color"
        }
        keep_styles = {
            item.value for item in constraints.keep if item.dimension == "style"
        }
        target_styles = set(constraints.style_tags or analysis.current_style)
        if rec_type == RecommendationType.STYLE:
            target_styles = target_styles or {"minimal", "office"}
        if rec_type == RecommendationType.SEASONAL:
            target_styles = {"seasonal", "casual"}
        if keep_styles:
            target_styles |= keep_styles

        filtered = [
            product
            for product in self.products
            if product.in_stock and product.color not in avoid_colors
        ]
        if constraints.budget_range and constraints.budget_range.max:
            filtered = [
                product
                for product in filtered
                if product.price <= constraints.budget_range.max
            ]
        if constraints.category:
            category_matches = [
                product for product in filtered if product.category in constraints.category
            ]
            if category_matches:
                filtered = category_matches + [
                    product
                    for product in filtered
                    if product.category not in constraints.category
                ]
        style_matches = [
            product
            for product in filtered
            if target_styles.intersection(product.style_tags)
        ]
        if style_matches:
            filtered = style_matches + [
                product for product in filtered if product not in style_matches
            ]
        return filtered


def _seed_products() -> list[ProductSummary]:
    return [
        ProductSummary(
            product_id="p001",
            sku="SKU-001",
            name="Black Short Jacket",
            category="outerwear",
            price=8900,
            currency="JPY",
            color="black",
            sizes=["S", "M"],
            style_tags=["minimal", "street", "casual"],
            body_fit_tags=["body_template_03"],
            image_url="https://example.com/p001.jpg",
            in_stock=True,
            store_location="Aisle 2",
            stock_quantity=5,
        ),
        ProductSummary(
            product_id="p002",
            sku="SKU-002",
            name="Ivory Relaxed Shirt",
            category="top",
            price=5200,
            currency="JPY",
            color="white",
            sizes=["M", "L"],
            style_tags=["minimal", "casual", "office"],
            body_fit_tags=["body_template_03", "body_template_07"],
            image_url="https://example.com/p002.jpg",
            in_stock=True,
            stock_quantity=6,
        ),
        ProductSummary(
            product_id="p003",
            sku="SKU-003",
            name="Red Statement Knit",
            category="top",
            price=6800,
            currency="JPY",
            color="red",
            sizes=["S", "M"],
            style_tags=["street", "seasonal"],
            body_fit_tags=["body_template_03"],
            image_url="https://example.com/p003.jpg",
            in_stock=True,
            stock_quantity=3,
        ),
        ProductSummary(
            product_id="p004",
            sku="SKU-004",
            name="Navy Wide Pants",
            category="bottom",
            price=7400,
            currency="JPY",
            color="blue",
            sizes=["S", "M", "L"],
            style_tags=["minimal", "office"],
            body_fit_tags=["body_template_03"],
            image_url="https://example.com/p004.jpg",
            in_stock=True,
            stock_quantity=4,
        ),
        ProductSummary(
            product_id="p005",
            sku="SKU-005",
            name="Seasonal Beige Dress",
            category="dress",
            price=12800,
            currency="JPY",
            color="beige",
            sizes=["M"],
            style_tags=["seasonal", "date", "casual"],
            body_fit_tags=["body_template_07"],
            image_url="https://example.com/p005.jpg",
            in_stock=True,
            stock_quantity=2,
        ),
        ProductSummary(
            product_id="p006",
            sku="SKU-006",
            name="Sold Out Black Boots",
            category="shoes",
            price=9900,
            currency="JPY",
            color="black",
            sizes=["M"],
            style_tags=["street"],
            body_fit_tags=["body_template_03"],
            image_url="https://example.com/p006.jpg",
            in_stock=False,
            stock_quantity=0,
        ),
        ProductSummary(
            product_id="p007",
            sku="SKU-007",
            name="White Canvas Sneakers",
            category="shoes",
            price=6100,
            currency="JPY",
            color="white",
            sizes=["S", "M", "L"],
            style_tags=["casual", "seasonal"],
            body_fit_tags=["body_template_03"],
            image_url="https://example.com/p007.jpg",
            in_stock=True,
            stock_quantity=8,
        ),
    ]


def _title_for_type(rec_type: RecommendationType) -> str:
    return {
        RecommendationType.SIMILAR: "Similar to the current look",
        RecommendationType.STYLE: "Store style proposal",
        RecommendationType.SEASONAL: "Seasonal hot set",
        RecommendationType.EXPLICIT_NEED: "Matched to your request",
    }[rec_type]


def _reason_for_type(
    rec_type: RecommendationType, constraints: UserNeedConstraints
) -> str:
    if constraints.avoid:
        avoid_text = ", ".join(f"{item.dimension}:{item.value}" for item in constraints.avoid)
        return f"Refined to avoid {avoid_text} while keeping available stock."
    return {
        RecommendationType.SIMILAR: "Matches the current outfit mood and available stock.",
        RecommendationType.STYLE: "Uses the store's main style tags for a coordinated set.",
        RecommendationType.SEASONAL: "Prioritizes seasonal and hot inventory.",
        RecommendationType.EXPLICIT_NEED: "Matches the customer's explicit request.",
    }[rec_type]


def _default_face_for_body(body_template_id: str) -> str:
    mapping = {
        "body_template_01": "face_default_01",
        "body_template_02": "face_default_01",
        "body_template_03": "face_default_02",
        "body_template_07": "face_default_03",
    }
    return mapping.get(body_template_id, "face_default_02")
