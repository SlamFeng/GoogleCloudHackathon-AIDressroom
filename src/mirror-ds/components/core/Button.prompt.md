**Button** — the standard Fashini Mirror action control on the dark surface; cobalt is reserved for `primary`.

```jsx
<Button variant="primary" size="lg" iconRight={<span>→</span>}>Reserve & try on</Button>
<Button variant="glass">Try it on</Button>
<Button variant="text">← Back</Button>
```

Variants: `primary` (cobalt, soft glow) · `glass` (frosted, secondary) · `ghost` (faint fill) · `text` (link-like). Sizes: `sm` 40 · `md` 48 · `lg` 64 (use `lg` for mirror primary actions — standing, arm's length). Props: `block`, `icon`, `iconRight`, plus native button attrs. Press-scales on active; disabled drops to 0.4.
