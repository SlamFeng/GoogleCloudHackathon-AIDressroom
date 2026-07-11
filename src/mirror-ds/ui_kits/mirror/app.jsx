/* Fashini Magic Mirror — stages 6–9 + the interactive kiosk app.
   A stage rail (OUTSIDE the scaled frame) steps through the whole flow; each
   stage renders inside the portrait MirrorFrame with its live motion. */

const {
  Button, GlassPanel, MicroLabel, PriceTag,
  FeedbackTags, ControlPill, CameraChip, LookStrip,
  VoiceAura, GestureHint, TryOnReveal, GuidePet
} = window.FashiniMirrorDesignSystem_c521b8;
const { Reflection, Scrims, MirrorFrame } = window;
const {
  LOOKS, TopBar, CamNote, Sheet, petCorner,
  StageAttract, StageConsent, StageProfile, StageIdle, StageListening, StageWorking
} = window;

/* ============================================================
   6 · MIRROR · THREE LOOKS — slim bottom strip, reflection dominates
   ============================================================ */
function StageLooks({ active, setActive, armed }) {
  return (
    <>
      <Reflection figure />
      <Scrims />
      <TopBar onBack={() => {}} lang="zh" onLang={() => {}} />
      <CamNote />
      <div style={{ position: "absolute", left: 0, right: 0, top: "34%", zIndex: 9, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
        <GestureHint active="pick" />
      </div>
      <Sheet>
        <LookStrip looks={LOOKS} activeIndex={active} onSelect={setActive} armedIndex={armed} showActions={false} />
      </Sheet>
      <GuidePet visible mood="talking" style={{ ...petCorner, top: "clamp(70px, 16cqw, 110px)" }} message="三套都是现货，看清单品后举手确认试穿。" />
    </>
  );
}

/* ============================================================
   7 · MIRROR · TRY-ON (Lucy) — the one full-bleed moment
   ============================================================ */
function StageTryOn({ look }) {
  return (
    <>
      <Reflection figure tint="warm" />
      <TryOnReveal
        phase="revealing"
        imageUrl={null}
        windowMs={15000}
        recLabel={look.recLabel}
        totalYen={look.totalYen}
        headline="正在把这套穿到你身上…"
        subline="你正看着实时镜面，稍等就能看到自己穿上的样子。"
      />
      <div style={{ position: "absolute", top: "clamp(14px, 3.5cqw, 22px)", left: "clamp(14px, 3.5cqw, 22px)", zIndex: 21 }}>
        <CameraChip>摄像头开启 · 不会保存</CameraChip>
      </div>
      <GuidePet visible mood="happy" style={{ ...petCorner, top: "clamp(70px, 16cqw, 110px)", zIndex: 22 }} message="来，看看你穿上这套的样子～" />
    </>
  );
}

/* ============================================================
   8 · MIRROR · CONFIRM — slim card, reflection still visible
   ============================================================ */
function StageConfirm({ look }) {
  return (
    <>
      <Reflection figure />
      <Scrims />
      <TopBar onBack={() => {}} lang="zh" onLang={() => {}} />
      <CamNote />
      <Sheet>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <MicroLabel tone="accent">{look.recLabel}</MicroLabel>
          <MicroLabel>你的选择</MicroLabel>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {look.items.map((it) => (
            <div key={it.name} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontSize: "clamp(13px,3.2cqw,15px)", color: "var(--on-dark)" }}>{it.name}</span>
              <PriceTag amount={it.price_yen} size="sm" tone="on-dark" style={{ color: "var(--on-dark-2)" }} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", paddingTop: 14, borderTop: "1px solid var(--border-hairline)", marginBottom: 16 }}>
          <MicroLabel>合计</MicroLabel>
          <PriceTag amount={look.totalYen} size="lg" countUp />
        </div>
        <Button variant="primary" size="lg" block iconRight={<span aria-hidden="true">→</span>}>预留 · 送到试衣间</Button>
      </Sheet>
      <GuidePet visible mood="talking" style={{ ...petCorner, top: "clamp(70px, 16cqw, 110px)" }} message="确认好就帮你预留，送到试衣间。" />
    </>
  );
}

/* ============================================================
   9 · COMPLETE / FAREWELL — pet waves off; reflection stays
   ============================================================ */
function StageComplete({ look, petLeaving }) {
  return (
    <>
      <Reflection figure />
      <Scrims />
      <TopBar minimal lang="zh" onLang={() => {}} />
      <CamNote />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 10, padding: "clamp(22px, 5.5cqw, 40px)" }}>
        <MicroLabel tone="accent">已预留</MicroLabel>
        <h1 style={{ margin: "clamp(10px,2cqw,16px) 0", fontWeight: 800, letterSpacing: "var(--tracking-display)", lineHeight: 1.06, fontSize: "clamp(28px, 8cqw, 52px)", textWrap: "balance" }}>
          谢谢，这套已经<br />为你准备好了。
        </h1>
        <p style={{ margin: "0 0 clamp(16px,3cqw,24px)", color: "var(--on-dark-2)", fontSize: "clamp(14px,3.4cqw,18px)", lineHeight: 1.5, maxWidth: "26ch" }}>
          {look.recLabel} · <span className="fashini-mono">¥{look.totalYen.toLocaleString("ja-JP")}</span> 已送往试衣间 3 号。
        </p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span className="fashini-mono" style={{ fontSize: "clamp(12px,3cqw,14px)", color: "var(--on-dark-2)", padding: "8px 13px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border-hairline)" }}>预留码 · FSH-24Q</span>
        </div>
      </div>
      <GuidePet visible={!petLeaving} mood="happy" style={{ ...petCorner, top: "clamp(70px, 16cqw, 110px)" }} message="祝你今天愉快，再见啦！" />
    </>
  );
}

/* ============================================================
   Interactive kiosk app + stage rail
   ============================================================ */
const STAGES = [
  { key: "attract",  label: "00", name: "Attract" },
  { key: "consent",  label: "01", name: "Consent" },
  { key: "profile",  label: "02", name: "Profile" },
  { key: "idle",     label: "03", name: "Mirror · Idle" },
  { key: "listen",   label: "04", name: "Listening" },
  { key: "working",  label: "05", name: "Working" },
  { key: "looks",    label: "06", name: "Three looks" },
  { key: "tryon",    label: "07", name: "Try-on" },
  { key: "confirm",  label: "08", name: "Confirm" },
  { key: "complete", label: "09", name: "Complete" }
];

function App() {
  const [stage, setStage] = React.useState(0);
  const [amp, setAmp] = React.useState(0.3);
  const [workStep, setWorkStep] = React.useState(1);
  const [active, setActive] = React.useState(0);
  const [agreed, setAgreed] = React.useState(false);
  const [profile, setProfile] = React.useState({ gender: "female", age: "26–35", height: 173, weight: 58, weightBand: "50-60" });
  const [petLeaving, setPetLeaving] = React.useState(false);

  const go = (k) => setStage(STAGES.findIndex((s) => s.key === k));

  // consent: once agreed, the camera "turns on" and we move to the profile gate
  React.useEffect(() => {
    if (STAGES[stage].key === "consent" && agreed) {
      const t = setTimeout(() => go("profile"), 750);
      return () => clearTimeout(t);
    }
  }, [agreed, stage]);

  // live mic amplitude (drives the aura on the listening stage)
  React.useEffect(() => {
    let raf, t0 = performance.now();
    const tick = (t) => {
      const base = 0.5 + 0.5 * Math.sin((t - t0) / 380);
      const flick = 0.5 + 0.5 * Math.sin((t - t0) / 90);
      setAmp(0.25 + 0.55 * base * flick);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // walk the working steps while on the working stage
  React.useEffect(() => {
    if (STAGES[stage].key !== "working") { setWorkStep(1); return; }
    setWorkStep(1);
    const a = setTimeout(() => setWorkStep(2), 900);
    const b = setTimeout(() => setWorkStep(3), 1800);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [stage]);

  // farewell: pet waves off a moment after reaching complete
  React.useEffect(() => {
    if (STAGES[stage].key !== "complete") { setPetLeaving(false); return; }
    const t = setTimeout(() => setPetLeaving(true), 2600);
    return () => clearTimeout(t);
  }, [stage]);

  const look = LOOKS[active];
  const key = STAGES[stage].key;

  const content = {
    attract: <StageAttract />,
    consent: <StageConsent agreed={agreed} setAgreed={setAgreed} />,
    profile: <StageProfile profile={profile} setProfile={setProfile} amp={amp} onDone={() => go("idle")} />,
    idle: <StageIdle />,
    listen: <StageListening amp={amp} />,
    working: <StageWorking step={workStep} />,
    looks: <StageLooks active={active} setActive={setActive} armed={1} />,
    tryon: <StageTryOn look={look} />,
    confirm: <StageConfirm look={look} />,
    complete: <StageComplete look={look} petLeaving={petLeaving} />
  }[key];

  return (
    <>
      {/* stage rail — OUTSIDE the scaled frame */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 6, width: 208, flex: "0 0 auto", alignSelf: "center", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ padding: "2px 10px 12px" }}>
          <strong className="fashini-wordmark" style={{ fontSize: 17 }}>FASHINI</strong>
          <div style={{ fontSize: 11, color: "var(--on-dark-2)", marginTop: 4, letterSpacing: "0.02em" }}>Magic Mirror · 十阶段流程</div>
        </div>
        {STAGES.map((s, i) => {
          const on = i === stage;
          return (
            <button key={s.key} type="button" onClick={() => setStage(i)}
              style={{
                display: "flex", alignItems: "center", gap: 11, textAlign: "left", cursor: "pointer",
                padding: "9px 12px", borderRadius: 11,
                border: `1px solid ${on ? "var(--accent-bright)" : "transparent"}`,
                background: on ? "var(--accent-tint)" : "transparent",
                color: on ? "var(--on-dark)" : "var(--on-dark-2)",
                transition: "background var(--dur-fast) var(--ease-out)"
              }}>
              <span className="fashini-mono" style={{ fontSize: 12, color: on ? "var(--accent-bright)" : "var(--on-dark-3)" }}>{s.label}</span>
              <span style={{ fontSize: 13.5, fontWeight: on ? 600 : 500 }}>{s.name}</span>
            </button>
          );
        })}
        <div style={{ display: "flex", gap: 6, padding: "12px 10px 2px" }}>
          <Button variant="glass" size="sm" onClick={() => setStage((s) => Math.max(0, s - 1))} style={{ flex: 1 }}>← Prev</Button>
          <Button variant="primary" size="sm" onClick={() => setStage((s) => Math.min(STAGES.length - 1, s + 1))} style={{ flex: 1 }}>Next →</Button>
        </div>
      </nav>

      <MirrorFrame label={STAGES[stage].label}>{content}</MirrorFrame>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
