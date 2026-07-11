**GlassPanel** — the signature frosted DARK-glass surface every piece of Fashini Mirror UI floats on, over the live reflection.

```jsx
<GlassPanel variant="sheet" style={{ padding: 20 }}>
  … bottom-anchored looks strip …
</GlassPanel>
<GlassPanel variant="card" style={{ padding: 24 }}>consent gate</GlassPanel>
<GlassPanel variant="pill" style={{ padding: "8px 14px" }}>chip</GlassPanel>
```

Variants: `sheet` (bottom-anchored content, top corners only) · `card` (the one focused card, strong blur) · `pill` (chips/tabs/controls) · `inset` (a well inside a panel, no blur). Set `edge={false}` to drop the bright top highlight. Always sits over the live-camera layer — never a solid opaque background. Falls back to a near-solid fill where `backdrop-filter` is unsupported or reduced-transparency is set.
