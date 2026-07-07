# Fashini — Staff iPad UI kit

The **assisted-selling console** (staff takeover). Landscape iPad Pro 11" (1194×834),
denser than the customer screens. This is the recreation of `src/AgentRuntimePanel.tsx`
re-skinned in the white/cobalt system.

## Screens / regions
- **Top bar** — FASHINI wordmark + store, the `AgentState` badge row (agent status /
  route / round / lucy), language switch, and a **Staff takeover** button.
- **Left** — customer-need input + **Recommend / Re-run**; the three **RecommendationCard**
  set cards (materialize in); **FeedbackTags** + the re-recommendation loop.
- **Right** — **TryOnStage** (Lucy realtime preview) with the selected set's price;
  **AhaTimeline**; **ConstraintDelta** (after feedback); **ToolCallTrace** (streaming
  evidence); and the purchase / in-store **pickup route** on handoff.

## Interaction (fake, demo)
1. Enter a customer need → **Recommend** → route classifies, tools stream, 3 sets appear.
2. Tap a set → **Preview** plays the scan-line try-on reveal.
3. Tap a **feedback** tag (e.g. Fit) → constraint delta updates, round → 2, re-recommends.
4. **Confirm** → status → confirmed → handoff_ready; the pickup route materializes.

## Data binding
Everything maps to real models in `src/api.ts`: `AgentState.status/route/recommendation_round`,
`RecommendationSet` (rec_type, round, reason, products), `Product.price_yen`,
`ToolCallRecord`, `AgentConstraints`, `AhaDemoState`, `TryonHandoffPayload`.

## Files
- `index.html` — scaled stage, styles, mounts `StaffConsole`.
- `Console.jsx` — the console + fake agent progression. Composes DS components.
