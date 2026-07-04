# Demo Script

Status: minimum demo path for hackathon judging.

Goal: prove that the project is an Agent-centered inventory + sales workflow, not just an image generation demo.

## 1. Demo Claim

```text
The Agent turns customer intent and feedback into inventory-aware outfit decisions.
```

## 2. Minimum Story

Customer:

```text
I do not have a clear idea. Please recommend something that fits me.
```

System:

1. Ingests body/style analysis.
2. Routes to `recommendation`.
3. Calls `get_recommendations`.
4. Shows three sets:
   - similar
   - style-led
   - seasonal/hot
5. Customer clicks "color dislike" or says "颜色太亮了".
6. Agent parses feedback.
7. Agent updates constraints:
   - add disliked color to `avoid`
8. Agent calls `refine_recommendations`.
9. Customer confirms one set.
10. Agent branches by face consent.
11. Agent hands off to try-on generation.

## 3. Required On-Screen Evidence

Show these somewhere in demo UI, logs, or overlay:

| Evidence | Example |
|---|---|
| Route | `route = recommendation` |
| Tool call | `get_recommendations` |
| Feedback parsed | `dimension = color` |
| Constraint delta | `avoid += red` |
| Refine call | `refine_recommendations` |
| Consent branch | `face_mode = default_face` or `real_face` |
| Handoff | `handoff_tryon_generation` |

## 4. Backup Demo Path

If image generation is slow:

- Show `generation_status = pending`.
- Show the tool handoff payload.
- Display a placeholder try-on image or mock result.

If recommendation API is not ready:

- Use mock recommendation data.
- Still show the Agent route, feedback parse, constraint update, and refine call.

If STT is unstable:

- Use text input with one STT-recorded clip as proof of capability.

## 5. Demo Data Seed

Minimum product count:

```text
30-50 products
```

Required categories:

- outerwear
- top
- bottom
- dress
- shoes
- accessory

Required tags:

- minimal
- casual
- street
- office
- seasonal

Required edge products:

- at least one out-of-stock product
- at least one over-budget product
- at least two alternatives for each visible category

## 6. Narration Outline

1. The customer does not know what to choose.
2. The Agent uses the current outfit/body template and inventory.
3. The Agent proposes three different strategies.
4. The customer rejects one dimension.
5. The Agent does not randomly regenerate; it updates constraints.
6. The Agent recalls inventory-aware alternatives.
7. The customer confirms.
8. The Agent respects face consent before try-on generation.

## 7. Acceptance Criteria

| Area | Must Show |
|---|---|
| Agent | route, tool call, feedback parse, constraint update |
| Inventory | recommended items are in stock |
| Feedback loop | second recommendation differs because of feedback |
| Consent | real/default face branch is explicit |
| DevOps | deployed URL and log/trace screenshot |
| Submission | GitHub URL, deployed URL, ProtoPedia URL |
