---
name: fashini-design
description: Use this skill to generate well-branded interfaces and assets for Fashini — the AI in-store styling agent (fitting-room mirror, entrance big screen, staff iPad) — either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping. Pure-white minimal, cobalt accent, trilingual EN/中文/日本語, prices in ¥.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and
create static HTML files for the user to view. If working on production code, you can copy
assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or
design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_
production code, depending on the need.

## Fast orientation
- **Design language:** pure-white canvas, Uniqlo/COS-grade restraint. No dark backgrounds,
  gradients, textures, or decorative graphics. All spectacle lives in choreographed motion.
- **Tokens:** `styles.css` (import list) → `tokens/*.css`. Colors, type, spacing, motion, base.
- **Accent (cobalt `#1B2BD8`) is rationed** — rec-type label, primary button, active/selected,
  focus ring, links, "held" status. Everything else is black/white/grey. `ok` is neutral grey,
  not green.
- **Type:** one neo-grotesque (Archivo, substituting for Helvetica Neue) for headings + body;
  IBM Plex Mono w/ tabular-nums for all data/prices/timestamps; Noto Sans SC for Chinese.
  See the font-substitution flag in `readme.md`.
- **Two radii only:** 12px cards, 8px controls. Hairline borders, not shadows. Shadow only on
  hover-lift. Motion easing `cubic-bezier(.16,1,.3,1)`, 0.4–0.9s; honor prefers-reduced-motion.

## Components
React primitives under `components/` (core, status, forms, agent, tryon). Load the compiled
bundle and read from `window.<Namespace>` — run the design-system validator for the exact
namespace, or copy the pattern from any `*.card.html`. Each component has a `.prompt.md` with a
usage example. Bind card fields to the real models: `RecommendationSet`, `Product.price_yen`,
`AgentState`, `ToolCallRecord`, `AgentConstraints`, `TryonHandoffPayload`.

## UI kits (full screens)
`ui_kits/mirror/` (portrait self-service capture flow), `ui_kits/entrance_screen/` (landscape
attract + try-on climax), `ui_kits/staff_ipad/` (assisted-selling console). Each has a README,
`index.html`, and screen JSX.

## Must keep visible (demo evidence + privacy)
Route classification, tool-call log, constraint delta after feedback, and try-on handoff must
be surfaced in the UI. No face-recognition UI; face use is consent-gated; body handling is
template-based and **measurements are never shown** — keep the "Measurements not retained" panel.
