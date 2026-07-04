# Competition Rules Audit

Source being audited:

```text
/Users/kenn/Downloads/Findy_DevOps_AI_Agent_Hackathon_要点.md
```

This document is the team-facing audit for the Findy DevOps x AI Agent Hackathon. It separates confirmed rules, interpretation, and project-specific risks.

Primary references:

- Official Notion page: <https://findy.notion.site/DevOps-AI-Agent-Hackathon-32a04bf5e7e4806786f2c871e8b6cb00>
- ProtoPedia: <https://protopedia.net/>
- Google Cloud Japan blog: <https://cloud.google.com/blog/ja/products/ai-machine-learning/devops-ai-agent-hackathon-2026?hl=ja>

## 1. Confirmed Competition Facts

| Item | Confirmed Point |
|---|---|
| Event | DevOps x AI Agent Hackathon hosted by Findy |
| Main sponsor | Google Cloud Japan |
| Tool sponsor | Elasticsearch |
| Submission deadline | 2026-07-10 23:59 JST |
| Final pitch | 2026-08-19 at Google Shibuya office |
| Required submission | Public GitHub repository URL, deployed project URL, ProtoPedia URL |
| Required platform category | At least one Google Cloud application/runtime product |
| Required AI category | At least one Google Cloud AI technology |
| Required story material | Problem/background, target users, product features |
| Required media | Demo video and system architecture diagram on ProtoPedia |

## 2. Confirmed Core Concepts

| Concept | Practical Meaning for This Team |
|---|---|
| Build / つくる | Make an original useful AI Agent, not only a UI prototype |
| Operate / まわす | Show GitHub collaboration, CI/CD, logs, and improvement loop |
| Deliver / とどける | Deploy a usable service, preferably on Cloud Run for this project |

## 3. Critical Interpretation Corrections

The rules summary is broadly accurate. These points should be phrased carefully in public docs:

| Original Claim | Safer Wording |
|---|---|
| AI Agent criterion has the highest weight | It is the highest-risk criterion and likely to be scrutinized, but official weighting is not stated |
| Cloud Run is a hard requirement | A deployed URL and at least one Google Cloud runtime product are required; this project chooses Cloud Run as its own hard target |
| Public GitHub is always allowed | Final submission requires a public GitHub URL, but development/publication timing should follow official submission instructions |
| Judges have "Agent necessity obsession" | Public wording should say judges are likely to examine whether the Agent is central and necessary |

## 4. Project Fit Assessment

The project fits the competition if the demo proves the Agent is the value center.

Strong fit:

- Inventory-aware tool use.
- Customer intent routing.
- Structured feedback loop.
- Constraint update and refined recall.
- Cloud Run deployment.
- GitHub/CI/CD/trace evidence.
- Privacy-aware design around images, body templates, and face consent.

Weak fit if not addressed:

- A linear "photo -> recommend -> generate image" flow can look like a pipeline, not an Agent.
- A pure try-on visual demo can weaken the sales/inventory Agent story.
- If recommendation does not react to feedback dimensions, the Agent claim becomes thin.
- If deployment/logging is postponed, the project may miss the DevOps part of the theme.

## 5. Judging Strategy for This Project

The main judging argument:

```text
Without the Agent, the product collapses into a static recommendation or try-on demo.
With the Agent, customer feedback becomes structured constraints that drive inventory-aware replanning.
```

Evidence to show:

| Evidence | Why It Matters |
|---|---|
| Route classification | Shows autonomous intent handling |
| Tool call log | Shows the Agent executes tasks, not only chats |
| Constraint delta | Shows feedback changes future behavior |
| Retry/refine loop | Shows planning beyond one-shot generation |
| Inventory availability in response | Shows retail practicality |
| Consent branch | Shows real operation considerations |
| Cloud Run URL | Satisfies delivery expectation |
| CI/CD/log trace | Satisfies operate expectation |

## 6. Recommended Public Story

Avoid overclaiming "AI try-on." Use this frame:

```text
A sales Agent for clothing stores that turns customer intent and feedback into inventory-aware outfit decisions.
```

Differentiators:

- Store inventory is part of the decision, not an afterthought.
- Feedback is captured as structured constraints.
- The same Agent foundation supports mirror, storefront, and staff iPad flows.
- Try-on generation is the final handoff, not the whole product.

## 7. Project Risks and Responses

| Risk | Response |
|---|---|
| Looks like a recommender | Display Agent state, tool calls, and constraint updates |
| Looks like a try-on image generator | Keep sales/inventory flow in the center of the demo |
| Weak DevOps story | Add GitHub Actions, Cloud Run deployment, logs, and a failure-improvement note |
| Privacy concern | Body template only, consent branch for real face, expiry for raw images |
| Too broad for hackathon | Keep MVP loop narrow and use mocks first |

## 8. Submission Asset Checklist

- Public GitHub repository URL.
- Deployed project URL.
- ProtoPedia URL.
- Demo video.
- Architecture diagram.
- `findy_hackathon` tag.
- Problem/background story.
- Target users.
- Product features.
- Development tools list.
- Optional five introduction images.
