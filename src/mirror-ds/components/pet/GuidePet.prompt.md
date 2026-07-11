**GuidePet** — a small, tasteful geometric companion that voices the agent's lines and reacts with subtle emotion. Premium, not a cartoon.

```jsx
<GuidePet visible={!leaving} message="给你搭好了三套，都是现货。" mood="talking" side="right" />
```

Moods: `idle` (bob) · `listening` (cobalt halo) · `working` (squint) · `talking` (pulse) · `happy` (bounce + arced eyes). Animates in on mount, waves off when `visible` flips false. Lives in a corner, `pointer-events:none`, never over the reflection.
