# image_tryon — Integration Guide

Audience: **Agent foundation owner**, wiring the try-on module into the agent loop.

This module is the Image/Try-on team's deliverable. It replaces the try-on and
default-face methods currently stubbed by `agent_foundation/mock_tools.py`
(`MockRetailTools`). It owns body-template matching, default-face selection, and
the try-on image generation pipeline (Gemini 2.5 Flash Image, a.k.a. "nano banana").

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

### A. In-process import (recommended if the agent runs Python)

```python
from image_tryon import (
    match_body_template,
    select_default_face_template,
    generate_tryon,
    get_generation_status,
)
```

Drop the `image_tryon/` package next to `agent_foundation/` and call the
functions directly. No network hop. See the adapter in §4.

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

## 4. Mapping to the current `MockRetailTools`

The agent workflow (`agent_foundation/workflow.py`) today calls two methods on
`self.tools`. Their names and shapes **differ** from ours, so the cleanest path
is a thin adapter that exposes the agent's expected signatures and delegates to
our functions. Three differences to be aware of:

| # | Agent's `MockRetailTools` | Our function | Gap |
|---|---|---|---|
| 1 | `select_default_face_template(matched_body_template_id=…)` | `select_default_face_template(template_id=…)` | **param name only**; return shape already matches |
| 2 | `handoff_tryon_generation(product_combo: list[str], base_template_id=…, face_mode=…, face_profile_id=…, default_face_template_id=…)` | `generate_tryon(outfit: dict, template_id=…, use_own_face=…, user_face=…)` | **name + shape**; see §4.1 |
| 3 | `matched_body_template_id` comes from upstream image analysis | `match_body_template(body_profile)` | who runs matching? see §4.2 |

### 4.1 The `product_combo` → `outfit` gap (most important)

`handoff_tryon_generation` hands us a **flat list of product IDs**
(`product_combo: list[str]`). We need, per garment: a **slot**, a **category**,
and an **image reference** (`image_url`). Someone must enrich product IDs into
the slot-structured `outfit` before calling `generate_tryon`.

That enrichment (id → category + product image URL) is **inventory data**, not
ours. Options:
1. The inventory tool returns the `outfit` payload (slot-structured, with image
   URLs) alongside `product_combo` — preferred, keeps us decoupled.
2. The adapter calls an inventory lookup to resolve each id.

Until that's settled, the adapter below shows the boundary explicitly.

### 4.2 Who runs body matching?

The current workflow takes `matched_body_template_id` from
`state.analysis` (the image-analysis handoff upstream). If upstream already
emits a `template_id` using **our** taxonomy, `match_body_template` is optional.
If upstream emits a raw `body_profile`, route it through `match_body_template`
first. Please confirm which one upstream produces — see Open Questions (§7).

### 4.3 Adapter shim (in-process)

```python
from image_tryon import (
    select_default_face_template as _select_face,
    generate_tryon as _generate_tryon,
    get_generation_status,
)
from agent_foundation.contracts import FaceMode, ToolStatus

class ImageTryonTools:
    """Drop-in replacement for the try-on methods of MockRetailTools."""

    def select_default_face_template(
        self, session_id, matched_body_template_id, style_context,
        explicit_user_choice, idempotency_key,
    ):
        return _select_face(
            session_id=session_id,
            template_id=matched_body_template_id,   # name bridge
            style_context=style_context,
            explicit_user_choice=explicit_user_choice,
            idempotency_key=idempotency_key,
        )

    def handoff_tryon_generation(
        self, session_id, set_id, product_combo, base_template_id,
        face_mode, idempotency_key,
        face_profile_id=None, default_face_template_id=None,
    ):
        outfit = resolve_products_to_outfit(product_combo)   # §4.1 — inventory-owned
        use_own_face = face_mode == FaceMode.REAL_FACE
        user_face = load_face_pixels(face_profile_id) if use_own_face else None
        return _generate_tryon(
            session_id=session_id,
            set_id=set_id,
            template_id=base_template_id,            # name bridge
            outfit=outfit,
            idempotency_key=idempotency_key,
            use_own_face=use_own_face,
            user_face=user_face,
        )

    # new: the agent/frontend polls this until succeeded
    def get_tryon_status(self, generation_id):
        return get_generation_status(generation_id)
```

We can ship this adapter as `image_tryon/adapter.py` if you prefer real code over
a snippet — just say the word.

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
| Model | `gemini-2.5-flash-image` (REST via stdlib `urllib`; retries on 429/500/503) |
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
