/* Fashini Magic Mirror — the ten stage screens (0–9). Gesture-first, glass over
   the live reflection, revealing as much of it as possible. Onboarding is
   stepped one decision per screen so the customer never has to juggle a form. */

const NS = window.FashiniMirrorDesignSystem_c521b8;
const {
  Button, GlassPanel, MicroLabel, PriceTag, Hairline, Icon,
  SegmentedControl, Stepper, LanguageSwitch, ConsentCheck, FeedbackTags,
  ControlPill, CameraChip, ToolStep, LookStrip,
  VoiceAura, GestureHint, LiveTranscript, TryOnReveal, GuidePet
} = NS;
const { Reflection, Scrims, MirrorFrame } = window;

/* ---- shared sample data (demo runs in Chinese, prices in ¥) ---- */
const LOOKS = [
  { id: "1", recType: "explicit_need", recLabel: "指定需求", totalYen: 40700, items: [
    { name: "结构感羊毛西装", category: "外套 · 藏青", colorHex: "#2b2f3a", price_yen: 21900 },
    { name: "美利奴高领衫", category: "上装 · 米白", colorHex: "#e7e3da", price_yen: 8900 },
    { name: "修身锥形西裤", category: "下装 · 炭灰", colorHex: "#3a3d47", price_yen: 9900 } ] },
  { id: "2", recType: "style", recLabel: "风格延伸", totalYen: 27800, items: [
    { name: "宽松衬衫外套", category: "外套 · 橄榄", colorHex: "#4a5240", price_yen: 15900 },
    { name: "纯棉圆领T恤", category: "上装 · 燕麦", colorHex: "#d9d5cc", price_yen: 3900 },
    { name: "直筒休闲长裤", category: "下装 · 深灰", colorHex: "#2e3138", price_yen: 8000 } ] },
  { id: "3", recType: "seasonal", recLabel: "当季精选", totalYen: 33600, items: [
    { name: "绗缝内胆外套", category: "外套 · 墨蓝", colorHex: "#1f2430", price_yen: 12800 },
    { name: "法兰绒衬衫", category: "上装 · 砖红", colorHex: "#6b3f3a", price_yen: 9900 },
    { name: "灯芯绒锥形裤", category: "下装 · 卡其", colorHex: "#5a4a36", price_yen: 10900 } ] }
];

/* ---- shared chrome ---- */
function BrandMark({ style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      <strong className="fashini-wordmark" style={{ fontSize: "clamp(15px, 4.2cqw, 22px)", lineHeight: 1 }}>FASHINI</strong>
      <MicroLabel>AI Style Advisor</MicroLabel>
    </div>
  );
}

// Top controls: back, camera source, gestures, fit, mute + language — all SVG icons.
function TopBar({ onBack, gesturesOn = true, lang = "zh", onLang, minimal = false }) {
  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, zIndex: 12,
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
      padding: "clamp(14px, 3.5cqw, 22px)"
    }}>
      <div style={{ display: "flex", gap: 8 }}>
        {onBack && <ControlPill icon={<Icon name="arrow-left" size={18} />} onClick={onBack} aria-label="Back" />}
        {!minimal && <ControlPill icon={<Icon name="camera" size={18} />} aria-label="Camera source" />}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {!minimal && <ControlPill icon={<Icon name="hand" size={18} />} active={gesturesOn} aria-label="Gestures" />}
        {!minimal && <ControlPill icon={<Icon name="expand" size={18} />} aria-label="Fit view" />}
        {!minimal && <ControlPill icon={<Icon name="volume" size={18} />} aria-label="Voice" />}
        <LanguageSwitch value={lang} onChange={onLang} />
      </div>
    </div>
  );
}

function CamNote({ style }) {
  return (
    <div style={{ position: "absolute", top: "clamp(58px, 13cqw, 78px)", left: "clamp(14px, 3.5cqw, 22px)", zIndex: 11, ...style }}>
      <CameraChip>摄像头开启 · 不会保存</CameraChip>
    </div>
  );
}

// A bottom-anchored frosted sheet (never full-screen).
function Sheet({ children, style }) {
  return (
    <GlassPanel variant="sheet" style={{
      position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 10,
      padding: "clamp(18px, 4.5cqw, 26px)",
      paddingBottom: "calc(clamp(18px, 4.5cqw, 26px) + env(safe-area-inset-bottom, 0px))",
      maxHeight: "66%", overflowY: "auto",
      animation: "fsh-sheet-rise var(--dur-slow) var(--ease-out) both",
      ...style
    }}>
      {children}
    </GlassPanel>
  );
}

