/* Fashini Magic Mirror — self-contained motion + look + pet primitives for the
   UI kit (mirror the authored components). Extends the namespace primitives.jsx
   registered. Uses JSX (loaded via text/babel). */

const _NS = window.FashiniMirrorDesignSystem_c521b8;
const glassF = "blur(var(--glass-blur)) saturate(var(--glass-saturate))";

function VoiceAura({ state = "idle", amplitude = 0, size = 320, style, ...rest }) {
  const shown = state !== "hidden";
  const amp = Math.max(0, Math.min(1, amplitude));
  const scale = state === "listening" ? 1 + amp * 0.42 : state === "speaking" ? 1.04 : 1;
  const brightness = state === "listening" ? 0.85 + amp * 0.6 : state === "speaking" ? 1 : 0.8;
  const blob = (inset, bg, anim, extra) => (
    <div style={{ position: "absolute", inset, borderRadius: "50%", background: bg, animation: anim, ...extra }} />
  );
  return (
    <div aria-hidden="true" style={{ position: "relative", width: size, height: size, pointerEvents: "none", opacity: shown ? 1 : 0, transition: "opacity var(--aura-enter) var(--ease-out)", ...style }} {...rest}>
      <div style={{ position: "absolute", left: "50%", top: "50%", width: "100%", height: "100%", transform: `translate(-50%, -50%) scale(${scale})`, filter: `blur(38px) brightness(${brightness})`, transition: "transform var(--aura-react) linear, filter var(--aura-react) linear", animation: state === "speaking" ? "fsh-aura-tts var(--aura-pulse-tts) var(--ease-aura) infinite" : undefined }}>
        {blob(0, "radial-gradient(closest-side, var(--accent-glow), transparent 72%)", "fsh-aura-breathe var(--aura-breathe) var(--ease-aura) infinite")}
        {blob("14%", "radial-gradient(closest-side, rgba(61,82,255,0.7), transparent 68%)", "fsh-aura-breathe calc(var(--aura-breathe) * 1.3) var(--ease-aura) infinite reverse")}
        {blob("28%", "radial-gradient(closest-side, var(--aura-warm-glow), transparent 70%)", "fsh-aura-breathe calc(var(--aura-breathe) * 0.85) var(--ease-aura) infinite", { mixBlendMode: "screen" })}
      </div>
    </div>
  );
}

const G_HINTS = [{ key: "talk", icon: "hand", label: "说话" }, { key: "pick", glyph: "1·2·3", label: "选择" }, { key: "confirm", icon: "thumbs-up", label: "试穿" }, { key: "back", icon: "fist", label: "返回" }];
function GestureHint({ hints = G_HINTS, active = null, quiet = false, style, ...rest }) {
  const { Icon } = _NS;
  return (
    <div role="group" aria-label="Gesture hints" style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", opacity: quiet ? 0.3 : 1, transition: "opacity var(--dur-slow) var(--ease-out)", pointerEvents: "none", ...style }} {...rest}>
      {hints.map((h, i) => {
        const on = active === h.key;
        return (
          <span key={h.key} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 13px", borderRadius: "var(--radius-pill)", border: `1px solid ${on ? "var(--accent-bright)" : "var(--glass-hairline)"}`, borderTopColor: on ? "var(--accent-bright)" : "var(--glass-edge)", background: on ? "var(--accent-tint)" : "var(--glass-pill-fill)", WebkitBackdropFilter: glassF, backdropFilter: glassF, color: on ? "var(--accent-bright)" : "var(--on-dark-2)", boxShadow: on ? "0 0 22px -6px var(--accent-glow)" : "var(--glass-shadow-pill)", transform: on ? "scale(1.08)" : "none", animation: `fsh-bubble-in var(--gesture-in) var(--ease-out) both, fsh-bubble-bob var(--gesture-bob) var(--ease-aura) ${0.5 + i * 0.12}s infinite`, animationDelay: `${i * 0.08}s`, transition: "transform var(--gesture-detect) var(--ease-out), background var(--gesture-detect) var(--ease-out), border-color var(--gesture-detect) var(--ease-out), color var(--gesture-detect) var(--ease-out)", fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }}>
            <span aria-hidden="true" style={{ display: "inline-flex", fontSize: 12, fontFamily: "var(--font-mono)" }}>{h.icon ? <Icon name={h.icon} size={16} /> : h.glyph}</span>
            {h.label}
          </span>
        );
      })}
    </div>
  );
}

