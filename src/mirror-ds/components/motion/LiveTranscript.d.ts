import * as React from "react";

/**
 * LiveTranscript (signature C) — the customer's spoken words rise/fade in as a
 * refined caption over a soft scrim, visually tied to the voice aura.
 */
export interface LiveTranscriptProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Finalised words. */
  text?: string;
  /** Trailing interim word(s), shown dimmer while still recognising. */
  interim?: string;
  /** Show the empty "…" prompt while listening with nothing said yet. */
  listening?: boolean;
}

export function LiveTranscript(props: LiveTranscriptProps): React.ReactElement;
