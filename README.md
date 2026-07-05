# Clothing Store Inventory + Sales Agent

Hackathon project for the Findy DevOps x AI Agent Hackathon.

This is an integrated clothing-store Agent that combines camera-based outfit analysis, inventory-aware recommendation, structured sales feedback, realtime try-on preview, and try-on generation handoff. The target retail touchpoints are:

| Touchpoint | Purpose |
|---|---|
| Fitting room mirror | Self-service recommendation and virtual try-on flow |
| Entrance screen (`entrance_screen`) | Traffic attraction and short-session recommendation |
| Staff iPad | One-to-one assisted selling and staff takeover |

The core product claim is that the system behaves like a sales consultant, not a static recommender. It should understand customer intent, call inventory/recommendation tools, react to structured feedback, refine constraints, and hand off confirmed outfits to the try-on generation module.

## Core Demo Loop

```text
camera capture
  -> body/outfit analysis
  -> ADK Agent session
  -> intent route
  -> inventory-aware recommendation tool calls
  -> three outfit sets
  -> customer feedback
  -> constraint update
  -> refined recommendation
  -> Lucy realtime preview
  -> Google/image try-on handoff
```

## Documentation

| File | Purpose |
|---|---|
| [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) | Project plan, workflow, data model, build order, GitHub process |
| [docs/COMPETITION_RULES_AUDIT.md](docs/COMPETITION_RULES_AUDIT.md) | Findy rules audit and project-fit critique |
| [docs/TEAM_CONTRACTS.md](docs/TEAM_CONTRACTS.md) | Cross-team DTOs, enums, ownership, review rules |
| [docs/TOOL_SCHEMAS.md](docs/TOOL_SCHEMAS.md) | Agent tool request/response schemas |
| [docs/AGENT_WORKFLOW_SPEC.md](docs/AGENT_WORKFLOW_SPEC.md) | Agent graph nodes, state deltas, failure paths |
| [docs/DATABASE_SCHEMA_NOTES.md](docs/DATABASE_SCHEMA_NOTES.md) | Database-facing notes and table ownership boundaries |
| [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) | Minimum demo path and judging evidence |
| [docs/DEPLOYMENT_AND_DEVOPS.md](docs/DEPLOYMENT_AND_DEVOPS.md) | Deployment, CI/CD, observability checklist |
| [INVENTORY_CONTRACT.md](INVENTORY_CONTRACT.md) | Inventory subsystem contract |
| [image_tryon/INTEGRATION.md](image_tryon/INTEGRATION.md) | Image/try-on integration notes |

## Local Run

```bash
npm install
npm run setup:assets
npm run dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:8787`
- Health check: `http://localhost:8787/api/health`

Camera access requires a secure context. `localhost` works directly; remote deployments must use HTTPS.

## Environment

```bash
cp .env.example .env
```

Important variables:

```text
GEMINI_API_KEY=
VITE_ANALYSIS_MODE=auto
GOOGLE_CLOUD_PROJECT=
GOOGLE_CLOUD_LOCATION=asia-northeast1
GEMINI_MODEL=gemini-3.5-flash
GEMINI_IMAGE_MODEL=gemini-3-pro-image
DECART_API_KEY=
LUCY_MODEL=lucy-vton-3
INVENTORY_BACKEND=memory
```

If `DECART_API_KEY` is empty, the Agent returns mock Lucy token metadata so the demo flow still runs.

## Image Capture And Analysis

The browser flow captures one front-facing full-body image after consent and pose readiness checks. The HTTP route is a local frontend compatibility layer over the image analysis tool.

Tool name:

```text
analyze_full_body_dressroom_image
```

Input highlights:

- `capture_data_url`: front-facing full-body image as `data:image/*;base64,...`
- `manual_profile`: user-provided `height_cm`, `weight_kg`, `gender_presentation`, `age_range`
- `analysis_mode`: `auto`, `ai`, or `mock`; `auto` uses Gemini when configured and mock analysis locally
- `session_id`: optional caller session id

Output contracts:

- `schemas/body-profile.schema.json`
- `schemas/outfit-profile.schema.json`
- `schemas/analysis-handoff.schema.json`

Implementation notes:

- API keys are server-side only.
- The tool does not perform face identity recognition.
- Body handling is template-based. Exact body measurements are never estimated, stored, or shared; the `measurements` field was dropped from the v1.2 contract.
- OOTD recognition extracts visible items, dominant colors, style tags, fit, material appearance, and item regions.
- System fields such as `session_id`, `analysis_id`, `analysis_mode`, `captured_at`, and `source_capture_id` are generated or overwritten by the tool.

## ADK Agent Runtime

The active Agent runtime lives in `server/agent/` and is mounted at `/api/agent`. Legacy Python Agent prototypes have been removed so integration code has one runtime surface.

Core capabilities:

- Google ADK runner wrapper
- session state and JSON-backed local persistence
- intent routing
- inventory-aware recommendation tool calls
- structured feedback parsing and refinement
- Lucy realtime visual provider handoff
- try-on generation handoff payload
- ADK event and tool-call trace for demo/debug

Frontend demo surface:

```text
src/AgentRuntimePanel.tsx
```

Smoke path:

```bash
npm run smoke:agent
```

## Inventory Subsystem

The single-store inventory subsystem provides product search, stock levels, reservation holds, purchase confirmation, restock, low-stock checks, and store-route generation. Code lives in `server/inventory/`.

Backend switch:

```bash
# default local demo
INVENTORY_BACKEND=memory

# Firestore
INVENTORY_BACKEND=firestore
```

Routes:

```text
GET    /api/inventory/products
GET    /api/inventory/products/:id
POST   /api/inventory/products
PATCH  /api/inventory/products/:id
DELETE /api/inventory/products/:id
GET    /api/inventory/levels
GET    /api/inventory/levels/:id
POST   /api/inventory/levels/:id/restock
PATCH  /api/inventory/levels/:id
GET    /api/inventory/low-stock
GET    /api/inventory/reservations
POST   /api/inventory/reservations
POST   /api/inventory/reservations/:id/confirm
POST   /api/inventory/reservations/:id/release
```

Agent-facing tools include:

- `search_inventory`
- `reserve_items`
- `confirm_purchase`
- `create_store_route`

## Image Try-On

The image/try-on module lives in `image_tryon/`. It owns body-template matching, default/real face branch handling, prompt building, generation jobs, and base-model assets.

Agent handoff output includes:

- selected `set_id`
- `matched_body_template_id`
- slot-based outfit payload
- face consent branch
- Lucy realtime preview metadata
- Google/image try-on fallback payload

## Tests And Checks

```bash
npm run check
npm run test
npm run build
npm run smoke:agent
```

Known current caveats:

- `npm install` reports transitive dependency vulnerabilities; do not run `npm audit fix --force` without review.
- Lucy live preview requires a valid `DECART_API_KEY`.
- JSON-backed session persistence is for local/demo use; Cloud Run should use external storage.

## Privacy Boundaries

- Do not start the camera before explicit consent.
- Do not perform face identity recognition.
- Keep body handling template-based where possible.
- Only create a real face profile when the user has granted consent.
- Default/virtual face mode must not use hidden face similarity analysis.
- Raw photos and generated sensitive artifacts should have session-scoped retention and deletion.