function LiveTranscript({ text = "", interim = "", listening = false, style, ...rest }) {
  const trimmed = String(text).trim();
  const words = trimmed ? trimmed.split(/\s+/) : [];
  const isLatin = words.length > 1;
  const units = isLatin ? words : Array.from(trimmed); // per-char for CJK so it wraps
  const show = listening || units.length > 0 || interim;
  if (!show) return null;
  return (
    <div aria-live="polite" style={{ maxWidth: "88%", margin: "0 auto", padding: "12px 18px", borderRadius: 18, background: "rgba(5,5,7,0.5)", WebkitBackdropFilter: "blur(14px)", backdropFilter: "blur(14px)", border: "1px solid var(--glass-hairline)", color: "var(--on-dark)", fontFamily: "var(--font-sans)", fontSize: "var(--text-subtitle)", lineHeight: 1.4, textAlign: "center", overflowWrap: "anywhere", wordBreak: "break-word", ...style }} {...rest}>
      {units.length === 0 && !interim
        ? <span style={{ color: "var(--on-dark-2)" }}>…</span>
        : <>
            {units.map((u, i) => <span key={i} style={{ display: "inline-block", marginRight: isLatin ? "0.28em" : 0, animation: "fsh-word-in var(--stt-word-in) var(--ease-out) both", animationDelay: `${Math.min(i * 0.035, 0.5)}s` }}>{u}</span>)}
            {interim && <span style={{ display: "inline-block", marginLeft: isLatin ? 0 : "0.2em", color: "var(--on-dark-2)", animation: "fsh-word-in var(--stt-word-in) var(--ease-out) both" }}>{interim}</span>}
          </>}
    </div>
  );
}

function TryOnReveal({ phase = "revealing", imageUrl = null, windowMs = 15000, generating = true, recLabel = "Explicit need", totalYen = 0, headline = "正在把这套穿到你身上…", subline = "你正看着实时镜面，稍等就能看到自己穿上的样子。", onBack, onChoose, showRing = true, style, ...rest }) {
  const { MicroLabel, PriceTag, Button } = _NS;
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 20, overflow: "hidden", animation: "fsh-tryon-in var(--reveal-crossfade) var(--ease-out) both", ...style }} {...rest}>
      {imageUrl && <img src={imageUrl} alt="You in this look" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", animation: "fsh-tryon-in var(--reveal-crossfade) var(--ease-out) both" }} />}
      {phase === "revealing" && <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, height: "42%", top: 0, background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.42) 55%, transparent)", mixBlendMode: "screen", animation: "fsh-bloom-sweep var(--reveal-bloom) var(--ease-out) both" }} />}
      {!imageUrl && (
        <div style={{ position: "absolute", top: 28, left: "50%", transform: "translateX(-50%)", width: "min(86%, 420px)", textAlign: "center", padding: "14px 18px", borderRadius: "var(--radius-card)", background: "rgba(5,5,7,0.5)", WebkitBackdropFilter: "blur(14px)", backdropFilter: "blur(14px)", border: "1px solid var(--glass-hairline)", color: "var(--on-dark)" }}>
          <strong style={{ display: "block", fontSize: 15, marginBottom: 4 }}>{generating ? headline : "正在生成试穿效果…"}</strong>
          <span style={{ fontSize: 13, color: "var(--on-dark-2)" }}>{subline}</span>
        </div>
      )}
      {showRing && (
        <div style={{ position: "absolute", top: 20, right: 20, width: 52, height: 52 }}>
          <svg width="52" height="52" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="50" cy="50" r="46" fill="none" stroke="var(--on-dark-line)" strokeWidth="5" />
            <circle cx="50" cy="50" r="46" fill="none" stroke="var(--accent-bright)" strokeWidth="5" strokeLinecap="round" strokeDasharray="289" style={{ ["--ring-circ"]: 289, animation: `fsh-ring-fill ${windowMs}ms linear both` }} />
          </svg>
        </div>
      )}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", gap: 12, padding: "24px var(--sheet-gutter) calc(20px + env(safe-area-inset-bottom, 0px))", background: "linear-gradient(to top, var(--scrim-bottom), transparent)" }}>
        <span style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 13px", borderRadius: "var(--radius-pill)", background: "var(--glass-pill-fill)", WebkitBackdropFilter: "blur(var(--glass-blur))", backdropFilter: "blur(var(--glass-blur))", border: "1px solid var(--glass-hairline)", whiteSpace: "nowrap" }}>
          <MicroLabel tone="accent">{recLabel}</MicroLabel>
          <PriceTag amount={totalYen} size="md" />
        </span>
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="glass" onClick={onBack} style={{ flex: 1 }}>返回选择</Button>
          <Button variant="primary" iconRight={<span aria-hidden="true">→</span>} onClick={onChoose} style={{ flex: 1 }}>选这套</Button>
        </div>
      </div>
    </div>
  );
}

