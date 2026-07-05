# image_tryon — Integration Guide

Audience: **Agent foundation owner**, wiring the try-on module into the agent loop.

This module is the Image/Try-on team's deliverable. It replaces the try-on and
default-face handoff currently represented by the TS/ADK runtime in
`server/agent/`. It owns body-template matching, default-face selection, and
the try-on image generation pipeline (Gemini 3 Pro Image / "Nano Banana Pro",
model id `gemini-3-pro-image`; the high-volume alternative is Nano Banana 2 /
`gemini-3.1-flash-image`).

Contracts: [docs/TEAM_CONTRACTS.md](../docs/TEAM_CONTRACTS.md) ·
[docs/TOOL_SCHEMAS.md](../docs/TOOL_SCHEMAS.md).

---

## 1. What this module exposes

Three tools the agent calls, plus one polling companion:

| Tool | Mode | In → Out |
|---|---|---|
| `match_body_template` | sync, stateless | `body_profile` → `template_id` + echoed `body_profile` + `confidence` |
| `select_default_face_template` | sync, stateless | `template_id` + style → default `face_profile` |
| `generate_tryon` | **async** | `template_id` + `outfit` (+ optional face) → `pending` + `generation_id` |
| `get_generation_status` | poll | `generation_id` → `generation_status` + `result_url` |

`generate_tryon` returns immediately with `pending`; the image is produced on a
background thread. The agent (or frontend) polls `get_generation_status` until
`generation_status == "succeeded"`, then reads `result_url`.

---

## 2. Two ways to integrate

Both call the **same functions** in `image_tryon/tools.py`. Business logic lives
below `tools.py`; `service.py` is a thin HTTP shell with no logic.

> **Use path B (HTTP) for this repo.** The active Agent runtime is the TS/ADK
> runtime in `server/agent/`, so it integrates over HTTP (§2.B). Path A
> (in-process import) is only for a Python caller that owns the orchestration —
> it is not how this repo wires the agent.

### A. In-process import (Python-only, not used by this repo)

```python
from image_tryon import (
    match_body_template,
    select_default_face_template,
    generate_tryon,
    get_generation_status,
)
```

Use this only when a Python caller owns the orchestration. The active Agent
runtime in this repo is TypeScript, so local integration should use the HTTP
service path below.

### B. HTTP service (separate deployment / Cloud Run)

```bash
pip install -r image_tryon/requirements.txt
export GEMINI_API_KEY=...                       # or a .env at repo root
uvicorn image_tryon.service:app --port 8080
```

| Method | Path | Maps to |
|---|---|---|
| POST | `/tools/match_body_template` | `match_body_template` |
| POST | `/tools/select_default_face_template` | `select_default_face_template` |
| POST | `/tools/generate_tryon` | `generate_tryon` |
| GET | `/tools/generation_status/{id}` | `get_generation_status` (rewrites paths to URLs) |
| GET | `/results/{id}/{view}` | serves the generated PNG |
| GET | `/health` | liveness |

When served over HTTP, `get_generation_status` rewrites the on-disk relative
paths into absolute `…/results/{id}/{view}` URLs, and `result_url` points to the
`front` view.

---

## 3. Tool reference

All inputs/outputs are plain JSON-shaped dicts. `status` is one of
`success | partial | failed`. `generation_status` is one of
`pending | processing | succeeded | failed`.

### 3.1 `match_body_template(body_profile: dict) -> dict`

Stateless. We do **not** persist `body_profile`; we echo it back so the caller
can pass it on for size lookup.

Request:
```json
{
  "gender_presentation": "female",
  "body_shape": "hourglass",
  "body_size": "average",
  "height_cm": 168,
  "weight_kg": 58,
  "age_range": "26-35"
}
```
Response:
```json
{
  "status": "success",
  "template_id": "f_hourglass_average",
  "body_profile": { "...": "echoed unchanged" },
  "confidence": 0.95,
  "source": "match_body_template",
  "warnings": []
}
```
`confidence`: `0.95` exact match · `0.5` fallback · otherwise
`max(0.6, 1 - 0.05 * score)`.

### 3.2 `select_default_face_template(...) -> dict`

