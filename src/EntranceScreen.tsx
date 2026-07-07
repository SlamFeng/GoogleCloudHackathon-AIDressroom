import { useEffect, useState } from "react";
import "./design/screens/entrance.css";
import { MicroLabel } from "./design/components/core/MicroLabel";
import { PriceTag } from "./design/components/core/PriceTag";
import { TryOnStage } from "./design/components/tryon/TryOnStage";

// Attract-mode is a glanceable loop (no live session); a representative look
// stands in for the recommendation the agent would surface.
const LOOK = [
  { name: "Structured wool blazer", price_yen: 21900 },
  { name: "Merino turtleneck", price_yen: 8900 },
  { name: "Slim tapered trouser", price_yen: 9900 }
];

/**
 * Fashini entrance big-screen — the attract / climax layer. Same white system
 * as the operate screens, full-bleed, with the signature try-on reveal looping
 * (~6.5s) alongside a count-up set total. Honors prefers-reduced-motion.
 */
export function EntranceScreen() {
  const [phase, setPhase] = useState<"idle" | "reveal">("idle");
  const [cycleKey, setCycleKey] = useState(0);
  const [showTotal, setShowTotal] = useState(false);

  useEffect(() => {
    let alive = true;
    function cycle() {
      setPhase("idle");
      setShowTotal(false);
      setCycleKey((x) => x + 1);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!alive) return;
          setPhase("reveal");
          window.setTimeout(() => {
            if (alive) setShowTotal(true);
          }, 2000);
        })
      );
    }
    cycle();
    const interval = window.setInterval(cycle, 6500);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, []);

  const total = LOOK.reduce((sum, product) => sum + product.price_yen, 0);

  return (
    <div className="entrance">
      <header className="e-top">
        <div className="e-brand">
          <strong>FASHINI</strong>
          <MicroLabel>AI Style Advisor</MicroLabel>
        </div>
        <MicroLabel>Store 001 · Spring floor</MicroLabel>
      </header>

      <div className="e-grid">
        <section className="e-copy">
          <MicroLabel tone="accent">Live styling · スタイリング</MicroLabel>
          <h1 className="e-kinetic">
            <span className="line">
              <span>Step up.</span>
            </span>
            <span className="line">
              <span>See the next</span>
            </span>
            <span className="line">
              <span>look that fits.</span>
            </span>
          </h1>
          <p className="e-lede">
            Fashini reads your outfit and body, checks live inventory, and styles three in-stock
            sets — in about thirty seconds.
          </p>
          <div className="e-tokens">
            <span>Body profile</span>
            <span>Outfit vector</span>
            <span>Inventory match</span>
          </div>
        </section>

        <section className="e-stage">
          <TryOnStage
            key={cycleKey}
            phase={phase}
            badge="Lucy · realtime"
            labelJa="スタイリング完了"
            labelEn="Styled."
          >
            <div className="efig">
              <div className="efig-head" />
              <div className="efig-body" />
              <div className="efig-legs" />
            </div>
          </TryOnStage>
        </section>
      </div>

      <footer className="e-foot">
        <div className="e-look">
          <MicroLabel tone="accent">Explicit need · Round 2</MicroLabel>
          <div className="e-items">
            {LOOK.map((product) => (
              <div className="e-item" key={product.name}>
                <span>{product.name}</span>
                <PriceTag amount={product.price_yen} size="md" />
              </div>
            ))}
          </div>
        </div>
        <div className={`e-total ${showTotal ? "in" : ""}`}>
          <MicroLabel>Set total</MicroLabel>
          {showTotal ? (
            <PriceTag amount={total} size="xl" countUp />
          ) : (
            <PriceTag amount={0} size="xl" />
          )}
        </div>
      </footer>
    </div>
  );
}
