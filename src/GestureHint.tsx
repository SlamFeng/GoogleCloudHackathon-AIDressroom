import "./gesture-hint.css";

export type GestureHintKey = "talk" | "pick" | "confirm" | "proceed" | "back";

type HintLanguage = "en" | "zh" | "ja";

const GLYPHS: { key: GestureHintKey; glyph: string }[] = [
  { key: "talk", glyph: "✋" },
  { key: "pick", glyph: "1·2·3" },
  { key: "confirm", glyph: "👍" },
  { key: "proceed", glyph: "👌" },
  { key: "back", glyph: "✊" }
];

const LABELS: Record<HintLanguage, Record<GestureHintKey, string>> = {
  en: { talk: "Talk", pick: "Pick", confirm: "Try on", proceed: "Confirm", back: "Back" },
  zh: { talk: "说话", pick: "选择", confirm: "试穿", proceed: "确定", back: "返回" },
  ja: { talk: "話す", pick: "選ぶ", confirm: "試着", proceed: "確定", back: "戻る" }
};

const GROUP_LABEL: Record<HintLanguage, string> = {
  en: "Gesture hints",
  zh: "手势提示",
  ja: "ジェスチャーヒント"
};

/**
 * Floating glass bubbles teaching the hands-free gestures; the detected one
 * lights up cobalt. `quiet` fades them once the customer is confident. Self-
 * contained (no design-system tokens). `only` narrows to a subset of keys.
 */
export function GestureHint({
  active = null,
  quiet = false,
  only,
  labelOverrides,
  language = "zh"
}: {
  active?: GestureHintKey | null;
  quiet?: boolean;
  only?: GestureHintKey[];
  // Relabel a gesture for this context — e.g. in onboarding 👍 means "确定",
  // not "试穿".
  labelOverrides?: Partial<Record<GestureHintKey, string>>;
  language?: HintLanguage;
}) {
  const labels = LABELS[language];
  const hints = (only ? GLYPHS.filter((h) => only.includes(h.key)) : GLYPHS).map((h) => ({
    ...h,
    label: labelOverrides?.[h.key] ?? labels[h.key]
  }));
  return (
    <div className="gesture-hints" role="group" aria-label={GROUP_LABEL[language]} data-quiet={quiet ? "true" : undefined}>
      {hints.map((hint, index) => (
        <span
          key={hint.key}
          className="gesture-bubble"
          data-on={active === hint.key ? "true" : undefined}
          style={{ animationDelay: `${index * 0.08}s`, ["--bob-delay" as string]: `${0.5 + index * 0.12}s` }}
        >
          <span className="gesture-bubble-glyph" aria-hidden="true">
            {hint.glyph}
          </span>
          {hint.label}
        </span>
      ))}
    </div>
  );
}
