**ControlPill** — tiny unobtrusive glass pill for the top controls; `active` lights it cobalt for an enabled toggle.

```jsx
<ControlPill icon="←" label="Back" />
<ControlPill icon="✋" active />       {/* gestures on */}
<ControlPill icon="🔇" />
```

Icon-only by default; add `label` for the few that need words. Render as a non-button with `as="span"` for a static badge.
