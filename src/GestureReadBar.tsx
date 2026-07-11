import "./gesture-readbar.css";
import type { GestureAction } from "./useGestureControl";

const LABEL: Record<GestureAction, { glyph: string; text: string }> = {
  confirm: { glyph: "👍", text: "试穿" },
  proceed: { glyph: "👌", text: "确定" },
  talk: { glyph: "✋", text: "说话" },
  back: { glyph: "✊", text: "返回" }
};

/**
 * Read-bar for a held gesture — while the customer holds 👍/✋/✊, a labelled
 * glass pill fills over `dwellMs` before the gesture fires, so it isn't
 * hair-trigger. Renders nothing when no gesture is being held.
 */
export function GestureReadBar({
  action,
  dwellMs = 700
}: {
  action: GestureAction | null;
  dwellMs?: number;
}) {
  if (!action) return null;
  const label = LABEL[action];
  return (
    <div className="gesture-readbar" role="status">
      <span className="grb-glyph" aria-hidden="true">
        {label.glyph}
      </span>
      <span className="grb-label">{label.text}</span>
      <span className="grb-track">
        {/* keyed by action so the fill restarts when the held gesture changes */}
        <span key={action} className="grb-fill" style={{ animationDuration: `${dwellMs}ms` }} />
      </span>
    </div>
  );
}
