# Team Contracts

Status: proposal for teammate review.

Purpose: define cross-team payloads that must be stable across Agent, inventory, frontend, and try-on teams. Each team can implement internal tables and services differently as long as these contracts are satisfied.

## 1. Ownership Boundary

| Area | Internal Implementation Owner | Shared Contract Owner |
|---|---|---|
| Product database | Inventory/product team | Inventory + Agent |
| Recommendation logic | Inventory/recommendation team | Recommendation + Agent |
| Agent state/workflow | Agent foundation team | Agent |
| Try-on generation | Image/try-on team | Image + Agent |
| UI display/input | Frontend team | Frontend + Agent |

Rule:

```text
Internal tables can change freely if shared request/response contracts remain compatible.
```

## 2. Compatibility Rules

| Change Type | Rule |
|---|---|
| Add optional field | Allowed with PR note |
| Add enum value | Requires Agent + frontend review |
| Rename required field | Breaking change, requires all consumers |
| Remove required field | Breaking change, requires all consumers |
| Change field type | Breaking change |
| Change internal DB only | No cross-team review if API payload stays compatible |
| Mock data change | Notify integration owner if demo path changes |

## 3. Global Enums

```text
scene_type = mirror | storefront_screen | staff_ipad
route = explicit | recommendation | unclear
session_status = analyzing | communicating | recommending | refining | confirmed | ended
rec_type = similar | style | seasonal | explicit_need
feedback_type = reject_all | partial_adjust | positive_keep | confirm
feedback_dimension = color | fit | style | price | overall
face_mode = real_face | default_face
tool_status = success | partial | failed
source = voice | quick_tag | ui_click | staff_input | system
```

## 4. DTOs

### 4.1 `SessionContext`

Required by every tool call.

```json
{
  "session_id": "s001",
  "scene_type": "mirror",
  "store_id": "store_001",
  "route": "recommendation",
  "status": "recommending",
  "round": 1,
  "idempotency_key": "s001-r1-get-recommendations"
}
```

Required:

- `session_id`
- `scene_type`
- `store_id`
- `round`
- `idempotency_key`

Optional:

- `route`
- `status`

### 4.2 `AnalysisResult`

Provided by image/body/style analysis and consumed by Agent, recommendation, and try-on.

```json
{
  "matched_body_template_id": "body_template_03",
  "current_style": ["casual", "minimal"],
  "dominant_colors": ["black", "white"],
  "confidence": 0.82,
  "analysis_id": "analysis_001"
}
```

Required:

- `matched_body_template_id`
- `current_style`
- `confidence`

Optional:

- `dominant_colors`
- `analysis_id`
- `photo_url`

Policy:

- Do not include exact body measurements in the shared DTO.
- Use body template ID instead of precise biometric body data.

### 4.3 `UserNeedConstraints`

Structured customer need state maintained by the Agent.

```json
{
  "category": ["outerwear"],
  "style_tags": ["minimal"],
  "colors": ["black"],
  "budget_range": {
    "min": 0,
    "max": 20000,
    "currency": "JPY"
  },
  "occasion": "date",
  "avoid": [
    {
      "dimension": "color",
      "value": "red",
      "reason": "customer_disliked"
    }
  ],
  "keep": [
    {
      "dimension": "style",
      "value": "minimal",
      "reason": "positive_feedback"
    }
  ]
}
```

Required:

- `category`
- `style_tags`
- `colors`
- `avoid`
- `keep`

Optional:

- `budget_range`
- `occasion`
- `fit_preferences`
- `free_text_summary`

### 4.4 `ProductSummary`

Minimum product card returned to the Agent/frontend.

```json
{
  "product_id": "p001",
  "sku": "SKU-001",
  "name": "Black Short Jacket",
  "category": "outerwear",
  "price": 8900,
  "currency": "JPY",
  "color": "black",
  "sizes": ["S", "M"],
  "style_tags": ["minimal", "street"],
  "body_fit_tags": ["body_template_03"],
  "image_url": "https://example.com/p001.jpg",
  "in_stock": true
}
```

Required:

- `product_id`
- `name`
- `category`
- `price`
- `currency`
- `color`
- `image_url`
- `in_stock`

Optional:

- `sku`
- `sizes`
- `style_tags`
- `body_fit_tags`
- `fabric`
- `store_location`
- `stock_quantity`

### 4.5 `RecommendationSet`

One outfit/set shown to the customer.

