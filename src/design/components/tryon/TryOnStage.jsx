import React from "react";

let injected = false;
function useStyles() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-fashini", "tryon");
  el.textContent = `
    .fsh-tryon {
      position: relative;
      overflow: hidden;
      background: var(--inset);
      border: 1px solid var(--hairline);
      border-radius: var(--radius-card);
      isolation: isolate;
    }
    .fsh-tryon__figure { position: absolute; inset: 0; display: grid; place-items: center; }
    .fsh-tryon__figure img { width: 100%; height: 100%; object-fit: cover; display: block; }
    /* Recommended outfit fills in behind the scan line: clip grows top→bottom */
    .fsh-tryon[data-phase="reveal"] .fsh-tryon__reveal {
      animation: fsh-tryon-clip var(--dur-choreo) var(--ease-out) both;
    }
    .fsh-tryon__reveal { position: absolute; inset: 0; clip-path: inset(0 0 100% 0); }
    @keyframes fsh-tryon-clip { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0 0 0 0); } }

    /* Thin accent scan-line sweeps top→bottom */
    .fsh-tryon__scan {
      position: absolute; left: 0; right: 0; height: 2px;
      background: var(--accent);
      box-shadow: 0 0 16px 3px rgba(27,43,216,0.5);
      opacity: 0;
    }
    .fsh-tryon[data-phase="reveal"] .fsh-tryon__scan {
      animation: fashini-scan-sweep var(--dur-choreo) var(--ease-out) both;
    }

    /* Soft fabric shimmer passes after the sweep */
    .fsh-tryon__shimmer {
      position: absolute; inset: 0; pointer-events: none; opacity: 0;
      background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%);
      background-size: 220% 100%;
      mix-blend-mode: screen;
    }
    .fsh-tryon[data-phase="reveal"] .fsh-tryon__shimmer {
      animation: fashini-fabric-shimmer 0.7s var(--ease-out) 0.75s both, fsh-tryon-fade 0.7s 0.75s both;
    }
    @keyframes fsh-tryon-fade { 0% { opacity: 0; } 30% { opacity: 1; } 100% { opacity: 0; } }

    /* "スタイリング完了 / Styled." label rises at the end */
    .fsh-tryon__label {
      position: absolute; left: 18px; bottom: 18px;
      display: inline-flex; align-items: baseline; gap: 10px;
      padding: 10px 16px;
      background: var(--surface);
      border: 1px solid var(--hairline);
      border-radius: var(--radius-control);
      box-shadow: var(--shadow-lift);
      opacity: 0;
    }
    .fsh-tryon[data-phase="reveal"] .fsh-tryon__label {
      animation: fashini-label-rise var(--dur-slow) var(--ease-out) 0.95s both;
    }
    .fsh-tryon__label .ja { font-size: 13px; font-weight: 600; color: var(--muted); letter-spacing: 0.02em; }
    .fsh-tryon__label .en { font-size: 15px; font-weight: 700; color: var(--ink); letter-spacing: -0.01em; }

    .fsh-tryon__badge {
      position: absolute; top: 16px; left: 16px;
      font-family: var(--font-sans); font-size: 10px; font-weight: 600;
      letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
      background: var(--surface); border: 1px solid var(--hairline);
      padding: 5px 10px; border-radius: var(--radius-pill);
    }
    .fsh-tryon__idle { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; color: var(--muted); font-size: 13px; padding: 20px; }
  `;
  document.head.appendChild(el);
}

/**
 * Realtime try-on stage (Lucy). The signature climax: a thin accent scan-line
 * sweeps top→bottom, the recommended outfit fills in behind it, a soft fabric
 * shimmer passes, and a "スタイリング完了 / Styled." label rises.
 *
 * phase: "idle" (waiting) · "reveal" (play the choreographed sequence).
 * Provide `baseSrc` (current figure) and `outfitSrc` (recommended look), or
 * pass children for a custom figure. Honors prefers-reduced-motion.
 */
export function TryOnStage({
  phase = "idle",
  baseSrc,
  outfitSrc,
  badge = "Lucy · realtime",
  labelJa = "スタイリング完了",
  labelEn = "Styled.",
  idleHint = "Waiting for the selected outfit.",
  children,
  style,
  ...rest
}) {
  useStyles();
  return (
    <div className="fsh-tryon" data-phase={phase} style={{ aspectRatio: "3 / 4", ...style }} {...rest}>
      <span className="fsh-tryon__badge">{badge}</span>

      <div className="fsh-tryon__figure">
        {baseSrc ? <img src={baseSrc} alt="" /> : children}
      </div>

      {(outfitSrc || children) && (
        <div className="fsh-tryon__reveal">
          {outfitSrc ? <div className="fsh-tryon__figure"><img src={outfitSrc} alt="" /></div> : children}
        </div>
      )}

      <div className="fsh-tryon__shimmer" />
      <div className="fsh-tryon__scan" />

      {phase === "idle" && !baseSrc && !children && (
        <div className="fsh-tryon__idle">{idleHint}</div>
      )}

      <div className="fsh-tryon__label">
        <span className="ja">{labelJa}</span>
        <span className="en">{labelEn}</span>
      </div>
    </div>
  );
}
