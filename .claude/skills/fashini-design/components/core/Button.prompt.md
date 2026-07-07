**Button** — the standard Fashini action control; the cobalt accent is reserved for the `primary` variant, everything else is neutral.

```jsx
<Button variant="primary" size="lg" iconRight={<span>→</span>}>
  Confirm & reserve
</Button>
<Button variant="secondary">Preview</Button>
<Button variant="text">← Back to profile</Button>
```

Variants: `primary` (cobalt) · `secondary` (hairline outline) · `ghost` (inset fill) · `text` (link-like).
Sizes: `sm` 36 · `md` 44 · `lg` 60 (use `lg` on mirror / entrance screens). Props: `block`, `icon`, `iconRight`, plus native button attrs (`disabled`, `onClick`). Press-scales on active; disabled drops to 0.4 opacity.
