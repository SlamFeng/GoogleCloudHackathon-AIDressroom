# Fashini — Design System

> **Fashini** is an AI styling *agent* for clothing stores. It behaves like a sales
> consultant, not a static recommender: it reads the customer's current outfit and body,
> understands intent by voice or tap, checks **live in-store inventory**, proposes **three
> in-stock outfit sets**, reacts to structured feedback by updating constraints and
> re-recommending, previews looks with **realtime virtual try-on**, and hands off to
> try-on image generation. Prices are in **JPY (¥)**. Trilingual: **English / 中文 / 日本語**.

Fashini is deployed across **three retail touchpoints**, one design language:

| Touchpoint | Form | Role |
|---|---|---|
| **mirror** | vertical / portrait screen | self-service, big touch targets |
| **entrance_screen** | landscape big screen | attract mode, glanceable from distance |
| **staff_ipad** | tablet, touch | assisted selling, denser info, staff takeover |

---

## Design direction

Pure-white minimal — **Uniqlo / COS-grade restraint**. Premium through *precision, not
ornament*. All spectacle lives in **lavish, choreographed motion** on a calm white canvas.
No dark backgrounds, no gradients, no textures, no decorative graphics. One unified system
across all three screens, expressed in two layers:

- **OPERATE** (staff iPad, recommendation cards, tool-call trace, forms, inventory, review):
  calm, dense, quiet.
- **ATTRACT / CLIMAX** (entrance-screen hero, try-on reveal): same white system, full-bleed,
  longer choreographed motion. Still white — never dark.

---

## Sources

Everything here derives from a mounted read-only codebase (the Fashini web client), plus the
written art-direction brief. No Figma file or slide deck was provided.

- **Codebase:** `src/` (React + TypeScript, Vite). Key files:
  - `src/types.ts` — capture-flow data models (`ManualProfile`, `BodyProfile`, `OutfitProfile`,
    `OutfitItem`, `AnalysisHandoff`, `AppStep`).
  - `src/api.ts` — agent/runtime models (`AgentState`, `RecommendationSet`, `Product` with
    `price_yen`, `OutfitPayload.slots`, `ToolCallRecord`, `TryonHandoffPayload`,
    `AgentConstraints`, `Route`, `SceneType`, `RecommendationType`, `FeedbackDimension`).
  - `src/App.tsx` — the full capture flow (welcome → consent → profile → capture → analyzing →
    review → complete) and the trilingual copy dictionary (EN / 中文 / 日本語).
  - `src/AgentRuntimePanel.tsx` — the sales-agent console: status badges, aha timeline,
    recommendation cards, tool-call trace inspector, realtime try-on stage (Lucy), feedback
    quick-tags, confirm/handoff.

> **Naming note.** The source app is labelled *StyleAI* in code; the brief names the company
> **Fashini**. This system uses **Fashini** throughout. The code's own visuals (cream paper,
> Playfair serif, forest-green + lime accent) are the *previous* direction and are **not**
> carried over — this system replaces them with the white/cobalt language above. Only the
> **data models, screen flow, and copy** were lifted from code.

---

## Content fundamentals

**Voice — a calm, precise store consultant.** Fashini speaks to the customer as *you*, warmly
but economically. It never oversells and never hides what it's doing; it explains its
reasoning in one plain sentence. Copy is bilingual-native: each string exists in EN / 中文 / 日本語
(see the `translations` dictionary in `App.tsx`), not machine-translated afterthoughts.

- **Casing.** Sentence case for all headings and body ("Today's OOTD breakdown", not Title
  Case). **UPPERCASE only** for micro-labels and step markers, with wide tracking:
  `STEP 01 · PRIVACY`, `HANDOFF READY`, `AI STYLE ADVISOR`, `AHA DEMO`.
- **Numbered steps.** Flow stages are numbered `01`–`04` with a middot separator and a scope
  word: `STEP 03 · CAPTURE`.
- **Privacy is spoken plainly and repeatedly.** "Photos deleted after this session",
  "No face identity recognition", "Measurements not retained". Never buried.
