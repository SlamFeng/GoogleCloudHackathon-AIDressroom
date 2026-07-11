**TryOnReveal** — the choreographed full-bleed try-on climax (the one allowed full-bleed moment).

```jsx
<TryOnReveal
  phase="revealing"
  imageUrl={renderedLook}      // null → generating placeholder
  windowMs={15000}
  recLabel="Explicit need"
  totalYen={40700}
  onBack={backToLooks}
  onChoose={confirm}
/>
```

Place inside the mirror shell (position:absolute inset:0). On enter, a light bloom sweeps the reflection and the view cross-fades in; a thin cobalt ring counts down the render window. Bottom bar stays minimal (back / choose). Composes MicroLabel · PriceTag · Button.