const REC_LABEL = { explicit_need: "Explicit need", similar: "Similar", style: "Style", seasonal: "Seasonal" };
function LookStrip({ looks = [], activeIndex = 0, onSelect, armedIndex = null, dwellMs = 700, showActions = true, onTryOn, onChoose, onFeedback, disabled = false, hint = "1·2·3 切换 · 竖起拇指试穿 · 握拳返回", style, ...rest }) {
  const { MicroLabel, PriceTag, Button, FeedbackTags } = _NS;
  const look = looks[activeIndex];
  const total = look ? (look.totalYen ?? (look.items || []).reduce((s, i) => s + (i.price_yen || 0), 0)) : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, ...style }} {...rest}>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }} role="tablist">
        {looks.map((l, i) => {
          const on = i === activeIndex; const armed = armedIndex === i;
          return (
            <button key={l.id || i} type="button" role="tab" aria-selected={on} onClick={() => onSelect && onSelect(i)}
              style={{ position: "relative", width: 46, height: 46, borderRadius: "50%", overflow: "hidden", border: `1px solid ${on ? "var(--accent-bright)" : "var(--glass-hairline)"}`, background: on ? "var(--accent)" : "var(--glass-pill-fill)", WebkitBackdropFilter: "blur(var(--glass-blur))", backdropFilter: "blur(var(--glass-blur))", color: on ? "var(--accent-ink)" : "var(--on-dark-2)", fontFamily: "var(--font-mono)", fontSize: 17, fontWeight: 600, cursor: "pointer", transform: on ? "scale(1.06)" : "none", transition: "transform var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out)" }}>
              {armed && <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "var(--accent-glow)", clipPath: "inset(100% 0 0 0)", animation: `fsh-dwell ${dwellMs}ms linear forwards` }} />}
              <span style={{ position: "relative" }}>{i + 1}</span>
            </button>
          );
        })}
      </div>
      {look && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <MicroLabel tone="accent">{look.recLabel || REC_LABEL[look.recType] || look.recType}</MicroLabel>
            <PriceTag amount={total} size="md" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(look.items || []).map((item, k) => (
              <div key={item.id || item.name || k} style={{ display: "flex", alignItems: "center", gap: 13, padding: 10, borderRadius: "var(--radius-control)", background: "var(--glass-inset-fill)", border: "1px solid var(--glass-hairline)" }}>
                <span style={{ flex: "0 0 auto", width: 52, height: 64, borderRadius: 8, overflow: "hidden", border: "1px solid var(--glass-hairline)", background: item.imageUrl ? "var(--glass-inset-fill)" : `linear-gradient(160deg, ${item.colorHex || "#3a3d47"}, rgba(255,255,255,0.04))`, display: "block" }}>
                  {item.imageUrl && <img src={item.imageUrl} alt={item.name || ""} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                </span>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--on-dark)", letterSpacing: "-0.01em", lineHeight: 1.2 }}>{item.name}</div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                    {item.category && <span style={{ fontSize: 12, color: "var(--on-dark-2)" }}>{item.category}</span>}
                    <PriceTag amount={item.price_yen || 0} size="sm" style={{ color: "var(--on-dark-2)" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {showActions ? (
            <>
              <div style={{ display: "flex", gap: 10 }}>
                <Button variant="glass" disabled={disabled} onClick={() => onTryOn && onTryOn(look, activeIndex)} style={{ flex: 1 }}>试穿这套</Button>
                <Button variant="primary" iconRight={<span aria-hidden="true">→</span>} disabled={disabled} onClick={() => onChoose && onChoose(look, activeIndex)} style={{ flex: 1 }}>选择</Button>
              </div>
              <FeedbackTags disabled={disabled} onSelect={(tag) => onFeedback && onFeedback(tag)} />
            </>
          ) : null}
        </div>
      )}
      {hint && <div style={{ textAlign: "center", color: "var(--on-dark-3)", fontSize: 12 }}>{hint}</div>}
    </div>
  );
}

function GuidePet({ visible = true, message, mood = "idle", side = "right", style, ...rest }) {
  const [rendered, setRendered] = React.useState(visible);
  const [leaving, setLeaving] = React.useState(false);
  React.useEffect(() => {
    if (visible) { setRendered(true); setLeaving(false); return; }
    if (rendered) { setLeaving(true); const t = setTimeout(() => { setRendered(false); setLeaving(false); }, 420); return () => clearTimeout(t); }
  }, [visible, rendered]);
  if (!rendered) return null;
  const bodyAnim = { idle: "fsh-pet-idle 2.8s var(--ease-aura) infinite", listening: "fsh-pet-idle 1.4s var(--ease-aura) infinite", working: "fsh-pet-idle 1s var(--ease-aura) infinite", talking: "fsh-pet-talk 0.5s var(--ease-aura) infinite", happy: "fsh-pet-happy 0.6s var(--ease-out)" }[mood];
  const eye = mood === "happy" ? { width: 9, height: 5, borderRadius: "9px 9px 0 0", background: "var(--accent-bright)" }
    : mood === "working" ? { width: 9, height: 2.5, borderRadius: 3, background: "var(--on-dark-2)" }
    : mood === "listening" ? { width: 8, height: 8, borderRadius: "50%", background: "var(--accent-bright)" }
    : { width: 7, height: 7, borderRadius: "50%", background: "var(--on-dark)" };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: side === "right" ? "flex-end" : "flex-start", gap: 10, pointerEvents: "none", animation: `${leaving ? "fsh-pet-out" : "fsh-pet-in"} 0.42s var(--ease-out) both`, ...style }} {...rest}>
      {message && (
        <div style={{ maxWidth: 210, background: "var(--glass-raised-fill)", WebkitBackdropFilter: glassF, backdropFilter: glassF, border: "1px solid var(--glass-hairline)", borderTopColor: "var(--glass-edge)", color: "var(--on-dark)", padding: "11px 15px", borderRadius: 18, [side === "right" ? "borderBottomRightRadius" : "borderBottomLeftRadius"]: 5, fontSize: 14, lineHeight: 1.45, boxShadow: "var(--glass-shadow-raised)" }}>{message}</div>
      )}
      <div style={{ position: "relative", width: 58, height: 58, borderRadius: 20, background: "var(--glass-raised-fill)", WebkitBackdropFilter: glassF, backdropFilter: glassF, border: "1px solid var(--glass-hairline)", borderTopColor: "var(--glass-edge)", boxShadow: "var(--glass-shadow-raised), inset 0 0 26px -8px var(--accent-glow)", display: "grid", placeItems: "center", animation: bodyAnim }}>
        {mood === "listening" && <span aria-hidden="true" style={{ position: "absolute", inset: -4, borderRadius: 24, border: "1px solid var(--accent-bright)", opacity: 0.5, animation: "fsh-live-pulse 1.6s var(--ease-out) infinite" }} />}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ display: "block", transition: "all var(--dur-fast) var(--ease-out)", ...eye }} />
          <span style={{ display: "block", transition: "all var(--dur-fast) var(--ease-out)", ...eye }} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window.FashiniMirrorDesignSystem_c521b8, { VoiceAura, GestureHint, LiveTranscript, TryOnReveal, LookStrip, GuidePet });
