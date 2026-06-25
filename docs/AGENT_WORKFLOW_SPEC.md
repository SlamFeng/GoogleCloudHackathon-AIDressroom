# Agent Workflow Spec

Status: proposal for Agent foundation implementation.

This document defines the first Agent workflow graph for the Clothing Store Inventory + Sales Agent. It is written as an implementation guide, not as a UI flow.

## 1. Design Goal

The Agent should:

- Route customer intent.
- Convert natural language and click feedback into structured constraints.
- Call inventory/recommendation tools.
- Update constraints after feedback.
- Stop loops safely.
- Hand off confirmed outfits to try-on generation.

The Agent should not:

- Own product database internals.
- Implement real recommendation ranking internals.
- Implement image generation.
- Store long-term customer profiles in v0.1.

## 2. State Shape

```json
{
  "session_id": "s001",
  "scene_type": "mirror",
  "store_id": "store_001",
  "status": "communicating",
  "route": "unclear",
  "analysis": {
    "matched_body_template_id": "body_template_03",
    "current_style": ["casual"],
    "confidence": 0.82
  },
  "consent": {
    "face_consent_given": false,
    "face_mode": "default_face",
    "face_profile_id": null,
    "default_face_template_id": null
  },
  "user_need": {
    "category": [],
    "style_tags": [],
    "colors": [],
    "budget_range": null,
    "occasion": null,
    "avoid": [],
    "keep": []
  },
  "recommendation_round": 0,
  "shown_set_ids": [],
  "selected_set_id": null,
  "feedback_history": [],
  "loop_status": "collecting",
  "last_tool_result": null,
  "errors": []
}
```

## 3. Workflow Graph

```text
SessionInit
  -> ConsentCheck
  -> AnalysisIngest
  -> UserInputNormalize
  -> IntentRouter
  -> NeedParser
  -> RecommendationToolCall
  -> RecommendationPresenter
  -> FeedbackCollector
  -> FeedbackParser
  -> ConstraintUpdater
  -> LoopController
  -> OutfitConfirm
  -> FaceConsentBranch
  -> TryOnHandoff
```

Use ADK 2.0 graph/dynamic workflow as the primary implementation model. Sequential/parallel/loop are logical shapes inside the graph:

- Sequential: initialization and input parsing.
- Parallel: route B can request similar/style/seasonal sets.
- Loop: feedback -> parse -> update constraints -> refine recommendations.

## 4. Node Specs

### 4.1 `SessionInit`

Input:

- `scene_type`
- `store_id`
- optional existing `session_id`

Output state delta:

```json
{
  "status": "communicating",
  "recommendation_round": 0,
  "shown_set_ids": [],
  "feedback_history": []
}
```

Failure:

- If `scene_type` is missing, default to `mirror` only for local demo.
- Production should reject unknown `scene_type`.

### 4.2 `ConsentCheck`

Purpose: ensure camera/face handling does not proceed without explicit state.

Output:

```json
{
  "consent": {
    "face_consent_given": false,
    "face_mode": "default_face"
  }
}
```

Note:

- General camera/photo consent and face consent can be separate UI concerns.
- Real face profile must not be created here; that happens after outfit confirmation.

### 4.3 `AnalysisIngest`

Input:

- `AnalysisResult` from image/body/style module.

State delta:

```json
{
  "analysis": {
    "matched_body_template_id": "body_template_03",
    "current_style": ["casual", "minimal"],
    "confidence": 0.82
  }
}
```

Failure:

- If confidence is low, set a warning and continue with default body template or ask for retake.

### 4.4 `UserInputNormalize`

Input examples:

- voice transcript
- quick tag click
- staff iPad input
- button action

Output:

```json
{
  "normalized_input": {
    "source": "voice",
    "text": "我想要一套不太正式的约会穿搭",
    "action": null
  }
}
```

### 4.5 `IntentRouter`

Routes:

| Route | Condition |
|---|---|
| `explicit` | Customer states category, occasion, style, budget, or concrete clothing need |
| `recommendation` | Customer asks the Agent to recommend without clear preference |
| `unclear` | Mixed/vague intent that would cause unstable recommendation |

State delta:

```json
{
  "route": "explicit"
}
```

Failure:

- If confidence is low, use `unclear` and ask one clarification.

### 4.6 `NeedParser`

Purpose: parse user text into `UserNeedConstraints`.

Input:

```text
下周去海边，不喜欢露腿，预算两万日元
```

State delta:

