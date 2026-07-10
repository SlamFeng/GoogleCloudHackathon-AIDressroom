import { useEffect, useState } from "react";

// A small shopping-guide "pet" that appears in the corner during the realtime
// try-on. It voices the agent's lines via a speech bubble and reacts with simple
// emotion (idle bob / talking pulse / happy bounce). It animates in on entry and
// out on exit (e.g. after purchase), and is purely presentational.

export type PetMood = "idle" | "listening" | "working" | "talking" | "happy";

const FACE: Record<PetMood, string> = {
  idle: "🐱",
  listening: "😺",
  working: "😼",
  talking: "😺",
  happy: "😻"
};

const ANIM: Record<PetMood, string> = {
  idle: "pet-bob 2.6s ease-in-out infinite",
  listening: "pet-listen 1.1s ease-in-out infinite",
  working: "pet-work .8s ease-in-out infinite",
  talking: "pet-talk .5s ease-in-out infinite",
  happy: "pet-bounce .6s ease"
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
      const timer = setTimeout(() => {
        setRendered(false);
        setLeaving(false);
      }, 420);
      return () => clearTimeout(timer);
    }
  }, [visible, rendered]);

  if (!rendered) return null;

  const faceAnim = ANIM[mood];

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
            maxWidth: 280,
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
      <div style={{ fontSize: 56, filter: "drop-shadow(0 6px 10px rgba(0,0,0,.28))", animation: faceAnim }}>
        {FACE[mood]}
      </div>
    </div>
  );
}

const PET_CSS = `
@keyframes pet-in { from { transform: translateY(48px) scale(.5); opacity: 0 } to { transform: none; opacity: 1 } }
@keyframes pet-out { from { transform: none; opacity: 1 } to { transform: translateY(48px) scale(.5); opacity: 0 } }
@keyframes pet-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
@keyframes pet-listen { 0%,100% { transform: rotate(-6deg) scale(1.02) } 50% { transform: rotate(6deg) scale(1.06) } }
@keyframes pet-work { 0%,100% { transform: translateX(0) rotate(0) } 25% { transform: translateX(-3px) rotate(-8deg) } 75% { transform: translateX(3px) rotate(8deg) } }
@keyframes pet-talk { 0%,100% { transform: scale(1) } 50% { transform: scale(1.13) } }
@keyframes pet-bounce { 0% { transform: scale(1) } 30% { transform: scale(1.32) rotate(-7deg) } 60% { transform: scale(.94) rotate(5deg) } 100% { transform: scale(1) } }
`;
