**VoiceAura** — the centerpiece motion. A diffuse, morphing cobalt+warm aura; never a hard shape.

```jsx
<VoiceAura state="listening" amplitude={micLevel} size={320} />
<VoiceAura state="speaking" />
<VoiceAura state="idle" />
```

States: `hidden` · `idle` (calm breathe) · `listening` (expands + brightens with `amplitude` 0..1) · `speaking` (gentle TTS pulse). Feed `amplitude` from the live mic level. Purely presentational, `pointer-events:none` — place it behind the voice affordance. Reduced-motion holds a steady soft glow.