```json
{
  "user_need": {
    "category": [],
    "style_tags": ["vacation"],
    "colors": [],
    "budget_range": {
      "min": 0,
      "max": 20000,
      "currency": "JPY"
    },
    "occasion": "beach",
    "avoid": [
      {
        "dimension": "fit",
        "value": "leg_exposure",
        "reason": "customer_disliked"
      }
    ],
    "keep": []
  }
}
```

### 4.7 `RecommendationToolCall`

Purpose: call `get_recommendations`.

Input:

- `SessionContext`
- `AnalysisResult`
- `UserNeedConstraints`

State delta:

```json
{
  "recommendation_round": 1,
  "shown_set_ids": ["set_001", "set_002", "set_003"],
  "last_tool_result": {
    "tool": "get_recommendations",
    "status": "success"
  }
}
```

Failure:

- `partial`: present available sets and explain limited inventory.
- `failed`: fall back to seasonal/hot items or request staff takeover.

### 4.8 `RecommendationPresenter`

Purpose: prepare Agent-facing explanation and UI payload.

Output:

- `RecommendationResponse` to frontend.
- Short reasons per set.

Rule:

- Do not invent stock or price details not returned by tools.

### 4.9 `FeedbackCollector`

Input:

- quick tag feedback
- voice supplement
- confirm action
- reject all action

Output:

```json
{
  "feedback_payload": {
    "session_id": "s001",
    "set_id": "set_001",
    "feedback_type": "partial_adjust",
    "dimension": "color",
    "dimension_value": "red",
    "raw_voice_text": "颜色太亮了",
    "source": "quick_tag"
  }
}
```

### 4.10 `FeedbackParser`

Purpose: convert feedback into `ConstraintDelta`.

Rules:

| Feedback | Constraint Delta |
|---|---|
| color dislike | add color to `avoid` |
| fit dislike | add fit/body-fit rule to `avoid` or `fit_update` |
| style mismatch | set `style_shift` |
| price issue | update budget |
| positive keep | add attribute to `keep` |
| reject all | broaden pool and avoid repeated sets |

### 4.11 `ConstraintUpdater`

Purpose: merge `ConstraintDelta` into `user_need`.

State delta:

```json
{
  "user_need": {
    "avoid": [
      {
        "dimension": "color",
        "value": "red",
        "reason": "customer_disliked"
      }
    ]
  },
  "feedback_history": [
    {
      "set_id": "set_001",
      "dimension": "color",
      "dimension_value": "red"
    }
  ]
}
```

Rule:

- Preserve `keep` constraints across later recommendation rounds.
- Deduplicate repeated avoid/keep entries.

### 4.12 `LoopController`

Exit conditions:

- Customer confirms outfit.
- `recommendation_round >= max_rounds`.
- Tool fails repeatedly.
- Customer exits.
- Staff takeover requested.

Default:

```text
max_rounds = 3
```

State transitions:

| Condition | Next |
|---|---|
| confirm | `OutfitConfirm` |
| needs new recommendation | `RecommendationToolCall` using `refine_recommendations` |
| max rounds reached | staff takeover or seasonal fallback |
| quit | `ended` |

### 4.13 `OutfitConfirm`

Purpose: set selected outfit.

State delta:

```json
{
  "selected_set_id": "set_002",
  "status": "confirmed"
}
```

### 4.14 `FaceConsentBranch`

Purpose: choose real face profile or default face template.

Branch:

```text
if consent_given:
  call create_real_face_profile
else:
  call select_default_face_template
```

State delta:

```json
{
  "consent": {
    "face_consent_given": false,
    "face_mode": "default_face",
    "default_face_template_id": "face_default_02"
  }
}
```

### 4.15 `TryOnHandoff`

Purpose: call `handoff_tryon_generation`.

Input:

- selected set
- product combo
- body template
- face consent state

Output:

```json
{
  "generation_id": "gen_001",
  "generation_status": "pending"
}
```

## 5. Required Logs

Each turn should log:

- `session_id`
- node name
- route
- tool name
- tool status
- state delta summary
- recommendation round
- selected set, if any
- warnings/errors

## 6. Golden Test Cases

| Case | Input | Expected |
|---|---|---|
| Explicit need | "黑色外套，预算一万以内" | route `explicit`, budget/color/category parsed |
| Recommendation route | "没想法，你推荐" | route `recommendation`, three rec types requested |
| Unclear | "想换个感觉" | route `unclear`, one clarification |
| Color feedback | click color dislike red | red added to `avoid`, refine called |
| Positive keep | "这套颜色可以，换版型" | color added to `keep`, fit adjusted |
| Denied face | no consent | default face selected, no real face profile |
| Max rounds | three rejects | staff takeover/fallback |
