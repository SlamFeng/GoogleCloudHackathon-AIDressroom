**ConsentCheck** — the single graceful consent row that turns the live camera on. Tick fills cobalt when agreed; the whole row tints faint cobalt.

```jsx
<ConsentCheck checked={agreed} onChange={setAgreed}>
  我同意启用摄像头，用于本次搭配。镜面画面不会录制或保存。
</ConsentCheck>
```

Keep the copy plain and trustworthy — this is the privacy moment. One or two of these, never a wall of checkboxes.
