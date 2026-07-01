# image_tryon — Try-on Generation Module

The Image/Try-on team's module. It runs as a **standalone service** exposing 3
tools the Agent foundation calls as "tools". For wiring it into the agent loop,
see **[INTEGRATION.md](INTEGRATION.md)**.

Contracts: [docs/TEAM_CONTRACTS.md](../docs/TEAM_CONTRACTS.md) ·
[docs/TOOL_SCHEMAS.md](../docs/TOOL_SCHEMAS.md).

## Tools

| Tool | Mode | In → Out |
|---|---|---|
| `match_body_template` | stateless | `body_profile` → `template_id` + echoed `body_profile` + confidence |
| `select_default_face_template` | stateless | `template_id` + style → default face profile |
| `generate_tryon` | **async** | `template_id` + `outfit` (slot-structured) + `use_own_face`/`user_face` → `pending` + `generation_id` |
| `get_generation_status` | poll | `generation_id` → `generation_status` + `result_url` |

## Run

```bash
pip install -r image_tryon/requirements.txt
export GEMINI_API_KEY=...                      # or a .env at repo root
uvicorn image_tryon.service:app --port 8080
```

Endpoints: `/tools/match_body_template`, `/tools/select_default_face_template`,
`/tools/generate_tryon`, `/tools/generation_status/{id}`, `/results/{id}/{view}`,
`/health`.

## Layout

| File | Responsibility |
|---|---|
| `tools.py` | The 3 public tools + status query (contract-shaped dicts) |
| `service.py` | FastAPI HTTP layer |
| `matcher.py` / `manifest.py` / `taxonomy.py` / `validator.py` | body → template matching + template library |
| `garment.py` | slot-structured outfit → ordered layering (loads product images by URL/path) |
| `render.py` / `prompt_builder.py` / `gemini_client.py` | layered dressing + multi-view generation (nano banana) |
| `jobs.py` | async job store + background execution |
| `faces.py` | default-face selection |
| `data/base_models.json` + `assets/base-models/` | 14 base templates (3 views each) |

## Test

```bash
python3 -m unittest discover -s tests
```

## TODO

- Move result storage to **GCS**; serve `result_url` as a signed URL (currently
  writes to local `_generated/`, single instance).
- **Preset face library** (faces.py currently reuses the base figure's face);
  real-face flows resolve `face_profile_id` via the biometric/consent channel.
- After the agent merge, import shared enums from `agent_foundation.contracts`.