const petCorner = { position: "absolute", right: "clamp(14px, 3.5cqw, 22px)", zIndex: 13 };

// Gesture hint presets (icon-based).
const HINT = {
  talk: { key: "talk", icon: "hand", label: "说话" },
  pick: { key: "pick", glyph: "1·2·3", label: "选择" },
  ok: { key: "confirm", icon: "thumbs-up", label: "确认" },
  back: { key: "back", icon: "fist", label: "返回" }
};

// A big, numbered, gesture-mappable option list (raise 1/2/3 to pick).
function OptionList({ options, value, onChange }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 16px", borderRadius: "var(--radius-control)", border: `1px solid ${on ? "var(--accent-bright)" : "var(--glass-hairline)"}`, background: on ? "var(--accent-tint)" : "var(--glass-inset-fill)", color: "var(--on-dark)", cursor: "pointer", textAlign: "left", transition: "background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)" }}>
            <span style={{ width: 30, height: 30, borderRadius: "50%", flex: "0 0 auto", display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, background: on ? "var(--accent)" : "transparent", color: on ? "var(--accent-ink)" : "var(--on-dark-2)", border: `1px solid ${on ? "var(--accent-bright)" : "var(--on-dark-line)"}` }}>{i + 1}</span>
            <span style={{ flex: 1, fontSize: 16, fontWeight: on ? 600 : 500 }}>{o.label}</span>
            {on && <span style={{ color: "var(--accent-bright)", display: "inline-flex" }}><Icon name="check" size={20} /></span>}
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   0 · ATTRACT / WELCOME
   ============================================================ */
function StageAttract() {
  return (
    <>
      <Reflection dim figure />
      <Scrims />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", padding: "clamp(14px, 3.5cqw, 22px)", zIndex: 12 }}>
        <BrandMark />
        <LanguageSwitch value="zh" onChange={() => {}} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 10, padding: "clamp(22px, 5.5cqw, 40px)", textAlign: "left" }}>
        <MicroLabel tone="accent">你的私人店内造型师</MicroLabel>
        <h1 className="kinetic" style={{ margin: "clamp(10px,2cqw,16px) 0", fontWeight: 800, letterSpacing: "var(--tracking-display)", lineHeight: 1.06, fontSize: "clamp(28px, 7.4cqw, 54px)", textWrap: "balance" }}>
          {["看见现在的你，", "找到更适合的", "下一套。"].map((l, i) => (
            <span key={i} style={{ display: "block", overflow: "hidden" }}>
              <span style={{ display: "block", animation: "fsh-line-rise var(--dur-choreo) var(--ease-out) both", animationDelay: `${i * 0.12}s` }}>{l}</span>
            </span>
          ))}
        </h1>
        <p style={{ margin: "0 0 clamp(18px,3cqw,28px)", color: "var(--on-dark-2)", fontSize: "clamp(14px, 3.4cqw, 19px)", maxWidth: "30ch", lineHeight: 1.5 }}>
          步入镜前，用一句话告诉我你的场合与风格，约 30 秒为你搭配三套现货。
        </p>
        <Button variant="primary" size="lg" iconRight={<span aria-hidden="true">→</span>}>步入镜前开始</Button>
        <div style={{ display: "flex", gap: "clamp(16px,4cqw,32px)", marginTop: "clamp(18px,3cqw,28px)", color: "var(--on-dark-2)", fontSize: "clamp(12px,3cqw,15px)" }}>
          {["约 30 秒", "无需注册", "语音 · 手势"].map((t) => <span key={t}>· {t}</span>)}
        </div>
      </div>
      <GuidePet visible mood="idle" style={{ ...petCorner, top: "clamp(70px, 16cqw, 110px)" }} message="你好呀，站到镜前就可以开始～" />
    </>
  );
}

/* ============================================================
   1 · CONSENT — raise 👍 (or tap) to agree; that turns the camera on
   ============================================================ */