- **Honesty about the machine.** Results are framed as *approximate*: "understand results may
  be approximate", "OOTD analysis usually takes 1-2 minutes". The tool-call trace, route
  classification, and constraint deltas are shown, not hidden.
- **Retail / technical lockups.** Small katakana + latin pairings are welcome ("スタイリング完了 /
  Styled."). Data terms stay in code voice: `rec_type`, `handoff`, `set_id`, `Round 2`.
- **No emoji.** The one glyph in the source is a `✓` checkmark for consent/success — used as a
  restrained UI mark, never as decoration or a section marker.
- **Prices** are pushed forward, big and bold, always monospaced with the ¥ symbol and a
  thousands separator: `¥12,900`.

Examples (verbatim from source):
- Welcome lede: "Step in front of the camera. Fashini reads your outfit signals and body
  proportions, then helps the store stylist match better options from real inventory."
- Consent: "Clear consent before the camera opens." / "先说清楚，再打开镜头。" / "カメラを開く前に、同意内容を確認します。"
- Review note: "Measurements not retained." — a standing privacy promise, its own panel.

---

## Visual foundations

**Color.** Pure white everywhere (`--bg`, `--surface` `#FFFFFF`). Structure comes from a single
inset fill (`--inset #F5F5F5`) and crisp hairlines (`--hairline #E6E6E6`). Text is a three-step
grey ramp: `--ink #111111`, `--muted #767676`, `--faint #B6B6B6`. The **cobalt accent
`#1B2BD8`** (soft tint `#E9EBFB`) is *rationed* — it appears only on: the rec-type label, the
primary button, the active/selected state, the focus ring, links, and the "held" status.
Semantics are deliberately **separate from accent**: success/ok is a quiet neutral grey (not
green), failed is `#C0182B`, held/active reuses the cobalt. If you swap the accent, change only
`--accent` / `--accent-soft`.

**Type.** One neo-grotesque does headings *and* body (Archivo, substituting for Helvetica Neue —
see Iconography/fonts note). Headings are large, confident, tightly tracked (`-0.02` to
`-0.03em`); no serif anywhere. Chinese falls back to Noto Sans SC. All data — prices,
timestamps, JSON, SKUs, counts — is **monospace (IBM Plex Mono) with tabular-nums**. Micro-labels
are uppercase at `0.12–0.18em` tracking. Prices are the loudest type on the screen.

**Shape & spacing.** Exactly **two radii**: `12px` on cards, `8px` on buttons/chips/inputs —
nothing rounder (chips/status pills may go full-round). Everything else is squared with hairline
rules. Strict 4px-based spacing grid, generous whitespace, editorial-retail rhythm.

**Backgrounds.** Always flat white. No imagery behind content, no full-bleed photos as texture,
no gradients, no patterns, no grain. Product/try-on imagery sits *inside* framed stages on the
white canvas, never bleeds behind text.

**Shadows.** Almost none. Cards are defined by hairline borders, not elevation. A single soft
shadow (`--shadow-lift`) appears **only on hover-lift**; a slightly deeper one for a raised/active
stage.

**Borders.** 1px hairlines (`#E6E6E6`) do the structural work. The active/selected state swaps a
hairline for a cobalt border (and/or a soft cobalt fill), never a heavy shadow.

**Motion — the wow.** Easing is `cubic-bezier(.16,1,.3,1)`, durations `0.4–0.9s`. Signature
choreographed moments: (1) tool-call trace **streams in row-by-row, staggered**; (2) try-on
reveal — a thin accent **scan-line sweeps the figure top→bottom**, the outfit fills in behind it,
a soft **fabric shimmer** passes, and a "スタイリング完了 / Styled." **label rises**; (3) recommendation
sets **materialize** (blur→sharp + translateY, staggered); (4) **price count-up**; (5) kinetic
**masked line-by-line** headline reveal; (6) smooth status transitions and row expand/collapse.
Everything honors `prefers-reduced-motion` by rendering the final state. Elsewhere, interactions
are light only: **hover-lift** on cards, **press-scale** on buttons, **underline-wipe** on links.
No decorative bounce.

**Hover / press states.** Hover = a 1–2px lift + soft shadow (cards), or a subtle ink-darken /
inset-fill (buttons, rows). Press = a small scale-down (`0.97–0.98`). Links = underline wipe in on
hover. Disabled = `opacity: 0.4`, no pointer.

**Transparency & blur.** Used sparingly and only functionally — e.g. a translucent white sticky
top-bar with backdrop-blur so content scrolls cleanly beneath. Never as decoration.

**Imagery vibe.** Clean, neutral, catalogue-grade product shots on white; realtime try-on video
framed in a squared stage. No warm/cool filter, no grain, no B&W treatment — the white system
lets the garments carry the color.

---

## Iconography

The source ships **no icon assets, no logo, and no icon font** — only code. Following the
no-invented-mark rule, **Fashini has no logo mark**: the brand name is set in plain heavy
grotesk type (an uppercase `FASHINI` wordmark, tight tracking) wherever a mark would go, with the
`AI STYLE ADVISOR` micro-label beneath it. *No logo was drawn or reconstructed.*

- **Icon set (substituted, flagged):** [**Lucide**](https://lucide.dev) via CDN — a thin,
  1.5–2px consistent-stroke, squared-terminal open set that matches the engineered-minimal
  aesthetic. Loaded with `<script src="https://unpkg.com/lucide@latest">`. This is a substitution
  because the codebase defined none; swap for a licensed/self-hosted set (and drop the CDN) for
  the Cloud Run CSP in production.
- **Unicode marks used deliberately, not as icons:** `✓` (consent / success / complete),
  `→` (forward affordance on primary buttons), `·` (label separators), `+` / `−` (row
  expand/collapse in the tool-call trace).
- **Status is shown with typography + a small dot/chip, not glyphs** — `ok` grey, `held` cobalt,
  `failed` red. Route and round badges are text lockups, not iconized.
- **No emoji anywhere.** No colored/duotone icon cards.

**Font substitution flag.** Headings/body use **Archivo** (open) in place of Helvetica Neue
(proprietary); data uses **IBM Plex Mono**; Chinese uses **Noto Sans SC**. Preview loads these
from Google Fonts CDN. Production must self-host the binaries (Cloud Run CSP forbids CDN
webfonts) — see `tokens/fonts.css`. **Please provide the licensed Helvetica Neue / geometric
grotesk font files if you want the exact intended face.**

---

## Index / manifest

**Root**
- `styles.css` — global entry point (import list only). Consumers link this.
- `readme.md` — this file.
- `SKILL.md` — Agent-Skills-compatible usage guide.
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `base.css`
  (reset + signature-motion keyframes).

**Foundations** (Design System tab cards) — `guidelines/`
- Colors, type, spacing, motion, and brand specimen cards.

**Components** — `components/` *(see below; each has `.jsx` + `.d.ts` + `.prompt.md` + a card)*

**UI kits** — `ui_kits/`
- `mirror/` — vertical self-service capture + styling flow.
- `entrance_screen/` — landscape attract-mode hero + try-on climax.
- `staff_ipad/` — assisted-selling console with tool-call trace + staff takeover.

### Component inventory

Derived from the brief's component list, bound to the real data models. Namespace: run
`check_design_system` for the exact `window.<Namespace>`.

- **core/** — `Button`, `MicroLabel`, `PriceTag` (mono, count-up), `Hairline`
- **status/** — `StatusBadge` (agent status / route / round), `ToolStatusChip` (ok / held /
  failed), `PrivacyChip`
- **forms/** — `SegmentedControl`, `NumberField`, `Checkbox`, `LanguageSwitch`, `FeedbackTags`
- **agent/** — `RecommendationCard`, `ProductRow`, `ToolCallTrace`, `AhaTimeline`,
  `ConstraintDelta`
- **tryon/** — `TryOnStage` (scan-line reveal), `RecTypeLabel`

*Intentional additions* (not in a formal source library — the source is an app, not a component
kit — but required by the brief): all of the above. Each maps directly to a named data model or
a screen region in `src/`.
