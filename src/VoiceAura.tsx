import "./voice-aura.css";
import type { CSSProperties } from "react";

export type VoiceAuraState = "hidden" | "idle" | "listening" | "speaking";

/**
 * Diffuse ambient voice aura (ChatGPT-voice-orb feel). Enters when the agent is
 * listening or speaking; while listening it expands/brightens with live mic
 * amplitude (0..1). Purely presentational — drive `state` + `amplitude` from the
 * mirror's speech state (e.g. useAudioLevel while stt.listening).
 */
export function VoiceAura({
  state = "idle",
  amplitude = 0,
  size = 240,
  style
}: {
  state?: VoiceAuraState;
  amplitude?: number;
  size?: number;
  style?: CSSProperties;
}) {
  if (state === "hidden") return null;
  const amp = Math.max(0, Math.min(1, amplitude));
  return (
    <div
      className="voice-aura"
      data-state={state}
      aria-hidden="true"
      style={{ width: size, height: size, ["--va-amp" as string]: amp, ...style }}
    >
      <div className="voice-aura-rot">
        <span className="va-blob va-blob-a" />
        <span className="va-blob va-blob-b" />
        <span className="va-blob va-blob-c" />
        <span className="va-blob va-blob-warm" />
      </div>
    </div>
  );
}
