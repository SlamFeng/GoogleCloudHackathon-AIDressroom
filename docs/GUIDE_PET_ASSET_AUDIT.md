# Guide Pet Asset Audit

## Runtime path

- Active UI: `src/StylingScreen.tsx` derives `idle`, `listening`, `working`, `talking`, and `happy` from microphone, tool, speech, and expression state.
- Active renderer: `src/GuidePet.tsx` positions the pet, renders its message, and plays the selected sprite row.
- Project asset: `public/pets/mochi/spritesheet.webp` is an 8-column by 9-row atlas with 192x208 source cells.
- Codex custom-pet package: `~/.codex/pets/mochi/` keeps the standards-compliant atlas and `pet.json` together.

## State mapping

| Product mood | Atlas row | Frames | Visual meaning |
| --- | ---: | ---: | --- |
| `idle` | 0 | 6 | neutral blink and breathing |
| `listening` | 6 | 6 | patient listening loop |
| `working` | 8 | 6 | focused eye and head changes |
| `talking` | 3 | 4 | attached-paw greeting gesture |
| `happy` | 7 | 6 | project-only heart-eyes transition |

The standards-compliant atlas keeps row 7 as generic running. The project atlas replaces only that unused row with the requested heart-eyes sequence.

## Findings

1. The former renderer used platform emoji glyphs. Shape, color, baseline, and expression varied by OS and browser, so the displayed character was not a controlled project asset.
2. The former mood animations transformed the whole glyph with CSS. That encoded state as scaling and rotation instead of intentional frame art and would create double motion after introducing a spritesheet.
3. `src/mirror-ds/components/pet/GuidePet.jsx` and `src/mirror-ds/ui_kits/mirror/motion.jsx` contain a separate geometric GuidePet prototype. They are not imported by the current Vite application and should not be treated as the runtime source of truth.
4. `StylingScreen.tsx` already owns the correct state priority: explicit happy reaction, listening, working, speaking, then idle. Asset integration does not need to duplicate or replace that state machine.
5. The sprite viewport now has a fixed 72x78 CSS-pixel geometry matching the 192x208 source-cell ratio. Mood changes cannot resize the pet or shift the speech bubble.

## QA artifacts

- Standard contact sheet: `output/hatch-pet/mochi/qa/contact-sheet.png`
- Project contact sheet: `output/hatch-pet/mochi/project/qa/contact-sheet.png`
- Standard validation: `output/hatch-pet/mochi/final/validation.json`
- Project validation: `output/hatch-pet/mochi/project/final/validation.json`
- Animation previews: `output/hatch-pet/mochi/qa/videos/`
