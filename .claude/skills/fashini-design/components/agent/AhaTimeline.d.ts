import * as React from "react";

export type AhaDemoStage =
  | "idle"
  | "lucy_preview"
  | "google_generating"
  | "google_ready"
  | "handoff_ready";

export interface AhaStep {
  key: string;
  label: string;
  value: string;
}

/**
 * Aha timeline — the choreographed demo rail (Lucy realtime → Google
 * fallback → try-on handoff). Bind to `AgentState.aha_demo`; the active
 * stage highlights in cobalt.
 */
export interface AhaTimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  stage?: AhaDemoStage;
  /** `aha_demo.narrative`. */
  narrative?: string;
  /** Override the three steps. */
  steps?: AhaStep[];
}

export function AhaTimeline(props: AhaTimelineProps): React.ReactElement;
