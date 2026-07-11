**FeedbackTags** — structured feedback chips on the mirror (color / fit / style / price / reject) that drive Fashini's re-recommend loop.

```jsx
<FeedbackTags onSelect={(tag) => refine(tag.dimension)} disabled={busy} />
```

Rendered as gentle glass pills so they don't crowd the reflection. `overall` ("Not these") = reject_all and reads in the failed tone. Pass `active` to highlight the last-used dimension.
