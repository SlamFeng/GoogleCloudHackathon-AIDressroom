# Fashini — Entrance screen UI kit

The **entrance big screen**: a landscape attract-mode display (1920×1080), glanceable from
distance. This is the ATTRACT / CLIMAX layer — same white system as the operate screens, but
full-bleed with longer choreographed motion.

## Layout
- **Top** — FASHINI wordmark + store / floor label.
- **Left** — kinetic masked line-by-line headline ("Step up. See the next look that fits."),
  a glanceable lede, and rotating capability tokens.
- **Right** — a large **TryOnStage** that loops the signature reveal (scan-line sweep →
  outfit fills in → fabric shimmer → "スタイリング完了 / Styled." label).
- **Bottom** — the recommended look's products with prices and a big **count-up set total**
  (`PriceTag size="xl" countUp`), timed to the reveal.

## Motion
The reveal + count-up loop on a ~6.5s cycle so the screen reads as continuously working.
Honors `prefers-reduced-motion` (shows final state).

## Data binding
`RecommendationSet.rec_type` / `round`, `Product.name` + `price_yen`, and the try-on reveal
that fronts `TryonHandoffPayload`.

## Files
- `index.html` — landscape scaled stage + styles; mounts `EntranceAttract`.
- `Attract.jsx` — the attract loop. Composes DS components.
