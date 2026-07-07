/* Fashini — Staff iPad console. Assisted-selling control plane.
   Composes design-system components; fake agent progression for the demo.
   Exposes window.StaffConsole. */

const NS = window.FashiniDesignSystem_c28a45;
const { Button, MicroLabel, PriceTag, Hairline, StatusBadge, PrivacyChip,
  SegmentedControl, LanguageSwitch, FeedbackTags,
  RecommendationCard, ToolCallTrace, AhaTimeline, ConstraintDelta, TryOnStage } = NS;

const now = () => new Date().toISOString();

const SETS_R1 = [
  {
    set_id: "set_a1", round: 1, rec_type: "explicit_need",
    reason: "A smart-casual set in your navy palette — a tailored blazer sharpens the loose silhouette you arrived in.",
    products: [
      { product_id: "p1", name: "Wool-blend tailored blazer", category: "outerwear", price_yen: 18900, colors: ["Navy"], fit: "tailored" },
      { product_id: "p2", name: "Fine merino crew knit", category: "top", price_yen: 7900, colors: ["Off-white"], fit: "regular" },
      { product_id: "p3", name: "Slim tapered trouser", category: "bottom", price_yen: 9900, colors: ["Charcoal"], fit: "slim" }
    ]
  },
  {
    set_id: "set_b2", round: 1, rec_type: "similar",
    reason: "Close to what you're wearing now, upgraded in fabric — an easy yes if you like to stay in your lane.",
    products: [
      { product_id: "p4", name: "Cotton overshirt", category: "outerwear", price_yen: 12900, colors: ["Stone"], fit: "relaxed" },
      { product_id: "p5", name: "Ribbed long-sleeve tee", category: "top", price_yen: 4900, colors: ["Black"], fit: "regular" },
      { product_id: "p6", name: "Straight-leg denim", category: "bottom", price_yen: 8900, colors: ["Indigo"], fit: "straight" }
    ]
  },
  {
    set_id: "set_c3", round: 1, rec_type: "seasonal",
    reason: "A seasonal push: lighter layers for the store's spring floor set, still grounded in neutrals.",
    products: [
      { product_id: "p7", name: "Unstructured linen jacket", category: "outerwear", price_yen: 15900, colors: ["Sand"], fit: "relaxed" },
      { product_id: "p8", name: "Silk-touch camisole", category: "top", price_yen: 5900, colors: ["Ivory"], fit: "regular" },
      { product_id: "p9", name: "Pleated wide trouser", category: "bottom", price_yen: 11900, colors: ["Olive"], fit: "wide" }
    ]
  }
];

const SETS_R2 = [
  {
    set_id: "set_a4", round: 2, rec_type: "explicit_need",
    reason: "Re-run with fit=tailored preferred and red avoided. Same navy direction, tighter through the body.",
    products: [
      { product_id: "p10", name: "Structured wool blazer", category: "outerwear", price_yen: 21900, colors: ["Navy"], fit: "tailored" },
      { product_id: "p11", name: "Merino turtleneck", category: "top", price_yen: 8900, colors: ["Grey"], fit: "slim" },
      { product_id: "p12", name: "Slim tapered trouser", category: "bottom", price_yen: 9900, colors: ["Charcoal"], fit: "slim" }
    ]
  },
  {
    set_id: "set_d5", round: 2, rec_type: "style",
    reason: "A sharper monochrome take on the same brief, for when precision matters more than softness.",
    products: [
      { product_id: "p13", name: "Double-faced coat", category: "outerwear", price_yen: 28900, colors: ["Ink"], fit: "tailored" },
      { product_id: "p14", name: "Fine-gauge knit", category: "top", price_yen: 9900, colors: ["Off-white"], fit: "slim" },
      { product_id: "p15", name: "Cropped cigarette trouser", category: "bottom", price_yen: 12900, colors: ["Black"], fit: "slim" }
    ]
  }
];

function toolCallsFor(stage) {
  const base = [
    { tool: "classify_route", input: { text: "recommend three sets" }, output: { status: "success", route: "recommendation" }, called_at: now() },
    { tool: "match_body_template", input: { height_cm: 168, weight_kg: 58 }, output: { status: "success", template_id: "tpl_07" }, called_at: now() },
    { tool: "get_recommendations", input: { route: "recommendation", round: 1 }, output: { status: "success", sets: 3 }, called_at: now() },
    { tool: "check_inventory", input: { store_id: "store_001", skus: 9 }, output: { status: "held", reserved: 9 }, called_at: now() }
  ];
  if (stage === "refined" || stage === "confirmed" || stage === "handoff") {
    base.push(
      { tool: "apply_feedback", input: { dimension: "fit", value: "too_loose" }, output: { status: "success", delta: 2 }, called_at: now() },
      { tool: "get_recommendations", input: { route: "recommendation", round: 2 }, output: { status: "success", sets: 2 }, called_at: now() }
    );
  }
  if (stage === "confirmed" || stage === "handoff") {
    base.push({ tool: "reserve_items", input: { set_id: "set_a4" }, output: { ok: true, hold_min: 30 }, called_at: now() });
  }
  if (stage === "handoff") {
    base.push({ tool: "tryon_handoff", input: { set_id: "set_a4", use_own_face: false }, output: { ok: true, template_id: "tpl_07" }, called_at: now() });
  }
  return base;
}

