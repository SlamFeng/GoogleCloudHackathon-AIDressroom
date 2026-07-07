# Fashini — Mirror UI kit

The **fitting-room mirror**: a vertical/portrait self-service screen (1080×1920) with
big touch targets. Recreation of the capture flow in `src/App.tsx`, re-skinned in the
white/cobalt system.

## Screens (steppable)
`welcome → consent → profile → capture → analyzing → review → complete`

- **welcome** — kinetic masked line-by-line headline; big Start button; trust row.
- **consent** — Step 01 privacy gate: three cards + two consent `Checkbox`es (Continue is
  disabled until both are checked).
- **profile** — Step 02: height / weight `NumberField`s + gender & age `SegmentedControl`
  (large touch).
- **capture** — Step 03: pose guide frame that turns cobalt when ready, auto-countdown,
  manual-shutter fallback.
- **analyzing** — scan-line `TryOnStage` reading OOTD signals; privacy note.
- **review** — Step 04: full-look reveal + OOTD breakdown + the **"Measurements not
  retained"** privacy panel.
- **complete** — handoff-ready confirmation with body/outfit contract versions.

## Data binding
`ManualProfile` (height/weight/gender/age), `AppStep` flow order, `BodyProfile` /
`OutfitProfile` review fields, schema versions on the handoff. Copy mirrors the trilingual
dictionary in `src/App.tsx` (English shown; EN/中文/日本語 switch in the top bar).

## Files
- `index.html` — portrait scaled stage + styles; mounts `MirrorFlow`.
- `Flow.jsx` — the 7-step flow. Composes DS components.
