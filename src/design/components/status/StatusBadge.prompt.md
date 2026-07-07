**StatusBadge** — a caption-over-mono-value badge for the agent control plane; bind to `AgentState`.

```jsx
<StatusBadge label="agent" value={state.status} />
<StatusBadge label="route" value={state.route} active />
<StatusBadge label="round" value={state.recommendation_round} />
```

`active` highlights in cobalt — use for the live/held badge only.
