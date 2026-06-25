# Tool Schemas

Status: proposal for teammate review.

This file defines the first shared tool contracts for the Agent foundation. Tools can be implemented as mock functions, HTTP endpoints, ADK tools, or service adapters. The payload shape should remain compatible.

See [TEAM_CONTRACTS.md](TEAM_CONTRACTS.md) for shared DTO definitions.

## 1. General Tool Rules

Every mutating or externally visible tool call should include:

- `session_id`
- `scene_type`
- `store_id`
- `round`
- `idempotency_key`

Every tool response should include:

- `status`: `success | partial | failed`
- `session_id` when session-scoped
- `warnings` if partial or degraded
- `debug_trace_id` if available

## 2. `get_recommendations`

Purpose: get the first recommendation result for either explicit customer needs or recommendation route.

Owner: recommendation/inventory team.

Request:

```json
{
  "session": {
    "session_id": "s001",
    "scene_type": "mirror",
    "store_id": "store_001",
    "route": "recommendation",
    "round": 1,
    "idempotency_key": "s001-r1-get-recommendations"
  },
  "analysis": {
    "matched_body_template_id": "body_template_03",
    "current_style": ["casual", "minimal"],
    "confidence": 0.82
  },
  "constraints": {
    "category": [],
    "style_tags": [],
    "colors": [],
    "budget_range": null,
    "occasion": null,
    "avoid": [],
    "keep": []
  },
  "requested_rec_types": ["similar", "style", "seasonal"]
}
```

Response:

```json
{
  "status": "success",
  "session_id": "s001",
  "round": 1,
  "sets": [
    {
      "set_id": "set_001",
      "rec_type": "similar",
      "title": "Keep the current minimal mood",
      "products": [],
      "total_price": 15600,
      "currency": "JPY",
      "reason": "Matches the customer's current style and available stock.",
      "score": 0.86
    }
  ],
  "applied_constraints": {},
  "warnings": [],
  "debug_trace_id": "trace_001"
}
```

Failure behavior:

- If inventory is unavailable, return `status = failed` with warning.
- If one recommendation type fails, return `status = partial` and include available sets.

## 3. `refine_recommendations`

Purpose: get next recommendation after feedback updates constraints.

Owner: recommendation/inventory team.

Request:

```json
{
  "session": {
    "session_id": "s001",
    "scene_type": "mirror",
    "store_id": "store_001",
    "route": "recommendation",
    "round": 2,
    "idempotency_key": "s001-r2-refine"
  },
  "previous_set_id": "set_001",
  "shown_set_ids": ["set_001", "set_002", "set_003"],
  "constraints": {
    "category": [],
    "style_tags": [],
    "colors": [],
    "budget_range": null,
    "occasion": null,
    "avoid": [
      {
        "dimension": "color",
        "value": "red",
        "reason": "customer_disliked"
      }
    ],
    "keep": []
  },
  "constraint_delta": {
    "avoid_add": [
      {
        "dimension": "color",
        "value": "red",
        "reason": "customer_disliked"
      }
    ],
    "keep_add": [],
    "requires_new_recommendation": true
  }
}
```

Response: same shape as `get_recommendations`.

Required behavior:

- Avoid repeating `shown_set_ids` unless no alternatives exist.
- Preserve `keep` constraints as much as possible.
- Explain major changes in `reason`.

## 4. `record_feedback`

Purpose: persist customer feedback and parsed constraint delta.

Owner: Agent/backend.

Request:

```json
{
  "session_id": "s001",
  "set_id": "set_001",
  "feedback": {
    "feedback_type": "partial_adjust",
    "dimension": "color",
    "dimension_value": "red",
    "raw_voice_text": "颜色太亮了",
    "source": "quick_tag"
  },
  "constraint_delta": {
    "avoid_add": [
      {
        "dimension": "color",
        "value": "red",
        "reason": "customer_disliked"
      }
    ],
    "keep_add": [],
    "requires_new_recommendation": true
  },
  "idempotency_key": "s001-set001-feedback-color-red"
}
```

Response:

```json
{
  "status": "success",
  "session_id": "s001",
  "feedback_id": "feedback_001",
  "warnings": []
}
```

## 5. `get_product_details`

Purpose: fetch details after customer selects a product or outfit.

Owner: inventory/product team.

Request:

```json
{
  "session_id": "s001",
  "store_id": "store_001",
  "product_ids": ["p001", "p008"],
  "idempotency_key": "s001-details-p001-p008"
}
```

Response:

```json
{
  "status": "success",
  "session_id": "s001",
  "products": [
    {
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
  ],
  "warnings": []
}
```

## 6. `check_face_consent`

Purpose: read current face consent state before try-on handoff.

Owner: frontend/Agent.

Request:

```json
{
  "session_id": "s001",
  "idempotency_key": "s001-check-face-consent"
}
```

Response:

```json
{
  "status": "success",
  "session_id": "s001",
  "consent": {
    "consent_given": false,
    "face_mode": "default_face",
    "face_profile_id": null,
    "default_face_template_id": null,
    "expire_at": null
  }
}
```

## 7. `create_real_face_profile`

Purpose: create encrypted session-level face profile after explicit consent.

Owner: image/biometric module.

Request:

```json
{
  "session_id": "s001",
  "image_ref": "gs://bucket/session/s001/frame.jpg",
  "consent_given": true,
  "expire_at": "2026-07-10T14:00:00+09:00",
  "idempotency_key": "s001-create-real-face"
}
```

Response:

```json
{
  "status": "success",
  "session_id": "s001",
  "face_profile": {
    "consent_given": true,
    "face_mode": "real_face",
    "face_profile_id": "face_profile_001",
    "default_face_template_id": null,
    "expire_at": "2026-07-10T14:00:00+09:00"
  },
  "warnings": []
}
```

Policy:

- Do not call this tool if `consent_given` is false.
- Real face data must not be returned to the Agent.

## 8. `select_default_face_template`

Purpose: choose default virtual face when real face consent is denied.

Owner: image/try-on team.

Request:

```json
{
  "session_id": "s001",
  "matched_body_template_id": "body_template_03",
  "style_context": ["casual", "minimal"],
  "explicit_user_choice": null,
  "idempotency_key": "s001-select-default-face"
}
```

Response:

```json
{
  "status": "success",
  "session_id": "s001",
  "face_profile": {
    "consent_given": false,
    "face_mode": "default_face",
    "face_profile_id": null,
    "default_face_template_id": "face_default_02",
    "expire_at": null
  },
  "match_basis": "body_template_and_style_context",
  "warnings": []
}
```

Policy:

- Do not perform hidden face similarity analysis in denied-consent mode.

## 9. `handoff_tryon_generation`

Purpose: start virtual try-on image generation after outfit confirmation.

Owner: image/try-on team.

Request:

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

Response:

```json
{
  "status": "success",
  "session_id": "s001",
  "generation_id": "gen_001",
  "generation_status": "pending",
  "result_url": null,
  "warnings": []
}
```

Failure behavior:

- If `face_mode = real_face` but `face_profile_id` is missing, return `failed`.
- If `face_mode = default_face` but `default_face_template_id` is missing, return `failed`.
- If generation is async, return `generation_status = pending`.
