**LiveTranscript** — the customer's words rise/fade in as a refined caption over a soft scrim, tied to the aura.

```jsx
<LiveTranscript text={stt.final} interim={stt.interim} listening={stt.listening} />
```

Each finalised word animates in on arrival; the interim word shows dimmer. Renders nothing until listening or text exists. Center it just below the voice aura.
