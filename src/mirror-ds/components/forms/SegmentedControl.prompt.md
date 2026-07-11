**SegmentedControl** — discrete single-select on dark glass (gender, age range). Active segment fills cobalt.

```jsx
<SegmentedControl
  size="lg"
  value={gender}
  onChange={setGender}
  options={[{ value: "female", label: "女性" }, { value: "male", label: "男性" }, { value: "neutral", label: "不限定" }]}
/>
```

Sizes: `sm` 40 · `md` 52 · `lg` 60 (use `lg` on the mirror). Options are strings or `{value,label}`.
