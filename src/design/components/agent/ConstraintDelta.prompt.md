**ConstraintDelta** — surfaces how feedback changed the agent's constraints; bind to `AgentConstraints`.

```jsx
<ConstraintDelta
  prefer={state.constraints.prefer}
  avoid={state.constraints.avoid}
  budgetYen={state.constraints.budget_yen}
/>
```

`prefer` rows use a cobalt `+`, `avoid` rows a red `−`. Keep visible after feedback — it's required demo evidence that the loop reacted.
