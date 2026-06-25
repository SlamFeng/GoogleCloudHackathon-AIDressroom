# Agent API Prototype

Status: local/mock API for `feature/agent-foundation`.

This API exposes the Agent foundation workflow to frontend and integration teammates while inventory and try-on services are still mocked.

## Boundary

This API does:

- create in-memory sessions
- route customer text
- call mock recommendation tools
- accept feedback
- update constraints
- call mock refine recommendation
- branch by face consent
- call mock try-on handoff

This API does not:

- persist sessions across process restart
- connect to real inventory
- connect to real image generation
- create database migrations

## Run

```bash
python3 scripts/run_api.py
```

OpenAPI docs:

```text
http://127.0.0.1:8000/docs
```

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Service health |
| POST | `/session/start` | Create a session |
| POST | `/chat` | Send customer text |
| POST | `/feedback` | Send feedback |
| POST | `/confirm` | Confirm outfit and hand off try-on |
| GET | `/sessions/{session_id}` | Inspect session state |
| GET | `/tool-calls` | Inspect mock tool calls |

## Example Flow

Start session:

```bash
curl -s -X POST http://127.0.0.1:8000/session/start \
  -H 'Content-Type: application/json' \
  -d '{
    "session_id": "s_api_demo",
    "scene_type": "mirror",
    "store_id": "store_001",
    "analysis": {
      "matched_body_template_id": "body_template_03",
      "current_style": ["casual", "minimal"],
      "confidence": 0.82
    }
  }'
```

Chat:

```bash
curl -s -X POST http://127.0.0.1:8000/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "session_id": "s_api_demo",
    "text": "没想法，你推荐一套适合我的"
  }'
```

Feedback:

```bash
curl -s -X POST http://127.0.0.1:8000/feedback \
  -H 'Content-Type: application/json' \
  -d '{
    "session_id": "s_api_demo",
    "set_id": "set_1_1_initial",
    "feedback_type": "partial_adjust",
    "source": "quick_tag",
    "dimension": "color",
    "dimension_value": "red",
    "raw_voice_text": "颜色太亮了"
  }'
```

Confirm:

```bash
curl -s -X POST http://127.0.0.1:8000/confirm \
  -H 'Content-Type: application/json' \
  -d '{
    "session_id": "s_api_demo",
    "set_id": "set_2_1_refined",
    "consent_given": false
  }'
```

Inspect tool calls:

```bash
curl -s http://127.0.0.1:8000/tool-calls
```

## Frontend Notes

- `output.type = recommendations` means render recommendation cards.
- `output.type = recommendations_refined` means replace cards and show constraint-change note.
- `output.type = clarification` means ask one low-friction question.
- `output.type = tryon_handoff` means show generation pending/result state.

## Review Notes

If `TEAM_CONTRACTS.md` changes, update:

- request models in `agent_foundation/api.py`
- DTOs in `agent_foundation/contracts.py`
- examples in this file
