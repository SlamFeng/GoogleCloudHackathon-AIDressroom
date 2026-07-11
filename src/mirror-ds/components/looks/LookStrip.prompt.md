**LookStrip** — the compact three-looks strip: number tabs 1·2·3, one active look, feedback chips. Slim and bottom-anchored so the reflection dominates.

```jsx
<LookStrip
  looks={looks}                 // [{ id, recType, totalYen, items:[{name,colorHex,imageUrl}] }]
  activeIndex={active}
  onSelect={setActive}
  armedIndex={gesture.armedChoice}   // 0-based; shows the dwell ring
  onTryOn={(look) => preview(look)}
  onChoose={(look) => confirm(look)}
  onFeedback={(tag) => refine(tag.dimension)}
/>
```

Finger-count 1/2/3 maps to the tabs; holding a count arms the matching tab (dwell ring sweeps up over `dwellMs`). Garment thumbnails use `imageUrl`, falling back to a dominant-colour glass tile. Composes MicroLabel · PriceTag · Button · FeedbackTags.
