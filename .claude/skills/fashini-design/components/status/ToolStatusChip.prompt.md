**ToolStatusChip** — the ok / held / failed pill on tool-call rows; `held` is the only accent status.

```jsx
<ToolStatusChip status="ok" />
<ToolStatusChip status="held" label="held" />
<ToolStatusChip status={toolTone(call.output)} />   {/* derive from ToolCallRecord */}
```

Use the exported `toolTone(output)` helper to map a `ToolCallRecord.output` to the right tone.
