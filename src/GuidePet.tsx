import { useEffect, useState, type CSSProperties } from "react";

// The business moods stay stable while the sprite rows own the visual motion.
export type PetMood = "idle" | "listening" | "working" | "talking" | "happy";

const FRAME_WIDTH = 72;
const FRAME_HEIGHT = 78;
const ATLAS_COLUMNS = 8;
const ATLAS_ROWS = 9;

const MOOD_SPRITES: Record<PetMood, { row: number; frames: number; durationMs: number }> = {
  idle: { row: 0, frames: 6, durationMs: 1800 },
  listening: { row: 6, frames: 6, durationMs: 1000 },
  working: { row: 8, frames: 6, durationMs: 900 },
  talking: { row: 3, frames: 4, durationMs: 720 },
  // The project atlas replaces the unused generic-running row with heart eyes.
  happy: { row: 7, frames: 6, durationMs: 1000 }
};

type SpriteStyle = CSSProperties & {
  "--pet-end-x": string;
};

export function GuidePet({
  visible,
  message,
  mood = "idle"
}: {
  visible: boolean;
  message?: string;
  mood?: PetMood;
}) {
  const [rendered, setRendered] = useState(visible);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      setLeaving(false);
      return;
    }
    if (rendered) {
      setLeaving(true);
      const timer = window.setTimeout(() => {
        setRendered(false);
        setLeaving(false);
      }, 420);
      return () => window.clearTimeout(timer);
    }
  }, [visible, rendered]);

  if (!rendered) return null;

  const sprite = MOOD_SPRITES[mood];
  const spriteStyle: SpriteStyle = {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    backgroundImage: "url(/pets/mochi/spritesheet.webp)",
    backgroundRepeat: "no-repeat",
    backgroundSize: `${ATLAS_COLUMNS * FRAME_WIDTH}px ${ATLAS_ROWS * FRAME_HEIGHT}px`,
    backgroundPositionY: -sprite.row * FRAME_HEIGHT,
    imageRendering: "pixelated",
    animation: `pet-sprite ${sprite.durationMs}ms steps(${sprite.frames}, end) infinite`,
    "--pet-end-x": `${-sprite.frames * FRAME_WIDTH}px`
  };

  return (
    <div
      style={{
        position: "absolute",
        right: 20,
        top: "34%",
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
        pointerEvents: "none",
        animation: `${leaving ? "pet-out" : "pet-in"} .42s cubic-bezier(.2,1.1,.3,1) both`
      }}
    >
      <style>{PET_CSS}</style>
      {message && (
        <div
          style={{
            width: "max-content",
            maxWidth: "min(280px, calc(100vw - 40px))",
            background: "rgba(18,18,22,.92)",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: 16,
            borderBottomRightRadius: 4,
            fontSize: 14,
            lineHeight: 1.45,
            boxShadow: "0 10px 30px rgba(0,0,0,.28)"
          }}
        >
          {message}
        </div>
      )}
      <div
        key={mood}
        className="guide-pet-sprite"
        aria-hidden="true"
        style={spriteStyle}
      />
    </div>
  );
}

const PET_CSS = `
@keyframes pet-in { from { transform: translateY(48px) scale(.5); opacity: 0 } to { transform: none; opacity: 1 } }
@keyframes pet-out { from { transform: none; opacity: 1 } to { transform: translateY(48px) scale(.5); opacity: 0 } }
@keyframes pet-sprite { from { background-position-x: 0 } to { background-position-x: var(--pet-end-x) } }
@media (prefers-reduced-motion: reduce) {
  .guide-pet-sprite { animation: none !important; }
}
`;
