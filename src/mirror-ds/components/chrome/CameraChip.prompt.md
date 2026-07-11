**CameraChip** — the persistent, quiet privacy reassurance shown once the camera is live.

```jsx
<CameraChip>Camera on · nothing is saved</CameraChip>
<CameraChip>摄像头开启 · 不会保存</CameraChip>
```

The red dot is the honest recording indicator (not cobalt) and pulses via `fsh-live-pulse`. Keep it small and top-anchored so it never crowds the reflection. Set `live={false}` for a paused/off state.