function StageConsent({ agreed, setAgreed }) {
  return (
    <>
      <Reflection dim figure />
      <Scrims />
      <TopBar minimal lang="zh" onLang={() => {}} onBack={() => {}} />
      <Sheet>
        <MicroLabel>Step 01 · 隐私</MicroLabel>
        <h2 style={{ margin: "8px 0 6px", fontWeight: 700, letterSpacing: "var(--tracking-heading)", fontSize: "clamp(20px, 5.4cqw, 30px)" }}>先说清楚，再打开镜头。</h2>
        <p style={{ margin: "0 0 clamp(14px,3cqw,18px)", color: "var(--on-dark-2)", fontSize: "clamp(13px,3.2cqw,16px)", lineHeight: 1.55 }}>
          同意后，镜面会显示你的实时画面用于搭配。<strong style={{ color: "var(--on-dark)", fontWeight: 600 }}>画面不会被录制或保存</strong>，也不做人脸身份识别。
        </p>
        <div style={{ display: "flex", justifyContent: "center", margin: "clamp(6px,2cqw,14px) 0" }}>
          <GestureHint hints={[HINT.ok]} active="confirm" />
        </div>
        <Button variant="primary" size="lg" block onClick={() => setAgreed(true)}
          icon={<Icon name="thumbs-up" size={20} />} iconRight={<span aria-hidden="true">→</span>}>
          举手确认，或点这里开启镜面
        </Button>
        <p style={{ margin: "12px 0 0", textAlign: "center", color: "var(--on-dark-3)", fontSize: 12 }}>
          {agreed ? "已同意 · 正在开启镜面…" : "同意即代表你已阅读隐私说明"}
        </p>
      </Sheet>
    </>
  );
}

/* ============================================================
   2 · PROFILE — a step-by-step gesture wizard (one decision per screen)
   gender → age → height (voice) → weight (select)
   ============================================================ */
function StageProfile({ profile, setProfile, amp = 0.4, onDone }) {
  const [step, setStep] = React.useState(0);
  const total = 4;
  const genders = [{ value: "female", label: "女性" }, { value: "male", label: "男性" }, { value: "neutral", label: "中性 / 不限定" }];
  const ages = [{ value: "18–25", label: "18 – 25 岁" }, { value: "26–35", label: "26 – 35 岁" }, { value: "36–45", label: "36 – 45 岁" }, { value: "46+", label: "46 岁以上" }];
  const weights = [{ value: "<50", label: "50 kg 以下" }, { value: "50-60", label: "50 – 60 kg" }, { value: "60-70", label: "60 – 70 kg" }, { value: "70-80", label: "70 – 80 kg" }, { value: "80+", label: "80 kg 以上" }];
  const titles = ["你的性别呈现？", "你的年龄段？", "说出你的身高", "选择体重区间"];
  const set = (k, v) => setProfile({ ...profile, [k]: v });
  const next = () => (step < total - 1 ? setStep(step + 1) : onDone && onDone());
  const prev = () => setStep(Math.max(0, step - 1));

  return (
    <>
      <Reflection figure />
      <Scrims />
      <TopBar onBack={() => {}} lang="zh" onLang={() => {}} />
      <CamNote />
      <Sheet>
        {/* progress dots */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: i <= step ? "var(--accent-bright)" : "var(--on-dark-line)", transition: "background var(--dur-base) var(--ease-out)" }} />
          ))}
        </div>
        <MicroLabel>Step 02 · 资料 · {step + 1}/{total}</MicroLabel>
        <h2 style={{ margin: "8px 0 clamp(14px,3cqw,18px)", fontWeight: 700, letterSpacing: "var(--tracking-heading)", fontSize: "clamp(20px, 5.4cqw, 30px)" }}>{titles[step]}</h2>

        {step === 0 && <OptionList options={genders} value={profile.gender} onChange={(v) => set("gender", v)} />}
        {step === 1 && <OptionList options={ages} value={profile.age} onChange={(v) => set("age", v)} />}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "6px 0 2px" }}>
            <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
              <VoiceAura state="listening" amplitude={amp} size={150} style={{ position: "absolute" }} />
              <button type="button" aria-label="语音输入身高" style={{ position: "relative", width: 64, height: 64, borderRadius: "50%", border: 0, background: "var(--accent)", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer", boxShadow: "0 12px 34px -8px var(--accent-glow)" }}><Icon name="mic" size={26} /></button>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 46, letterSpacing: "-0.03em" }}>{profile.height}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, color: "var(--on-dark-2)" }}>cm</span>
            </div>
            <div style={{ color: "var(--on-dark-2)", fontSize: 13 }}>说出你的身高，例如「一米七三」</div>
          </div>
        )}
        {step === 3 && <OptionList options={weights} value={profile.weightBand} onChange={(v) => set("weightBand", v)} />}

        <div style={{ display: "flex", justifyContent: "center", margin: "16px 0 4px" }}>
          <GestureHint hints={step === 2 ? [HINT.talk, HINT.ok] : [HINT.pick, HINT.ok]} active="confirm" />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          {step > 0 && <Button variant="glass" size="lg" onClick={prev} icon={<Icon name="arrow-left" size={18} />} style={{ flex: "0 0 auto" }} />}
          <Button variant="primary" size="lg" onClick={next} iconRight={<span aria-hidden="true">→</span>} style={{ flex: 1 }}>
            {step < total - 1 ? "下一步" : "开始搭配"}
          </Button>
        </div>
      </Sheet>
      <GuidePet visible mood={step === 2 ? "listening" : "talking"} style={{ ...petCorner, top: "clamp(70px, 16cqw, 110px)" }} message={step === 2 ? "说出身高就好，我来记录～" : "一个个来，不着急。"} />
    </>
  );
}