```python
select_default_face_template(
    *, session_id, template_id,
    style_context=None, explicit_user_choice=None, idempotency_key=None,
)
```
Response (`face_profile` shape matches the Agent's `FaceConsentState`):
```json
{
  "status": "success",
  "session_id": "s1",
  "face_profile": {
    "consent_given": false,
    "face_mode": "default_face",
    "face_profile_id": null,
    "default_face_template_id": "face_default_f_hourglass_average",
    "expire_at": null
  },
  "match_basis": "body_template_and_style_context",
  "warnings": []
}
```
v1 uses the base figure's own face, so `default_face_template_id` is derived from
the body template. A real preset face library is a TODO.

### 3.3 `generate_tryon(...) -> dict`

```python
generate_tryon(
    *, session_id, set_id, template_id, outfit, idempotency_key,
    use_own_face=False, user_face=None, views=None,
)
```
`outfit` is **slot-structured** with an image reference per garment:
```json
{
  "items": {
    "top_inner": { "product_id": "p1", "category": "top_inner", "image_url": "https://.../p1.png" },
    "bottom":    { "product_id": "p2", "category": "bottom",     "image_url": "https://.../p2.png" },
    "outerwear": { "product_id": "p3", "category": "outerwear",  "image_url": "https://.../p3.png" }
  }
}
```
- `image_url` may be an `http(s)` URL or a repo-relative path.
- Garments are auto-ordered by layer (`legwear < top_inner < bottom < … < outerwear < shoes < accessories`).
- Face: `use_own_face=True` + `user_face` (URL/bytes of the consented face) for
  real-face mode; otherwise the base figure's default face is kept.
- `views` defaults to `["front"]`; extra views (e.g. `"side"`, `"back"`) are
  derived from the locked front image.

Immediate response (does **not** block on generation):
```json
{
  "status": "success",
  "session_id": "s1",
  "generation_id": "gen_s1_set1_ab12cd34",
  "generation_status": "pending",
  "result_url": null,
  "warnings": []
}
```

### 3.4 `get_generation_status(generation_id: str) -> dict`

```json
{
  "status": "success",
  "generation_id": "gen_s1_set1_ab12cd34",
  "generation_status": "succeeded",
  "result_views": { "front": ".../results/gen_.../front" },
  "result_url": ".../results/gen_.../front",
  "warnings": [],
  "error": null
}
```
Unknown `generation_id` → `status: failed`, `generation_status: failed`,
`error: "unknown generation_id"`.

---

## 4. Mapping to the TS/ADK Agent runtime

The active Agent workflow (`server/agent/workflow.ts`) currently builds a
`TryonHandoffPayload` and logs `handoff_tryon_generation`. Full try-on
integration should replace that mock handoff with a TypeScript adapter that
calls the HTTP service in §2.B. Three differences to be aware of:

| # | TS/ADK runtime today | Image try-on service | Gap |
|---|---|---|---|
| 1 | `state.matched_body_template_id` | `template_id` | **param name only** |
| 2 | `TryonHandoffPayload.outfit.slots` | `generate_tryon(outfit: dict, template_id=…, use_own_face=…, user_face=…)` | **slot shape bridge**; see §4.1 |
| 3 | `matched_body_template_id` is stored in Agent state | `match_body_template(body_profile)` | Agent runs matching before recommendation and handoff |

### 4.1 The `product_combo` → `outfit` gap (most important)

The TS runtime already carries slot-structured outfit data in
`TryonHandoffPayload.outfit.slots`. The adapter still needs to map those slots to
the exact `image_tryon` category names and image fields expected by
`generate_tryon`.

That enrichment is now sourced from inventory-backed recommendation sets:
`product_id`, `slot`, `image_url`, `vton_reference_image_url`, and `prompt`.

### 4.2 Who runs body matching?

The image-analysis handoff produces `BodyProfile`. The Agent calls
`match_body_template`, stores `matched_body_template_id`, and then passes that
template ID to recommendation and try-on.

### 4.3 Adapter path

Implement a TS adapter under `server/agent/` or `server/providers/`:

```text
TryonHandoffPayload
  -> POST /tools/generate_tryon
  -> store generation_id in Agent state
  -> poll GET /tools/generation_status/{id}
  -> expose result_url to frontend
```

---

## 5. Async model

`generate_tryon` returns `pending` and runs generation on a background thread
(`ThreadPoolExecutor`, 2 workers). Unlike the current mock — which returns a
final result synchronously — the integrated flow needs a **poll step**:

```
generate_tryon → pending + generation_id
   ↓ (poll every ~2s)
get_generation_status → processing → … → succeeded + result_url
```

For a Cloud Run single instance this in-memory store is fine for the demo. Multi
-instance needs shared state + object storage (GCS) — see TODO.

---

## 6. Idempotency & errors

- **Idempotency:** repeat calls with the same `idempotency_key` return the same
  `generation_id` and do not re-run generation (no duplicate API spend). The
  workflow already passes `f"{session_id}-{set_id}-tryon"`, which works as-is.
- **Errors:** every tool returns `status`; failures never raise across the
  boundary. `generate_tryon` failures surface via `get_generation_status`
  (`generation_status: failed`, structured `error` string).

---

## 7. Open integration questions

1. **Body matching ownership (§4.2):** does upstream analysis emit a
   `template_id` (our taxonomy) or a raw `body_profile`?
2. **`product_combo` enrichment (§4.1):** will inventory return the
   slot-structured `outfit` with image URLs, or do we resolve ids ourselves?
3. **Real-face pixels:** `face_profile_id` → face image bytes. Which service
   owns that lookup (biometric/consent channel)?
4. **Result storage:** local `_generated/` for the demo vs GCS signed URLs for
   production — confirm target.

---

## 8. Configuration & deployment

| Item | Value |
|---|---|
| Env | `GEMINI_API_KEY` (env var or repo-root `.env`) |
| Model | `gemini-3-pro-image` (Nano Banana Pro; REST via stdlib `urllib`; retries on 429/500/503). High-volume alt: `gemini-3.1-flash-image` (Nano Banana 2) |
| Deps | `fastapi`, `uvicorn`, `pydantic` (HTTP mode only; tools layer is stdlib) |
| Results | `image_tryon/_generated/{generation_id}/{view}.png` (gitignored) |
| Deploy | `uvicorn image_tryon.service:app` → container → Cloud Run |

## 9. Tests

```bash
python3 -m unittest discover -s tests
```
9 tests cover matching, outfit ordering/exclusion, async generate + status,
idempotency dedup, and default-face selection — all with a fake client (no API
calls).
