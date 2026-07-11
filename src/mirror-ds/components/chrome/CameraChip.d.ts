import * as React from "react";

/**
 * CameraChip — the persistent "● camera on · nothing is saved" reassurance
 * shown the whole time the camera is live. The dot is the real (red) recording
 * indicator, deliberately not cobalt.
 */
export interface CameraChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Pulse the live dot. Default true. */
  live?: boolean;
  children?: React.ReactNode;
}

export function CameraChip(props: CameraChipProps): React.ReactElement;