/* ============================================================
   3 · MIRROR · IDLE — voice-first, maximum reflection
   ============================================================ */
function StageIdle() {
  return (
    <>
      <Reflection figure />
      <Scrims bottom={false} />
      <TopBar onBack={() => {}} lang="zh" onLang={() => {}} />
      <CamNote />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: "clamp(28px, 7cqw, 54px)", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
          <VoiceAura state="idle" size={220} style={{ position: "absolute" }} />
          <button style={{ position: "relative", width: 76, height: 76, borderRadius: "50%", border: 0, background: "var(--accent)", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer", boxShadow: "0 12px 34px -8px var(--accent-glow)" }} aria-label="Tap to talk"><Icon name="mic" size={30} /></button>
        </div>
        <div style={{ color: "#fff", fontSize: "clamp(13px,3.2cqw,16px)", textShadow: "0 1px 8px rgba(0,0,0,0.7)" }}>点一下或说「你好」告诉我你想要什么</div>
        <GestureHint quiet />
        <button style={{ border: 0, background: "none", color: "var(--on-dark-2)", fontSize: 13, cursor: "pointer", textShadow: "0 1px 8px rgba(0,0,0,0.7)" }}>直接帮我挑 →</button>
      </div>
      <GuidePet visible mood="idle" style={{ ...petCorner, top: "clamp(70px, 16cqw, 110px)" }} message="想去什么场合？或想要什么风格？" />
    </>
  );
}

/* ============================================================
   4 · MIRROR · LISTENING (STT)
   ============================================================ */
function StageListening({ amp }) {
  return (
    <>
      <Reflection figure />
      <Scrims bottom={false} />
      <TopBar onBack={() => {}} lang="zh" onLang={() => {}} />
      <CamNote />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: "clamp(28px, 7cqw, 54px)", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, padding: "0 clamp(16px,4cqw,28px)" }}>
        <LiveTranscript listening text="明天要参加朋友的婚礼" interim="想要优雅一点" />
        <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
          <VoiceAura state="listening" amplitude={amp} size={240} style={{ position: "absolute" }} />
          <button style={{ position: "relative", width: 76, height: 76, borderRadius: "50%", border: 0, background: "#e5484d", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer", boxShadow: "0 12px 34px -8px rgba(229,72,77,0.6)" }} aria-label="Listening"><Icon name="mic" size={30} /></button>
        </div>
        <div style={{ color: "#fff", fontSize: "clamp(13px,3.2cqw,16px)", textShadow: "0 1px 8px rgba(0,0,0,0.7)" }}>正在聆听… 说完点一下发送</div>
      </div>
      <GuidePet visible mood="listening" style={{ ...petCorner, top: "clamp(70px, 16cqw, 110px)" }} message="我在听，请说～" />
    </>
  );
}

/* ============================================================
   5 · MIRROR · WORKING — three progressive tool-step pills
   ============================================================ */
function StageWorking({ step }) {
  const steps = ["正在读取身型模板…", "搜索店内现货…", "为你搭配三套…"];
  return (
    <>
      <Reflection figure />
      <Scrims bottom={false} />
      <TopBar onBack={() => {}} lang="zh" onLang={() => {}} />
      <CamNote />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: "clamp(30px, 8cqw, 60px)", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        {steps.map((label, i) => (
          <ToolStep key={label} label={label} index={i} done={i < step} />
        ))}
      </div>
      <GuidePet visible mood="working" style={{ ...petCorner, top: "clamp(70px, 16cqw, 110px)" }} message="正在为你挑选合适的搭配…" />
    </>
  );
}

Object.assign(window, {
  LOOKS, BrandMark, TopBar, CamNote, Sheet, petCorner, OptionList, HINT,
  StageAttract, StageConsent, StageProfile, StageIdle, StageListening, StageWorking
});
