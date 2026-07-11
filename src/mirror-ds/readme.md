# Fashini Mirror — Design System

A design system for the **redesigned Fashini magic-mirror experience**: an AI in-store styling agent that lives on a fitting-room "magic mirror." A customer stands in front of a **full-bleed live camera reflection of themselves**; the agent listens by voice, speaks back, shows three AI-styled outfits pulled from real store inventory as **glass panels floating on the mirror**, lets the customer pick hands-free (raise 1/2/3 fingers) or by touch, and reveals a realtime "see yourself wearing it" try-on.

This system translates Fashini's white, COS / Uniqlo-grade minimal restraint onto a **dark, glass-over-live-reflection surface**, and treats **choreographed motion** as the heart of the product.

## Two hard principles (they govern every decision here)
1. **The live camera reflection is the hero at every stage.** All UI floats as translucent glass over the customer's own reflection. Every stage is laid out to reveal as MUCH of the reflection as possible — compact, bottom-anchored, auto-quieting panels; never a full-screen sheet (except the one try-on reveal). If a panel can be smaller, make it smaller.
2. **Hands-free first** (voice + finger gestures), with touch always working in parallel.

## Surface
Portrait kiosk (**3:4 / 9:16**). Dark, mirrored live-camera canvas. Frosted dark-glass panels, thin light hairlines, generous negative space, soft depth. **One cobalt accent (`#1B2BD8`) per view.** Ink + cobalt-biased cool-grey neutrals. **Archivo** (display / sans) + **IBM Plex Mono** (labels / ¥ prices). Signature easing `cubic-bezier(.16,1,.3,1)`. Every motion has a `prefers-reduced-motion` fallback. A persistent quiet "● camera on · nothing is saved" chip once the camera is live. Trilingual **EN / 中文 / 日本語**; the demo runs in Chinese, prices in ¥.

---

## Sources
Built by reading the attached Fashini codebase (read-only, mounted locally):
- `src/` — the React/TypeScript magic-mirror app. Key files studied: `App.tsx` (welcome / consent / profile flow + trilingual copy), `StylingScreen.tsx` (the mirror flow: voice, gestures, three looks, try-on, confirm), `GuidePet.tsx`, `gesture.ts` / `useGestureControl.ts` (finger-count + ✋/👍/✊ mapping), `useSpeech*`, `api.ts` / `types.ts` (data contracts, real copy lines).
- `src/design/` — the existing **white** design system (`tokens/`, `components/`, `screens/`). This project **inverts** that system onto the dark mirror surface while preserving its discipline (cobalt rationing, two-type-family rule, tight tracking, tabular ¥ prices, the `cubic-bezier(.16,1,.3,1)` motion).

**Fonts** — the system loads Archivo + IBM Plex Mono + Noto Sans SC/JP via the Google Fonts CDN for preview (mirrors the source repo). **Substitution flagged:** the original brief references a proprietary geometric grotesk; this system standardises on the openly-licensed **Archivo**. For production (the kiosk runs offline; CSP forbids CDN webfonts) **self-host the four families as woff2** and swap the `@import` in `tokens/fonts.css` for local `@font-face` rules. → *Ask the user for the licensed display face + font binaries.*

**Logo** — the source contains **no logo asset**. Per convention, the brand mark is **always set as type**: `FASHINI` in Archivo 800, `+0.06em` (utility class `.fashini-wordmark`). No mark was drawn or reconstructed.

**Imagery** — garment thumbnails and the try-on render come from a backend API at runtime; no image assets exist in the source. In the UI kit the live reflection is an honest **CSS stand-in** (a dim fitting-room scene with a suggested figure), and garment thumbnails fall back to **dominant-colour glass tiles**. → *Ask the user for catalog imagery + a sample try-on render to raise fidelity.*

---

## Content fundamentals
How Fashini writes copy (studied from the real trilingual strings in `App.tsx` / `StylingScreen.tsx`):

