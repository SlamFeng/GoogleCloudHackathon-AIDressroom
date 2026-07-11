import "./gesture-hint.css";

export type GestureHintKey = "talk" | "pick" | "confirm" | "proceed" | "back";

const HINTS: { key: GestureHintKey; glyph: string; label: string }[] = [
  { key: "talk", glyph: "✋", label: "说话" },
  { key: "pick", glyph: "1·2·3", label: "选择" },
  { key: "confirm", glyph: "👍", label: "试穿" },
  { key: "proceed", glyph: "👌", label: "确定" },
  { key: "back", glyph: "✊", label: "返回" }
];

/**
 * Floating glass bubbles teaching the hands-free gestures; the detected one
 * lights up cobalt. `quiet` fades them once the customer is confident. Self-
 * contained (no design-system tokens). `only` narrows to a subset of keys.
 */
export function GestureHint({
  active = null,
  quiet = false,
  only,
  labelOverrides
}: {
  active?: GestureHintKey | null;
  quiet?: boolean;
  only?: GestureHintKey[];
  // Relabel a gesture for this context — e.g. in onboarding 👍 means "确定",
  // not "试穿".
  labelOverrides?: Partial<Record<GestureHintKey, string>>;
}) {
  const hints = (only ? HINTS.filter((h) => only.includes(h.key)) : HINTS).map((h) =>
    labelOverrides?.[h.key] ? { ...h, label: labelOverrides[h.key]! } : h
  );
  return (
    <div className="gesture-hints" role="group" aria-label="手势提示" data-quiet={quiet ? "true" : undefined}>
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
