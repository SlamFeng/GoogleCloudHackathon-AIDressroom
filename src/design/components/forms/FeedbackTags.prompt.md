**FeedbackTags** — the structured feedback quick-tags that drive Fashini's re-recommendation loop.

```jsx
<FeedbackTags onSelect={(tag) => sendAgentFeedback(sessionId, { set_id, dimension: tag.dimension })} />
```

Defaults to Color / Fit / Style / Price / Reject all. "Reject all" (`overall`) is styled in the failed red and maps to `reject_all`; the rest are `partial_adjust`.
