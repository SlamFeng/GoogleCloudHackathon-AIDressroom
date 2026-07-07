**ProductRow** — one product line (slot · name · ¥ price · color/fit) inside a recommendation set.

```jsx
{set.products.map((p) => <ProductRow key={p.product_id} product={p} />)}
```

Binds directly to `Product`; the price uses `PriceTag`.
