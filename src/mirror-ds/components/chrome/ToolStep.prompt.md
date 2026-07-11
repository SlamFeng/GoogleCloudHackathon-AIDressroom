**ToolStep** — one designed "working" step (spinner → check) with a human label; stack several as the agent works.

```jsx
<ToolStep label="正在读取身型模板…" done index={0} />
<ToolStep label="搜索店内现货…"   done index={1} />
<ToolStep label="为你搭配三套…"           index={2} />
```

Cobalt spinner while `done={false}`, cobalt check when done. `index` drives the staggered entrance. Never a raw trace dump — three or four human steps, max.
