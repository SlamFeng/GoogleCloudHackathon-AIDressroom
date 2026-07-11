**Stepper** — big numeric value with −/+ glass buttons and a trailing unit; the hands-easy alternative to a text field for the profile gate.

```jsx
<Stepper value={height} onChange={setHeight} unit="cm" min={100} max={230} />
<Stepper value={weight} onChange={setWeight} unit="kg" min={25} max={250} />
```

Value is set in the display grotesk; unit is mono. Clamps to `min`/`max`; `step` defaults to 1.
