# Clothing Store Inventory + Sales Agent

Hackathon project for the Findy DevOps x AI Agent Hackathon.

This project is an integrated clothing-store Agent that combines inventory-aware outfit recommendation with in-store sales assistance. The Agent is designed to run across three retail touchpoints:

| Touchpoint | Purpose |
|---|---|
| Fitting room mirror | Self-service recommendation and virtual try-on flow |
| Storefront screen | Traffic attraction and short-session recommendation |
| Staff iPad | One-to-one assisted selling and staff takeover |

The core product claim is that the system behaves like a sales consultant, not a static recommender. It should understand customer intent, call inventory/recommendation tools, react to structured feedback, refine constraints, and hand off confirmed outfits to the try-on generation module.

## Core Demo Loop

```text
customer input
  -> intent route
  -> recommendation tool call
  -> three outfit sets
  -> customer feedback
  -> constraint update
  -> refined recommendation
  -> outfit confirmation
  -> face consent branch
  -> try-on generation handoff
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

## Collaboration Rule

Interface-first development:

```text
Define contracts -> build mocks -> integrate Agent flow -> replace mocks with real services
```

Each team can choose its internal database or implementation details, but cross-team request/response payloads should follow the shared contracts in `docs/TEAM_CONTRACTS.md` and `docs/TOOL_SCHEMAS.md`.
