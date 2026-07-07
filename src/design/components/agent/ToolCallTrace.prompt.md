**ToolCallTrace** — the signature "agent is working live" inspector; bind to `AgentState.tool_calls`.

```jsx
<ToolCallTrace toolCalls={state.tool_calls} />
```

Numbered rows stream in row-by-row (staggered), each with a `ToolStatusChip` (ok/held/failed via `toolTone`) and a timestamp; click a row to expand its input/output JSON. Keep this visible — it's core demo/judging evidence.
