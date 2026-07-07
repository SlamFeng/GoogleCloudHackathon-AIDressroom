**TryOnStage** — the signature realtime try-on reveal (Lucy); the choreographed climax of the system.

```jsx
const [phase, setPhase] = React.useState("idle");
<TryOnStage
  phase={phase}
  baseSrc={currentPhoto}
  outfitSrc={recommendedLook}
  badge="Lucy · realtime"
/>
<Button onClick={() => setPhase("reveal")}>Preview look</Button>
```

Setting `phase="reveal"` plays: accent scan-line sweep top→bottom → outfit fills in behind it → fabric shimmer → "スタイリング完了 / Styled." label rises. Honors `prefers-reduced-motion`. Portrait aspect (3:4) by default; pass a custom figure via children when you don't have images.
