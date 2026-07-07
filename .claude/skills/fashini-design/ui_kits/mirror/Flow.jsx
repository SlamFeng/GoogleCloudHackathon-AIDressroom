/* Fashini — Mirror. Vertical self-service capture + styling flow.
   Composes design-system components; steps through the real App flow.
   Exposes window.MirrorFlow. */

const NS = window.FashiniDesignSystem_c28a45;
const { Button, MicroLabel, PriceTag, Hairline, PrivacyChip,
  SegmentedControl, NumberField, Checkbox, LanguageSwitch, TryOnStage } = NS;

const STEPS = ["welcome", "consent", "profile", "capture", "analyzing", "review", "complete"];

function MirrorFlow() {
  const [lang, setLang] = React.useState("en");
  const [step, setStep] = React.useState("welcome");
  const [profile, setProfile] = React.useState({ height_cm: 168, weight_kg: 58, gender: "neutral", age: "26-35" });
  const [cam, setCam] = React.useState(false);
  const [proc, setProc] = React.useState(false);
  const [count, setCount] = React.useState(null);
  const [phase, setPhase] = React.useState("idle");

  const idx = STEPS.indexOf(step);
  const progress = Math.min(100, (idx / (STEPS.length - 2)) * 100);
  const go = (s) => setStep(s);

  // capture countdown
  React.useEffect(() => {
    if (step !== "capture") { setCount(null); return; }
    setCount(3);
    const t = setInterval(() => setCount(c => (c === null ? null : c - 1)), 900);
    return () => clearInterval(t);
  }, [step]);
  React.useEffect(() => { if (count === 0) { const t = setTimeout(() => go("analyzing"), 500); return () => clearTimeout(t); } }, [count]);
  React.useEffect(() => {
    if (step === "analyzing") { const t = setTimeout(() => go("review"), 2600); return () => clearTimeout(t); }
    if (step === "review") { setPhase("idle"); requestAnimationFrame(() => requestAnimationFrame(() => setPhase("reveal"))); }
  }, [step]);

  return (
    <div className="mirror">
      <header className="m-top">
        <div className="m-brand"><strong>FASHINI</strong><MicroLabel>AI Style Advisor</MicroLabel></div>
        <LanguageSwitch value={lang} onChange={setLang} />
      </header>
      {step !== "welcome" && step !== "complete" && (
        <div className="m-progress"><span style={{ width: `${progress}%` }} /></div>
      )}

      <div className="m-body">
        {step === "welcome" && (
          <section className="m-welcome">
            <MicroLabel>Your personal store stylist</MicroLabel>
            <h1 className="kinetic"><span className="line"><span>See your current style,</span></span><span className="line"><span>find the next look</span></span><span className="line"><span>that fits.</span></span></h1>
            <p className="m-lede">Step in front of the mirror. Fashini reads your outfit signals and body proportions, then matches better options from real in-store inventory.</p>
            <Button variant="primary" size="lg" iconRight={<span>→</span>} onClick={() => go("consent")}>Start experience</Button>
            <div className="m-trust"><span>About 30 sec</span><span>No signup</span><span>Editable result</span></div>
          </section>
        )}

        {step === "consent" && (
          <section className="m-panel">
            <MicroLabel>Step 01 · Privacy</MicroLabel>
            <h2>Clear consent before the camera opens.</h2>
            <p className="m-intro">We capture one front-facing full-body photo only after you agree, and use it for this styling analysis.</p>
            <div className="m-consent-cards">
              {[["Only one shot","No background recording, no face identity recognition."],
                ["This session only","Used to generate body and outfit features."],
                ["Deleted after","Not written to public logs or permanent links."]].map(([t,d],i)=>(
                <article key={t}><span>{String(i+1).padStart(2,"0")}</span><h3>{t}</h3><p>{d}</p></article>
              ))}
            </div>
            <Checkbox checked={cam} onChange={setCam}>I agree to enable the camera and capture one front-facing full-body photo.</Checkbox>
            <Checkbox checked={proc} onChange={setProc}>I agree that AI may analyze the photo this session; results may be approximate.</Checkbox>
            <div className="m-actions"><Button variant="text" onClick={()=>go("welcome")}>← Back</Button><Button variant="primary" size="lg" disabled={!cam||!proc} iconRight={<span>→</span>} onClick={()=>go("profile")}>Agree and continue</Button></div>
          </section>
        )}

        {step === "profile" && (
          <section className="m-panel">
            <MicroLabel>Step 02 · Profile</MicroLabel>
            <h2>Give visual analysis a real scale.</h2>
            <p className="m-intro">Height and weight calibrate the image. You choose age range and gender presentation; AI won't infer them.</p>
            <div className="m-form">
              <label><span className="fl">Height</span><NumberField value={profile.height_cm} onChange={v=>setProfile({...profile,height_cm:v})} unit="cm" /></label>
              <label><span className="fl">Weight</span><NumberField value={profile.weight_kg} onChange={v=>setProfile({...profile,weight_kg:v})} unit="kg" /></label>
            </div>
            <div className="fl2">Gender presentation</div>
            <SegmentedControl size="lg" value={profile.gender} onChange={v=>setProfile({...profile,gender:v})}
              options={[{value:"female",label:"Feminine"},{value:"male",label:"Masculine"},{value:"neutral",label:"Neutral"}]} />
            <div className="fl2">Age range</div>
            <SegmentedControl size="lg" value={profile.age} onChange={v=>setProfile({...profile,age:v})} options={["18-25","26-35","36-45","46+"]} />
            <div className="m-actions"><Button variant="text" onClick={()=>go("consent")}>← Back</Button><Button variant="primary" size="lg" iconRight={<span>→</span>} onClick={()=>go("capture")}>Ready to capture</Button></div>
          </section>
        )}

        {step === "capture" && (
          <section className="m-capture">
            <MicroLabel>Step 03 · Capture</MicroLabel>
            <h2>Step into the frame.</h2>
            <div className="cam">
              <div className={`guide ${count!==null&&count<=2?"ready":""}`}>
                <span className="c tl" /><span className="c tr" /><span className="c bl" /><span className="c br" />
              </div>
              {count!==null && count>0 && <div className="countdown">{count}</div>}
              <div className="cam-status"><span className={`sl ${count!==null&&count<=2?"ready":""}`} />Hold still — auto capture</div>
            </div>
            <div className="m-actions"><Button variant="text" onClick={()=>go("profile")}>← Back to profile</Button><Button variant="ghost" size="lg" onClick={()=>go("analyzing")}>Manual capture</Button></div>
          </section>
        )}

        {step === "analyzing" && (
          <section className="m-analyzing">
            <MicroLabel>Analyzing</MicroLabel>
            <h2>Reading outfit signals…</h2>
            <TryOnStage phase="reveal" badge="OOTD scan" labelJa="解析中" labelEn="Analyzing">
              <div className="afig"><div className="afig-head" /><div className="afig-body" /></div>
            </TryOnStage>
            <p className="m-note">Body handling is template-based; exact measurements are not stored or shared.</p>
          </section>
        )}

        {step === "review" && (
          <section className="m-review">
            <MicroLabel>Step 04 · OOTD</MicroLabel>
            <h2>Today's OOTD breakdown</h2>
            <div className="review-grid">
              <TryOnStage phase={phase} badge="Full look">
                <div className="afig"><div className="afig-head" /><div className="afig-body" /></div>
              </TryOnStage>
              <div className="ootd-side">
                <div className="ootd-facts">
                  <div><MicroLabel>Style signals</MicroLabel><strong>Smart casual · Navy</strong></div>
                  <div><MicroLabel>Silhouette</MicroLabel><strong>Balanced</strong></div>
                </div>
                <div className="ootd-items">
                  {[["Top","Ribbed knit","Off-white · regular"],["Bottom","Straight denim","Indigo · straight"],["Shoes","Leather sneaker","White"]].map(([slot,name,meta])=>(
                    <div className="ootd-item" key={slot}><MicroLabel>{slot}</MicroLabel><strong>{name}</strong><span>{meta}</span></div>
                  ))}
                </div>
                <div className="privacy-panel">
                  <MicroLabel>Measurements not retained</MicroLabel>
                  <p>Shoulder, inseam, bust, waist, hip and foot length are used only in-session and never shown or stored.</p>
                  <PrivacyChip>Template-based body handling</PrivacyChip>
                </div>
              </div>
            </div>
            <div className="m-actions"><Button variant="ghost" size="lg" onClick={()=>go("capture")}>Use another photo</Button><Button variant="primary" size="lg" iconRight={<span>→</span>} onClick={()=>go("complete")}>Use this OOTD</Button></div>
          </section>
        )}

        {step === "complete" && (
          <section className="m-complete">
            <div className="mark">✓</div>
            <MicroLabel>Handoff ready</MicroLabel>
            <h2>Sent to the styling agent.</h2>
            <p className="m-intro">A stylist can now ask about occasion, budget and style — and preview looks on this mirror.</p>
            <div className="m-summary">
              <div><MicroLabel>Body contract</MicroLabel><span className="mono">v1.2</span></div>
              <div><MicroLabel>Outfit contract</MicroLabel><span className="mono">v1.0</span></div>
              <div><MicroLabel>Detected items</MicroLabel><span className="mono">3</span></div>
            </div>
            <Button variant="primary" size="lg" onClick={()=>go("welcome")}>Start new session</Button>
          </section>
        )}
      </div>
    </div>
  );
}
window.MirrorFlow = MirrorFlow;
