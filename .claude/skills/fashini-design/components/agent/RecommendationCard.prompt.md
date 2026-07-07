**RecommendationCard** — the set card at the heart of the sales console; binds to `RecommendationSet`.

```jsx
{sets.map((set, i) => (
  <RecommendationCard
    key={set.set_id}
    set={set}
    index={i}
    selected={set.set_id === selectedId}
    onSelect={() => setSelectedId(set.set_id)}
    onPreview={requestPreview}
    onConfirm={confirmSelection}
  />
))}
```

Shows rec-type (cobalt), round + set_id, reason, `ProductRow`s, and a count-up set total. Selected state swaps the hairline for a cobalt border. Pass `index` so a list staggers its materialize entrance.
