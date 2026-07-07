# Architecture

Status: current implementation (v0.2). One Cloud Run service serves the frontend, the capture/analysis API, the TS/ADK Agent runtime, and the inventory subsystem. The image try-on generator runs as a separate optional service.

## 1. System components

```mermaid
flowchart TB
    subgraph Client["Browser · mirror / entrance screen / staff iPad"]
        UI["Vite + React UI<br/>capture → analysis → Agent panel"]
        CAM["Camera + MediaPipe pose<br/>(useCameraCapture, pose.ts)"]
        LUCY_C["Lucy WebRTC client<br/>(useLucyRealtimeTryon)"]
    end

    subgraph CloudRun["Cloud Run service (Express, one container)"]
        STATIC["Static frontend (dist/)"]
        CAPI["Capture/Analysis API<br/>/api/sessions · /api/analyses"]
        IMG["Image analysis tool<br/>analyze_full_body_dressroom_image"]
        AGENT["TS/ADK Agent runtime<br/>/api/agent"]
        INV["Inventory subsystem<br/>/api/inventory"]
        LOG["Structured per-turn logs → Cloud Logging"]
    end

    subgraph Ext["External / optional"]
        GEM["Gemini API<br/>OOTD analysis + intent/need reasoning"]
        LUCY["Decart Lucy<br/>realtime virtual try-on"]
        TRYON["image_tryon service (Python/FastAPI)<br/>body match + Gemini image gen"]
        FS["Firestore<br/>(optional inventory backend)"]
    end

    UI --> STATIC
    CAM --> CAPI
    CAPI --> IMG
    IMG -- "auto: key? " --> GEM
    IMG -- "no key" --> MOCK["Mock analysis<br/>(deterministic)"]
    UI --> AGENT
    AGENT --> INV
    AGENT -- "classify intent / extract need" --> GEM
    AGENT -- "realtime preview token" --> LUCY
    LUCY_C -. WebRTC .-> LUCY
    AGENT -- "TRYON_SERVICE_URL set?" --> TRYON
    INV -- "INVENTORY_BACKEND=firestore" --> FS
    AGENT --> LOG
```

## 2. Core demo loop (request flow)

```mermaid
sequenceDiagram
    participant C as Customer (UI)
    participant A as Agent runtime
    participant Inv as Inventory
    participant L as Lucy
    C->>A: POST /agent/sessions (analysis handoff)
    A->>A: match_body_template → matched_body_template_id
    C->>A: chat "recommend three looks"
    A->>A: classify intent + extract need (Gemini or heuristic)
    A->>Inv: search_inventory / get_recommendations
    Inv-->>A: 3 in-stock outfit sets
    A-->>C: recommendations
    C->>A: preview set
    A->>L: build realtime try-on token
    A-->>C: Lucy payload (client_token redacted in events)
    C->>A: feedback "too formal"
    A->>A: constraint delta → refine_recommendations
    A-->>C: refined sets
    C->>A: confirm
    A->>Inv: reserve_items (hold, no oversell)
    A-->>C: try-on handoff (+ optional image_tryon generation)
    C->>A: purchase
    A->>Inv: confirm_purchase → real stock decrement + store route
```

## 3. Runtime surfaces & fallbacks

| Concern | Configured | Fallback (offline/demo) |
|---|---|---|
| OOTD analysis | Gemini (`analysis_mode=auto` + key) | deterministic mock analysis |
| Intent routing / need extraction | Gemini reasoning | `parsers.ts` heuristics |
| Realtime try-on | Decart Lucy (`DECART_API_KEY`) | mock Lucy token metadata |
| Try-on image generation | `image_tryon` via `TRYON_SERVICE_URL` | mock handoff payload |
| Inventory backend | Firestore | in-memory, auto-seeded |
| Session persistence | JSON file (`AGENT_SESSION_STORE_PATH`) | in-memory |

Every external dependency degrades gracefully, so the full agent loop runs with zero keys — that is what CI's `smoke:agent` exercises.

## 4. DevOps

- **CI** (`.github/workflows/ci.yml`): `check` → `test` (23 cases: inventory + agent golden cases) → `build` → end-to-end `smoke:agent`, on every push/PR.
- **Deploy** (`.github/workflows/deploy.yml`, `scripts/deploy-cloudrun.sh`): container → Cloud Run; no-ops safely without GCP secrets.
- **Observability**: each agent turn emits one-line JSON (`event/session_id/route/tool_calls/status/output_type/latency_ms`) that Cloud Logging parses into queryable fields.
- **Privacy**: no face identity recognition; body handling is template-based (no measurements); face profiles are consent-gated; raw Lucy `client_token` is redacted from ADK event text.

## 5. Deployment topology

```mermaid
flowchart LR
    GH["GitHub push/PR"] --> CI["GitHub Actions: check/test/build/smoke"]
    CI --> DEP["Deploy workflow"]
    DEP --> CR["Cloud Run: fashini (API + UI + agent + inventory)"]
    CR -. optional .-> CR2["Cloud Run: image_tryon (Python)"]
    CR -. optional .-> FS["Firestore"]
    CR --> CLOG["Cloud Logging (structured agent turns)"]
```
