**Icon** — the crafted SVG icon set (2px stroke, round caps, `currentColor`). No emoji anywhere in the mirror UI.

```jsx
<Icon name="camera" size={18} />
<Icon name="thumbs-up" />            {/* 👍 confirm gesture */}
<ControlPill icon={<Icon name="hand" size={18} />} active />
```

Names: `arrow-left` `arrow-right` `camera` `hand` `thumbs-up` `fist` `expand` `volume` `volume-x` `mic` `check` `ruler` `scale` `user` `calendar`. Inherits colour from its parent; `hand` / `thumbs-up` / `fist` are the hands-free gesture glyphs (✋ talk · 👍 confirm · ✊ back).