- **Voice:** calm, plain, second-person ("你"/"you"), quietly reassuring. The mirror talks like a considerate stylist, never a salesperson. Chinese demo lines are short and spoken-natural: e.g. *"给你搭好了三套，都是现货。选一套试穿吧。"*, *"我在听，请说～"*, *"已预留，给你送到试衣间。"*
- **Privacy is stated plainly and repeatedly**, never buried: *"摄像头开启 · 不会保存"*, *"画面不会被录制或保存"*. Trust copy leads, legalese never does.
- **Casing:** sentence case for body and headings. Micro-labels are UPPERCASE with wide tracking (`Step 01 · Privacy`, `Explicit need`). The wordmark is all-caps `FASHINI`.
- **Numbers & prices:** always mono, tabular, `¥` prefix, `ja-JP` grouping (`¥40,700`). Prices are the loudest data on screen.
- **Emoji:** used sparingly and only as *functional* glyphs for gestures (✋ 👍 ✊) and a soft trailing "～" tone marker in spoken Chinese lines — never decoratively in chrome.
- **Trilingual:** EN / 中文 / 日本語 are peers; the demo is Chinese. Keep strings short so all three fit the compact glass panels.
- **Tone in one line:** *elegant and quiet, but warm.* Fewer words, more reflection.

---

## Visual foundations
- **Colours:** an ink canvas (`--ink-900 #0a0a0c`) around/behind the reflection; text in three light tiers (`--on-dark` 100% / `--on-dark-2` 66% / `--on-dark-3` 42%); a single **cobalt** accent (`#1B2BD8`, lifting to `--accent-bright #3D52FF` on dark) rationed to ONE use per view (a primary action, an active state, or a focus ring). Neutrals are **cool / cobalt-biased**, never warm grey. Semantics (live red, failed) are kept **separate** from the accent. One **warm** tone (`--aura-warm #FF7A66`) exists *only* inside the voice aura's gradient.
- **Glass:** the signature surface. Panels are **frosted dark glass** — a low-alpha ink fill (`50–68%`), heavy `backdrop-filter: blur(26–40px) saturate(1.35)`, one **bright top hairline** (light catching the edge), a light hairline elsewhere, and a soft downward shadow. Three depths: `sheet` (bottom content), `card` (the one focused panel), `pill` (chips/controls), plus an `inset` well. Falls back to a near-solid fill where `backdrop-filter` is unsupported or reduced-transparency is set.
- **Type:** Archivo (display/sans) + IBM Plex Mono (labels/¥). Tight display tracking (`-0.02 … -0.03em`); uppercase micro-labels at `0.14em`. Kiosk type is glanceable at arm's length but panels stay compact so the reflection dominates.
- **Backgrounds:** never a decorative gradient on chrome. The only "image" is the live reflection; the only gradients are legibility **scrims** (top for controls, bottom for sheets) and the diffuse **voice aura**.
- **Radii:** a soft four-step family — `sheet 26` · `card 20` · `control 12` · `pill 999`. Panels read like pebbles floating on the mirror.
- **Shadow / depth:** soft, downward, never harsh — glass lifts off the reflection with `-18…-24px` blurred shadows; primary buttons carry a faint cobalt glow.
- **Borders:** 1px light hairlines (`--on-dark-line`, 14% white) instead of heavy strokes; the bright top edge is the only "highlight".
- **Layout:** bottom-anchored, compact, auto-quieting panels; top controls as tiny glass pills; the reflection is always the largest thing on screen. Fixed portrait frame, `container-type` so type scales to the frame width.
- **Motion:** one signature easing `cubic-bezier(.16,1,.3,1)`; durations `fast .18 / base .4 / slow .6 / choreo .9`; 80ms stagger. Fewer, more intentional animations. Sheets **rise**; looks **materialise** (blur→sharp); the try-on **blooms** to full-bleed. Every piece has a reduced-motion fallback that shows the final state.
- **Hover / press:** hover lifts border to a brighter hairline or nudges up 1–2px; press scales to `0.975`. No colour-flip theatrics.
- **Imagery vibe:** cool, dim, filmic — a low-lit fitting room. Garment tiles are muted; the accent is the only vivid colour.

See the **motion spec**: [`guidelines/motion-spec.md`](guidelines/motion-spec.md).

---

