# Deployment and DevOps Plan

Status: planning checklist.

This hackathon is evaluated as a DevOps x AI Agent project. The project should show a working service plus evidence of operation and improvement.

## 1. Deployment Target

Project target:

```text
Cloud Run
```

Competition rule:

```text
Use at least one Google Cloud application/runtime product.
```

Cloud Run is chosen for this project because it is simple to demo, supports containerized services, and fits the competition's Deliver concept.

## 2. Recommended Services

| Service | Purpose |
|---|---|
| `web` | Demo UI for mirror/screen/iPad flow |
| `agent-api` | Session, routing, Agent workflow, tool adapters |
| `inventory-service` | Product and stock API or mock |
| `tryon-service` | Image generation handoff or mock |
| `evaluation` | Golden test cases and log analysis |

For MVP, these can be collapsed into fewer services if time is short.

## 3. CI/CD Minimum

Required evidence:

- GitHub repository.
- Pull Request workflow.
- Automated check on PR or push.
- Deployment to Cloud Run.
- Logs visible for demo session.

Minimum GitHub Actions jobs:

```text
lint
test
build
deploy
```

If implementation is not ready, start with:

```text
markdown link check
schema validation
mock workflow test
```

## 4. Observability

Each Agent turn should log:

- `session_id`
- route
- node name
- tool name
- tool status
- recommendation round
- constraint delta summary
- latency
- warnings/errors

Demo evidence:

- screenshot or short clip of logs
- one failed/partial tool call handling path
- one before/after feedback refinement trace

## 5. Session Safety

Risk:

```text
Cloud Run instances can restart, so in-memory sessions are not enough.
```

MVP options:

- Firestore for session state.
- Cloud SQL for session state.
- External ADK-compatible persistence if available.

Rule:

- Do not rely on process memory for cross-turn session state in deployed demo.
- Verify that two sessions do not see each other's state.

## 6. Environment Variables

Expected examples:

```text
GOOGLE_CLOUD_PROJECT
GOOGLE_CLOUD_LOCATION
GEMINI_MODEL
SESSION_STORE
INVENTORY_SERVICE_URL
TRYON_SERVICE_URL
```

Do not commit secrets.

## 7. Pre-Submission Checklist

- [ ] GitHub repo public or made public according to submission timing.
- [ ] Main branch contains stable demo.
- [ ] Cloud Run service URL works from an external browser.
- [ ] ProtoPedia page exists.
- [ ] Demo video uploaded to YouTube or Vimeo.
- [ ] Architecture diagram uploaded.
- [ ] `findy_hackathon` tag added.
- [ ] Logs/trace available.
- [ ] README points to key docs.
- [ ] Privacy/consent branch described.
