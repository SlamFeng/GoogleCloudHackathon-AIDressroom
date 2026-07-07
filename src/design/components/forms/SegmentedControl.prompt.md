**SegmentedControl** — discrete single-select; the active segment fills cobalt.

```jsx
<SegmentedControl
  value={age}
  onChange={setAge}
  options={["18-25", "26-35", "36-45", "46+"]}
/>
```

Options are strings or `{value,label}`. `size="lg"` for mirror touch targets.
