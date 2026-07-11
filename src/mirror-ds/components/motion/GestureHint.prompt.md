**GestureHint** — floating glass bubbles teaching the hands-free gestures; the detected one lights up.

```jsx
<GestureHint active={gesture.action} quiet={customerConfident} />
```

Default hints: ✋ Talk · 1·2·3 Pick · 👍 Try on · ✊ Back. Pass `active` = the detected gesture key to light it cobalt. Set `quiet` to auto-fade the cluster once the customer no longer needs the hint. `pointer-events:none`. Override `hints` to teach a different set.
