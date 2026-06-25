# Agent Foundation Prototype

Status: v0.1 prototype, stacked on `feature/schema-contracts`.

This prototype implements the first local Agent foundation loop without real inventory or image APIs.

## What It Contains

| File | Purpose |
|---|---|
| `agent_foundation/contracts.py` | Standard-library dataclass versions of shared DTOs |
| `agent_foundation/state.py` | Session-centered Agent state |
| `agent_foundation/parsers.py` | Rule-based route, need, and feedback parsing |
| `agent_foundation/mock_tools.py` | Mock recommendation, feedback, face, and try-on tools |
| `agent_foundation/workflow.py` | End-to-end Agent workflow loop |
| `scripts/run_demo.py` | Local demo runner |
| `tests/test_agent_foundation.py` | Golden tests |

## Run Demo

```bash
python3 scripts/run_demo.py
```

Custom customer input:

```bash
python3 scripts/run_demo.py "我想要黑色外套，预算一万以内"
```

## Run Tests

```bash
python3 -m unittest discover -s tests -v
```

## Current Demo Loop

```text
start session
  -> route customer input
  -> parse need
  -> call get_recommendations mock
  -> parse feedback
  -> record feedback
  -> update constraints
  -> call refine_recommendations mock
  -> confirm outfit
  -> select default face if no consent
  -> handoff try-on generation mock
```

## Intentional Constraints

- No ADK runtime dependency yet.
- No Pydantic dependency yet.
- No real inventory API.
- No real image generation API.
- No database migration.

The point of v0.1 is to stabilize the workflow shape and contract adapters before external services are ready.

## Next Implementation Steps

1. Wrap mock tools behind ADK-compatible tool functions.
2. Add FastAPI endpoint or minimal web adapter.
3. Replace rule-based parsers with Gemini/structured-output parser behind the same interfaces.
4. Persist `AgentState` outside process memory before Cloud Run demo.
5. Swap mock recommendation/try-on tools for teammate APIs when contracts are reviewed.
