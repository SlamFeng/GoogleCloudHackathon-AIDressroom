import * as React from "react";

/**
 * VoiceAura (signature A) — the diffuse, morphing cobalt+warm aura that enters
 * when the agent listens or speaks, expands/brightens with voice amplitude
 * while the customer talks, and pulses gently while the agent speaks.
 *
 * @startingPoint section="Motion" subtitle="Diffuse voice aura — idle / listening / speaking" viewport="420x420"
 */
export interface VoiceAuraProps extends React.HTMLAttributes<HTMLDivElement> {
  state?: "hidden" | "idle" | "listening" | "speaking";
  /** Live mic level 0..1 — expands + brightens the aura while listening. */
  amplitude?: number;
  /** Aura box size in px. */
  size?: number;
}

export function VoiceAura(props: VoiceAuraProps): React.ReactElement;
