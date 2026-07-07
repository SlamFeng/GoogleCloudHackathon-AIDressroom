**AhaTimeline** — the demo rail showing the Lucy → Google fallback → handoff choreography; bind to `AgentState.aha_demo`.

```jsx
<AhaTimeline stage={state.aha_demo.stage} narrative={state.aha_demo.narrative} />
```

The active stage highlights in cobalt with a soft fill. Stages: idle · lucy_preview · google_generating · google_ready · handoff_ready.
