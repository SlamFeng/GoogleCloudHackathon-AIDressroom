import "./gesture-readbar.css";
import type { GestureAction } from "./useGestureControl";

type BarLanguage = "en" | "zh" | "ja";

const GLYPH: Record<GestureAction, string> = {
  confirm: "👍",
  proceed: "👌",
  talk: "✋",
  back: "✊"
};

const TEXT: Record<BarLanguage, Record<GestureAction, string>> = {
  en: { confirm: "Try on", proceed: "Confirm", talk: "Talk", back: "Back" },
  zh: { confirm: "试穿", proceed: "确定", talk: "说话", back: "返回" },
  ja: { confirm: "試着", proceed: "確定", talk: "話す", back: "戻る" }
};

/**
 * Read-bar for a held gesture — while the customer holds 👍/✋/✊, a labelled
 * glass pill fills over `dwellMs` before the gesture fires, so it isn't
 * hair-trigger. Renders nothing when no gesture is being held.
 */
export function GestureReadBar({
  action,
  dwellMs = 700,
  labelOverrides,
  language = "zh"
}: {
  action: GestureAction | null;
  dwellMs?: number;
  // Relabel a gesture for this context — e.g. in onboarding 👍 means "确定".
  labelOverrides?: Partial<Record<GestureAction, string>>;
  language?: BarLanguage;
}) {
  if (!action) return null;
  const text = labelOverrides?.[action] ?? TEXT[language][action];
  return (
    <div className="gesture-readbar" role="status">
      <span className="grb-glyph" aria-hidden="true">
        {GLYPH[action]}
      </span>
      <span className="grb-label">{text}</span>
      <span className="grb-track">
        {/* keyed by action so the fill restarts when the held gesture changes */}
        <span key={action} className="grb-fill" style={{ animationDuration: `${dwellMs}ms` }} />
      </span>
    </div>
  );
}