function StaffConsole() {
  const [lang, setLang] = React.useState("en");
  const [stage, setStage] = React.useState("idle"); // idle | recommended | refined | previewing | confirmed | handoff
  const [need, setNeed] = React.useState("Something sharper for work — I don't love how loose this feels.");
  const [sets, setSets] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  const [round, setRound] = React.useState(0);
  const [phase, setPhase] = React.useState("idle");
  const [tryKey, setTryKey] = React.useState(0);
  const [feedback, setFeedback] = React.useState(null);

  const statusMap = {
    idle: "communicating", recommended: "recommending", refined: "recommending",
    previewing: "previewing", confirmed: "confirmed", handoff: "handoff_ready"
  };
  const ahaStage = { previewing: "lucy_preview", confirmed: "google_generating", handoff: "handoff_ready" }[stage] || "idle";

  function recommend() {
    setSets(SETS_R1); setSelected("set_a1"); setRound(1); setStage("recommended"); setFeedback(null);
  }
  function giveFeedback(tag) {
    setFeedback(tag.dimension);
    setSets(SETS_R2); setSelected("set_a4"); setRound(2); setStage("refined"); setPhase("idle");
  }
  function preview() {
    setStage("previewing"); setPhase("idle"); setTryKey(k => k + 1);
    requestAnimationFrame(() => requestAnimationFrame(() => setPhase("reveal")));
  }
  function confirm() { setStage("confirmed"); setTimeout(() => setStage("handoff"), 1400); }

  const selectedSet = sets.find(s => s.set_id === selected);
  const toolCalls = stage === "idle" ? [] : toolCallsFor(stage);

  return (
    <div className="ipad">
      {/* Top bar */}
      <header className="ipad-top">
        <div className="ipad-brand">
          <strong>FASHINI</strong>
          <MicroLabel>Staff · store_001</MicroLabel>
        </div>
        <div className="ipad-status">
          <StatusBadge label="agent" value={statusMap[stage]} />
          <StatusBadge label="route" value={stage === "idle" ? "unclear" : "recommendation"} active={stage !== "idle"} />
          <StatusBadge label="round" value={round} />
          <StatusBadge label="lucy" value={phase === "reveal" ? "previewing" : "idle"} />
        </div>
        <div className="ipad-top-right">
          <LanguageSwitch value={lang} onChange={setLang} />
          <Button variant="secondary" size="sm">Staff takeover</Button>
        </div>
      </header>

      <div className="ipad-grid">
        {/* Left — recommendations + feedback */}
        <section className="ipad-left">
          <div className="need-row">
            <div className="need-input">
              <MicroLabel>Customer need</MicroLabel>
              <textarea value={need} onChange={e => setNeed(e.target.value)} rows={2} />
            </div>
            <Button variant="primary" size="lg" iconRight={<span>→</span>} onClick={recommend}>
              {round === 0 ? "Recommend" : "Re-run"}
            </Button>
          </div>

          <div className="rec-list">
            {sets.length === 0 ? (
              <div className="empty">
                <MicroLabel>No recommendation sets yet</MicroLabel>
                <p>Capture a customer need and run the agent to see three in-stock sets materialize here.</p>
              </div>
            ) : sets.map((s, i) => (
              <RecommendationCard key={s.set_id} set={s} index={i}
                selected={s.set_id === selected}
                onSelect={() => setSelected(s.set_id)}
                onPreview={preview}
                onConfirm={confirm} />
            ))}
          </div>

          {sets.length > 0 && (
            <div className="feedback-bar">
              <MicroLabel>Feedback</MicroLabel>
              <FeedbackTags active={feedback} onSelect={giveFeedback} />
            </div>
          )}
        </section>

        {/* Right — preview + evidence */}
        <aside className="ipad-right">
          <div className="preview-block">
            <TryOnStage key={tryKey} phase={phase} badge="Lucy · realtime"
              idleHint={selectedSet ? "Tap Preview on a set to try it on." : "Select a set to preview."}>
              <div className="fig"><div className="fig-head" /><div className="fig-body" /><div className="fig-legs" /></div>
            </TryOnStage>
            {selectedSet && (
              <div className="preview-meta">
                <div>
                  <MicroLabel tone="accent">{selectedSet.rec_type.replace("_"," ")}</MicroLabel>
                  <span className="mono-sm">{selectedSet.set_id}</span>
                </div>
                <PriceTag amount={selectedSet.products.reduce((a,p)=>a+p.price_yen,0)} size="md" />
              </div>
            )}
          </div>

          <AhaTimeline stage={ahaStage}
            narrative={stage === "handoff"
              ? "Look confirmed and reserved. Try-on handoff payload is ready for image generation."
              : stage === "previewing"
              ? "Lucy realtime preview running on the mirror. Awaiting confirmation."
              : "Agent runtime is waiting for the first customer action."} />

          {stage === "refined" || stage === "confirmed" || stage === "handoff" ? (
            <ConstraintDelta
              prefer={[{ dimension: "fit", value: "tailored", reason: "was too loose" }]}
              avoid={feedback === "color" ? [{ dimension: "color", value: "red", reason: "disliked" }] : []}
              budgetYen={45000} />
          ) : null}

          <ToolCallTrace toolCalls={toolCalls} />

          {stage === "handoff" && (
            <div className="pickup">
              <MicroLabel>Purchase · in-store pickup route</MicroLabel>
              <ol className="route">
                <li><span>01</span> Reserved at register — hold 30 min</li>
                <li><span>02</span> Fitting room 3 → staff brings set_a4</li>
                <li><span>03</span> Pickup counter B · floor 2</li>
              </ol>
              <Button variant="primary" size="lg" block iconRight={<span>→</span>}>Confirm &amp; reserve</Button>
            </div>
          )}
          <div className="privacy-foot">
            <PrivacyChip>Measurements not retained · face use consent-gated</PrivacyChip>
          </div>
        </aside>
      </div>
    </div>
  );
}

window.StaffConsole = StaffConsole;
