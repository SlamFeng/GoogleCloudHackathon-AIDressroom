**PriceTag** — monospace, tabular-nums JPY price; bind to `Product.price_yen`.

```jsx
<PriceTag amount={12900} size="lg" />
<PriceTag amount={setTotal} size="xl" countUp />   {/* signature count-up */}
```

`size`: `sm` · `md` · `lg` · `xl` (entrance climax). `countUp` ticks from 0 to `amount` on mount and honors reduced-motion.
