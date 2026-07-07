/* Fashini — Entrance screen. Landscape attract mode + try-on climax.
   Glanceable from distance; the reveal loops. Exposes window.EntranceAttract. */

const NS = window.FashiniDesignSystem_c28a45;
const { MicroLabel, PriceTag, TryOnStage } = NS;

const LOOK = [
  { name: "Structured wool blazer", price_yen: 21900 },
  { name: "Merino turtleneck", price_yen: 8900 },
  { name: "Slim tapered trouser", price_yen: 9900 }
];

function EntranceAttract() {
  const [phase, setPhase] = React.useState("idle");
  const [k, setK] = React.useState(0);
  const [showTotal, setShowTotal] = React.useState(false);

  // loop the reveal
  React.useEffect(() => {
    let alive = true;
    function cycle() {
      setPhase("idle"); setShowTotal(false); setK(x => x + 1);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!alive) return;
        setPhase("reveal");
        setTimeout(() => alive && setShowTotal(true), 2000);
      }));
    }
    cycle();
    const iv = setInterval(cycle, 6500);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const total = LOOK.reduce((a, p) => a + p.price_yen, 0);

  return (
    <div className="entrance">
      <header className="e-top">
        <div className="e-brand"><strong>FASHINI</strong><MicroLabel>AI Style Advisor</MicroLabel></div>
        <MicroLabel>Store 001 · Spring floor</MicroLabel>
      </header>

      <div className="e-grid">
        <section className="e-copy">
          <MicroLabel tone="accent">Live styling · スタイリング</MicroLabel>
          <h1 className="e-kinetic">
            <span className="line"><span>Step up.</span></span>
            <span className="line"><span>See the next</span></span>
            <span className="line"><span>look that fits.</span></span>
          </h1>
          <p className="e-lede">Fashini reads your outfit and body, checks live inventory, and styles three in-stock sets — in about thirty seconds.</p>
          <div className="e-tokens">
            <span>Body profile</span><span>Outfit vector</span><span>Inventory match</span>
          </div>
        </section>

        <section className="e-stage">
          <TryOnStage key={k} phase={phase} badge="Lucy · realtime" labelJa="スタイリング完了" labelEn="Styled.">
            <div className="efig"><div className="efig-head" /><div className="efig-body" /><div className="efig-legs" /></div>
          </TryOnStage>
        </section>
      </div>

      <footer className="e-foot">
        <div className="e-look">
          <MicroLabel tone="accent">Explicit need · Round 2</MicroLabel>
          <div className="e-items">
            {LOOK.map((p) => (
              <div className="e-item" key={p.name}>
                <span>{p.name}</span>
                <PriceTag amount={p.price_yen} size="md" />
              </div>
            ))}
          </div>
        </div>
        <div className={`e-total ${showTotal ? "in" : ""}`}>
          <MicroLabel>Set total</MicroLabel>
          {showTotal ? <PriceTag amount={total} size="xl" countUp /> : <PriceTag amount={0} size="xl" />}
        </div>
      </footer>
    </div>
  );
}
window.EntranceAttract = EntranceAttract;
