import "./live-transcript.css";

/**
 * Live STT caption over a dark glass scrim — each unit (word for Latin,
 * character for CJK) rises + fades in on arrival. Empty until listening.
 * Self-contained (no design-system tokens) so it drops into the mirror as-is.
 */
export function LiveTranscript({ text, listening }: { text: string; listening: boolean }) {
  const trimmed = text.trim();
  const isLatin = /\s/.test(trimmed) && /[a-z]/i.test(trimmed);
  const units = trimmed ? (isLatin ? trimmed.split(/\s+/) : Array.from(trimmed)) : [];
  if (!listening && units.length === 0) return null;
  return (
    <div className="live-transcript" aria-live="polite">
      {units.length === 0 ? (
        <span className="lt-dots">…</span>
      ) : (
        units.map((unit, index) => (
          <span
            key={index}
            className="lt-unit"
            style={{
              animationDelay: `${Math.min(index * 0.035, 0.5)}s`,
              marginRight: isLatin ? "0.28em" : 0
            }}
          >
            {unit}
          </span>
        ))
      )}
    </div>
  );
}