## Iconography
- The mirror UI uses a **crafted SVG icon set** (`components/core/Icon.jsx`) — clean 24×24, 2px-stroke, round-cap glyphs on `currentColor`, matching the system's hairline weight. **No emoji** anywhere in the UI. Names: `arrow-left` `arrow-right` `camera` `hand` `thumbs-up` `fist` `expand` `volume` `volume-x` `mic` `check` `ruler` `scale` `user` `calendar`.
- The hands-free gesture glyphs are part of the set — `hand` (✋ talk) · `thumbs-up` (👍 confirm) · `fist` (✊ back) — so `GestureHint` teaches gestures with the same crafted marks the controls use.
- **No icon font or SVG icon set existed in the source** — this set was authored for the redesign (an intentional addition). If the product later wants a larger library, Lucide (2px, rounded) is the closest match and can extend this set. → *Flagged: confirm whether to standardise on Lucide for icons beyond this set.*

---

## Components
Reusable primitives (React, styling via the CSS custom properties). Grouped by concern under `components/`. Mount from the compiled bundle: `const { Button } = window.FashiniMirrorDesignSystem_c521b8`.

**Core** (`components/core/`) — `GlassPanel` · `Button` · `Icon` · `MicroLabel` · `PriceTag` · `Hairline`
**Forms** (`components/forms/`) — `SegmentedControl` · `Stepper` · `LanguageSwitch` · `ConsentCheck` · `FeedbackTags`
**Chrome** (`components/chrome/`) — `ControlPill` · `CameraChip` · `ToolStep`
**Looks** (`components/looks/`) — `LookStrip`
**Signature motion** (`components/motion/`) — `VoiceAura` · `GestureHint` · `LiveTranscript` · `TryOnReveal`
**Guide pet** (`components/pet/`) — `GuidePet`

Each component directory carries `<Name>.jsx` + `<Name>.d.ts` + `<Name>.prompt.md` and a `@dsCard` thumbnail HTML.

### Intentional additions (beyond a literal port of the source inventory)
The source's component set was authored for the **white operate / staff-console** surfaces. The dark-mirror redesign needs glass-native and motion-native pieces the source never had; these are added deliberately:
- `GlassPanel` — the frosted-glass surface every panel sits on (the whole redesign depends on it).
- `ControlPill` / `CameraChip` — the tiny top controls + the persistent live/privacy chip.
- `Stepper` — replaces the source `NumberField` for hands-easy profile entry at arm's length.
- `VoiceAura` / `GestureHint` / `LiveTranscript` / `TryOnReveal` — the four **signature motion pieces** (the heart of the brief).
- `LookStrip` — the compact three-looks strip (a slimmer, mirror-native reworking of the source `RecommendationCard`).
- `GuidePet` — reworked from the source cat-emoji pet into a premium geometric companion.

Source primitives intentionally **not** ported (they belong to the white staff-console / ADK-trace surfaces, out of scope for the mirror redesign): `ToolCallTrace`, `ConstraintDelta`, `AhaTimeline`, `StatusBadge`, `ToolStatusChip`, `ProductRow`, `RecTypeLabel`, `RecommendationCard`, `TryOnStage` (white version), `Checkbox` (→ `ConsentCheck`), `NumberField` (→ `Stepper`).

---

## UI kit
**`ui_kits/mirror/`** — the full magic-mirror experience, a screen for **every stage (0–9)**, as one interactive portrait-kiosk prototype with a stage rail:
`0 Attract · 1 Consent · 2 Profile · 3 Mirror·Idle · 4 Listening · 5 Working · 6 Three looks · 7 Try-on · 8 Confirm · 9 Complete`
Open `ui_kits/mirror/index.html`. Files: `index.html`, `reflection.jsx` (reflection stand-in + kiosk frame), `screens.jsx` (stages 0–5 + shared chrome), `app.jsx` (stages 6–9 + the interactive app).

---

## Foundations (Design System tab)
Specimen cards live in `guidelines/`, grouped **Colors · Glass · Type · Spacing · Motion · Brand**. Each links `styles.css` and renders the real tokens over a reflection stand-in.

---

## Root manifest
- `styles.css` — the single entry point consumers link (an `@import` manifest only).
- `tokens/` — `fonts.css` · `colors.css` · `typography.css` · `spacing.css` · `motion.css` · `glass.css` · `base.css` (reset + all signature keyframes).
- `components/` — reusable primitives (see above).
- `ui_kits/mirror/` — the full-flow prototype.
- `guidelines/` — foundation specimen cards + `motion-spec.md`.
- `SKILL.md` — Agent-Skill entry point.
- `readme.md` — this file.
