# Demo Script

Status: minimum demo path for hackathon judging.

Goal: prove that the project is an Agent-centered inventory + sales workflow, not just an image generation demo.

## 0. Pre-flight checklist (before you present)

Hardware

- [ ] **Wide camera.** A laptop webcam cannot fit a full body at desk distance. Use an **iPhone as webcam (Continuity Camera)** or an external wide-angle USB cam, mounted above a large / portrait screen, and stand ~2–3 m back. Tap **⤢ Fit view** to show the whole camera frame.
- [ ] Screen mirrored to a TV / large display is fine.

Browser & permissions

- [ ] Use **Chrome or Edge** — best SpeechRecognition (STT) + gesture support. Safari STT is flaky.
- [ ] Allow **camera** and **microphone** when prompted (mirror, voice, and gestures need them).
- [ ] Serve over **https or localhost** — `getUserMedia` requires a secure context.

Env / services (all degrade gracefully — nothing here dead-ends the demo)

- [ ] `GEMINI_API_KEY` set → live OOTD analysis, LLM stylist, background try-on render. Without it everything falls back to deterministic mocks.
- [ ] `DECART_API_KEY` set → real Lucy realtime try-on. Without it the try-on shows the 15s placeholder window over the live mirror.
- [ ] `npm run setup:assets` has fetched the MediaPipe pose + gesture models.

## 0b. Magic-mirror walkthrough (customer touchpoint)

Hands-free where possible; touch is always available in parallel.

1. **Step in** → the mirror shows your live reflection (`● Camera on · nothing is saved`).
2. **Say the need** — tap 🎤 and speak ("something for a date"), tap a preset (Date / Work / Party / Casual / Vacation), or type. The agent replies out loud (fast on-device TTS).
3. **Three looks** appear as glass cards over the reflection — each grounded in real in-stock inventory, composed by the LLM stylist.
4. **Pick one** — hands-free: turn on **✋ Gestures**, then hold up **1 / 2 / 3 fingers** for that look (~0.7s). Or just tap.
5. **Try-on** goes full-screen with a 15s progress bar; the "you wearing it" image renders in the background and reveals when ready, then the layer drops back to the mirror. (With a Decart key this is Lucy realtime instead.)
6. **Confirm** — 👍 (or tap **Choose this**) → reserve; the agent voices "Reserved…".

Touch, voice, and gestures are interchangeable at every step; if one fails, the others still work.

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