```json
{
  "set_id": "set_001",
  "rec_type": "similar",
  "title": "Keep the current minimal mood",
  "products": [
    {
      "product_id": "p001",
      "name": "Black Short Jacket",
      "category": "outerwear",
      "price": 8900,
      "currency": "JPY",
      "color": "black",
      "image_url": "https://example.com/p001.jpg",
      "in_stock": true
    }
  ],
  "total_price": 15600,
  "currency": "JPY",
  "reason": "Matches the customer's current minimal style while staying in stock.",
  "score": 0.86
}
```

Required:

- `set_id`
- `rec_type`
- `products`
- `reason`

Optional:

- `title`
- `total_price`
- `currency`
- `score`
- `warnings`

### 4.6 `RecommendationResponse`

```json
{
  "status": "success",
  "session_id": "s001",
  "round": 1,
  "sets": [],
  "applied_constraints": {},
  "warnings": []
}
```

Required:

- `status`
- `session_id`
- `round`
- `sets`

Optional:

- `applied_constraints`
- `warnings`
- `debug_trace_id`

### 4.7 `FeedbackPayload`

```json
{
  "session_id": "s001",
  "set_id": "set_001",
  "feedback_type": "partial_adjust",
  "dimension": "color",
  "dimension_value": "red",
  "raw_voice_text": "颜色太亮了",
  "source": "quick_tag"
}
```

Required:

- `session_id`
- `set_id`
- `feedback_type`
- `source`

Optional:

- `dimension`
- `dimension_value`
- `raw_voice_text`
- `target_product_id`

### 4.8 `ConstraintDelta`

The Agent-produced result after parsing feedback.

```json
{
  "avoid_add": [
    {
      "dimension": "color",
      "value": "red",
      "reason": "customer_disliked"
    }
  ],
  "keep_add": [],
  "budget_update": null,
  "style_shift": null,
  "requires_new_recommendation": true
}
```

Required:

- `avoid_add`
- `keep_add`
- `requires_new_recommendation`

Optional:

- `budget_update`
- `style_shift`
- `fit_update`
- `notes`

### 4.9 `FaceConsentState`

```json
{
  "consent_given": false,
  "face_mode": "default_face",
  "face_profile_id": null,
  "default_face_template_id": "face_default_02",
  "expire_at": null
}
```

Required:

- `consent_given`
- `face_mode`

Conditional:

- `face_profile_id` is required when `face_mode = real_face`.
- `default_face_template_id` is required when `face_mode = default_face`.

Policy:

- If consent is denied, do not create a real face profile.
- Default face selection should use body template, style context, or explicit user choice, not hidden face similarity analysis.

### 4.10 `TryOnHandoffRequest`

```json
{
  "session_id": "s001",
  "set_id": "set_002",
  "product_combo": ["p001", "p008"],
  "base_template_id": "body_template_03",
  "face_mode": "default_face",
  "face_profile_id": null,
  "default_face_template_id": "face_default_02",
  "idempotency_key": "s001-set002-tryon"
}
```

Required:

- `session_id`
- `set_id`
- `product_combo`
- `base_template_id`
- `face_mode`
- `idempotency_key`

Conditional:

- `face_profile_id` if `face_mode = real_face`.
- `default_face_template_id` if `face_mode = default_face`.

### 4.11 `ProductDetailsResponse`

```json
{
  "status": "success",
  "product": {
    "product_id": "p001",
    "sku": "SKU-001",
    "name": "Black Short Jacket",
    "category": "outerwear",
    "price": 8900,
    "currency": "JPY",
    "fabric": "cotton blend",
    "color": "black",
    "sizes": ["S", "M"],
    "image_urls": ["https://example.com/p001.jpg"],
    "store_location": "Aisle 2",
    "stock_quantity": 5
  }
}
```

Required:

- `status`
- `product.product_id`
- `product.name`
- `product.price`
- `product.currency`

Optional:

- `product.fabric`
- `product.sku`
- `product.image_urls`
- `product.store_location`
- `product.stock_quantity`

## 5. Review Questions for Teammates

Inventory/product:

- Can your API return every required field in `ProductSummary`?
- Which optional fields can you support in the MVP?
- Can you guarantee `in_stock` is current enough for demo?

Recommendation:

- Is `UserNeedConstraints` enough to generate the first version?
- Does `RecommendationSet` need score breakdowns or only final `score`?
- Can the recommendation service preserve `keep` constraints?

Image/try-on:

- Is `TryOnHandoffRequest` enough to start generation?
- What fields are needed for default face selection?
- What should be returned for pending/failed generation?

Frontend:

- Is `RecommendationSet` enough for rendering cards?
- Which feedback dimensions should be visible as buttons?
- Where should voice transcript appear, if at all?

Agent:

- Are `ConstraintDelta` and `UserNeedConstraints` sufficient for the feedback loop?
- Which state fields should be persisted between browser refreshes?
