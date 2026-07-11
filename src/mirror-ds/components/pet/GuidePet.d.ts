import * as React from "react";

/**
 * GuidePet — a small, tasteful geometric companion (glass pebble + cobalt core
 * + reactive eyes) that voices the agent's lines and reacts with subtle emotion.
 * Lives in a corner; waves off on exit.
 *
 * @startingPoint section="Motion" subtitle="Geometric guide-pet companion with speech bubble + moods" viewport="320x220"
 */
export interface GuidePetProps extends React.HTMLAttributes<HTMLDivElement> {
  visible?: boolean;
  message?: string;
  mood?: "idle" | "listening" | "working" | "talking" | "happy";
  side?: "right" | "left";
}

export function GuidePet(props: GuidePetProps): React.ReactElement;
