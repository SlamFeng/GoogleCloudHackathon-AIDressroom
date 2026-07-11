/* Fashini Magic Mirror — self-contained primitives for the UI kit.
   These mirror the authored design-system components (same inline styles /
   tokens) so the kit renders standalone from styles.css alone, without waiting
   on the compiled _ds_bundle.js. Registered under the same namespace the
   screens read from. For production, import the real components from the bundle. */
(function () {
  const React = window.React;

  // one-time stylesheet for button hover/press pseudo-states
  if (!document.getElementById("fshm-kit-css")) {
    const el = document.createElement("style");
    el.id = "fshm-kit-css";
    el.textContent = `
      .fshm-btn{font-family:var(--font-sans);font-weight:var(--weight-semibold);border:1px solid transparent;border-radius:var(--radius-control);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:10px;letter-spacing:-.01em;white-space:nowrap;transition:transform var(--dur-fast) var(--ease-out),background var(--dur-fast) var(--ease-out),border-color var(--dur-fast) var(--ease-out),box-shadow var(--dur-fast) var(--ease-out),color var(--dur-fast) var(--ease-out)}
      .fshm-btn:active:not(:disabled){transform:scale(.975)}
      .fshm-btn:disabled{opacity:.4;cursor:not-allowed}
      .fshm-btn:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px}
      .fshm-btn--sm{height:40px;padding:0 16px;font-size:13px}
      .fshm-btn--md{height:48px;padding:0 22px;font-size:15px}
      .fshm-btn--lg{height:64px;padding:0 30px;font-size:17px}
      .fshm-btn--block{width:100%}
      .fshm-btn--primary{background:var(--accent);color:var(--accent-ink);box-shadow:0 10px 30px -10px var(--accent-glow)}
      .fshm-btn--primary:hover:not(:disabled){background:var(--accent-bright);box-shadow:0 12px 36px -8px var(--accent-glow)}
      .fshm-btn--glass{background:var(--glass-pill-fill);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(var(--glass-saturate));backdrop-filter:blur(var(--glass-blur)) saturate(var(--glass-saturate));color:var(--on-dark);border-color:var(--glass-hairline);border-top-color:var(--glass-edge)}
      .fshm-btn--glass:hover:not(:disabled){border-color:rgba(255,255,255,.34)}
      .fshm-btn--ghost{background:rgba(255,255,255,.06);color:var(--on-dark)}
      .fshm-btn--ghost:hover:not(:disabled){background:rgba(255,255,255,.12)}
      .fshm-btn--text{background:transparent;color:var(--on-dark-2);padding-left:6px;padding-right:6px}
      .fshm-btn--text:hover:not(:disabled){color:var(--on-dark)}
    `;
    document.head.appendChild(el);
  }

  const glassFilter = "blur(var(--glass-blur)) saturate(var(--glass-saturate))";

  function GlassPanel({ variant = "card", as = "div", edge = true, style, children, ...rest }) {
    const Tag = as;
    const strong = variant === "card";
    const base = {
      position: "relative", color: "var(--on-dark)",
      WebkitBackdropFilter: variant === "inset" ? undefined : `blur(var(--glass-blur${strong ? "-strong" : ""})) saturate(var(--glass-saturate))`,
      backdropFilter: variant === "inset" ? undefined : `blur(var(--glass-blur${strong ? "-strong" : ""})) saturate(var(--glass-saturate))`,
      border: "1px solid var(--glass-hairline)",
      borderTopColor: edge && variant !== "inset" ? "var(--glass-edge)" : "var(--glass-hairline)"
    };
    const v = {
      sheet: { background: "var(--glass-sheet-fill)", borderRadius: "var(--radius-sheet) var(--radius-sheet) 0 0", boxShadow: "var(--glass-shadow-sheet)", borderBottom: 0 },
      card: { background: "var(--glass-raised-fill)", borderRadius: "var(--radius-card)", boxShadow: "var(--glass-shadow-raised)" },
      pill: { background: "var(--glass-pill-fill)", borderRadius: "var(--radius-pill)", boxShadow: "var(--glass-shadow-pill)" },
      inset: { background: "var(--glass-inset-fill)", borderRadius: "var(--radius-control)", boxShadow: "none", border: "1px solid var(--glass-hairline)" }
    }[variant];
    return React.createElement(Tag, { style: { ...base, ...v, ...style }, ...rest }, children);
  }

  function Button(props) {
    const { variant = "primary", size = "md", block = false, icon = null, iconRight = null, children, className = "", ...rest } = props;
    const cls = ["fshm-btn", `fshm-btn--${variant}`, `fshm-btn--${size}`, block ? "fshm-btn--block" : "", className].filter(Boolean).join(" ");
    ["variant", "size", "block", "icon", "iconRight"].forEach((k) => { delete rest[k]; });
    return React.createElement("button", { type: "button", className: cls, ...rest }, icon, children, iconRight);
  }

  function MicroLabel({ children, tone = "muted", as = "span", style, ...rest }) {
    const color = tone === "accent" ? "var(--accent-bright)" : tone === "on-dark" ? "var(--on-dark)" : "var(--on-dark-2)";
    return React.createElement(as, { style: { fontFamily: "var(--font-sans)", fontSize: "var(--text-micro)", fontWeight: "var(--weight-semibold)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color, margin: 0, ...style }, ...rest }, children);
  }

  function PriceTag({ amount, size = "md", countUp = false, currency = "¥", tone = "on-dark", style, ...rest }) {
    const [display, setDisplay] = React.useState(countUp ? 0 : amount);
    React.useEffect(() => {
      if (!countUp) { setDisplay(amount); return; }
      const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) { setDisplay(amount); return; }
      let raf; const start = performance.now(); const dur = 700;
      const tick = (now) => { const t = Math.min(1, (now - start) / dur); const e = 1 - Math.pow(1 - t, 3); setDisplay(Math.round(amount * e)); if (t < 1) raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
    }, [amount, countUp]);
    const fs = size === "sm" ? "16px" : size === "lg" ? "40px" : size === "xl" ? "56px" : "24px";
    const ss = size === "sm" ? "11px" : size === "lg" ? "20px" : size === "xl" ? "28px" : "15px";
    const color = tone === "accent" ? "var(--accent-bright)" : "var(--on-dark)";
    return React.createElement("span", { style: { fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", fontWeight: "var(--weight-bold)", fontSize: fs, letterSpacing: "-.01em", color, lineHeight: 1, whiteSpace: "nowrap", ...style }, ...rest },
      React.createElement("span", { style: { fontSize: ss, fontWeight: "var(--weight-semibold)", marginRight: 2 } }, currency), display.toLocaleString("ja-JP"));
  }

  function Hairline({ vertical = false, inset = 0, style, ...rest }) {
    const s = vertical ? { width: 1, alignSelf: "stretch", background: "var(--border-hairline)", margin: `${inset}px 0` } : { height: 1, width: "100%", background: "var(--border-hairline)", margin: `0 ${inset}px` };
    return React.createElement("div", { role: "separator", style: { ...s, ...style }, ...rest });
  }

  function SegmentedControl({ options, value, onChange, size = "md", style, ...rest }) {
    const h = size === "lg" ? 60 : size === "sm" ? 40 : 52;
    return React.createElement("div", { role: "tablist", style: { display: "grid", gridAutoFlow: "column", gridAutoColumns: "1fr", gap: 6, padding: 5, borderRadius: "var(--radius-control)", background: "var(--glass-inset-fill)", border: "1px solid var(--glass-hairline)", ...style }, ...rest },
      options.map((opt) => {
        const val = typeof opt === "string" ? opt : opt.value;
        const label = typeof opt === "string" ? opt : opt.label;
        const active = val === value;
        return React.createElement("button", { key: val, type: "button", role: "tab", "aria-selected": active, onClick: () => onChange && onChange(val),
          style: { height: h, padding: "0 12px", cursor: "pointer", borderRadius: "calc(var(--radius-control) - 4px)", border: "1px solid transparent", background: active ? "var(--accent)" : "transparent", color: active ? "var(--accent-ink)" : "var(--on-dark-2)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: active ? 600 : 500, letterSpacing: "-.01em", boxShadow: active ? "0 8px 22px -12px var(--accent-glow)" : "none", transition: "background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)" } }, label);
      }));
  }

  function Stepper({ value, onChange, unit, min = 0, max = 999, step = 1, style, ...rest }) {
    const clamp = (n) => Math.max(min, Math.min(max, n));
    const set = (n) => onChange && onChange(clamp(n));
    const btn = { width: 52, height: 52, flex: "0 0 auto", borderRadius: "var(--radius-control)", border: "1px solid var(--glass-hairline)", background: "var(--glass-inset-fill)", color: "var(--on-dark)", fontSize: 24, fontWeight: 500, lineHeight: 1, cursor: "pointer", display: "grid", placeItems: "center" };
    return React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, ...style }, ...rest },
      React.createElement("button", { type: "button", "aria-label": "Decrease", style: btn, onClick: () => set(value - step) }, "−"),
      React.createElement("div", { style: { flex: 1, display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8, borderBottom: "1px solid var(--on-dark-line)", padding: "6px 0" } },
        React.createElement("span", { style: { fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 40, letterSpacing: "-.03em", color: "var(--on-dark)" } }, value),
        unit && React.createElement("span", { style: { fontFamily: "var(--font-mono)", fontSize: 15, color: "var(--on-dark-2)" } }, unit)),
      React.createElement("button", { type: "button", "aria-label": "Increase", style: btn, onClick: () => set(value + step) }, "+"));
  }

  const LANGS = [{ code: "en", label: "EN" }, { code: "zh", label: "中文" }, { code: "ja", label: "日本語" }];
  function LanguageSwitch({ value = "zh", onChange, langs = LANGS, style, ...rest }) {
    return React.createElement("div", { "aria-label": "Language selector", style: { display: "inline-flex", gap: 3, padding: 4, borderRadius: "var(--radius-pill)", border: "1px solid var(--glass-hairline)", borderTopColor: "var(--glass-edge)", background: "var(--glass-pill-fill)", WebkitBackdropFilter: glassFilter, backdropFilter: glassFilter, ...style }, ...rest },
      langs.map((l) => {
        const active = l.code === value;
        return React.createElement("button", { key: l.code, type: "button", onClick: () => onChange && onChange(l.code), style: { border: 0, cursor: "pointer", padding: "6px 12px", borderRadius: "var(--radius-pill)", background: active ? "var(--accent)" : "transparent", color: active ? "var(--accent-ink)" : "var(--on-dark-2)", fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 700, letterSpacing: ".06em" } }, l.label);
      }));
  }

  function ConsentCheck({ checked = false, onChange, children, style, ...rest }) {
    return React.createElement("label", { style: { display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 16px", borderRadius: "var(--radius-control)", background: checked ? "var(--accent-tint)" : "var(--glass-inset-fill)", border: `1px solid ${checked ? "var(--accent-bright)" : "var(--glass-hairline)"}`, fontSize: 14, lineHeight: 1.5, color: "var(--on-dark)", cursor: "pointer", ...style } },
      React.createElement("span", { style: { width: 22, height: 22, flex: "0 0 auto", marginTop: 1, border: `1px solid ${checked ? "var(--accent-bright)" : "var(--on-dark-3)"}`, borderRadius: 6, background: checked ? "var(--accent)" : "transparent", color: "var(--accent-ink)", display: "grid", placeItems: "center", fontSize: 13, lineHeight: 1 } }, checked ? "✓" : ""),
      React.createElement("input", { type: "checkbox", checked, onChange: (e) => onChange && onChange(e.target.checked), style: { position: "absolute", opacity: 0, width: 0, height: 0 }, ...rest }),
      React.createElement("span", null, children));
  }

  const FB_TAGS = [{ dimension: "color", label: "颜色" }, { dimension: "fit", label: "版型" }, { dimension: "style", label: "风格" }, { dimension: "price", label: "价格" }, { dimension: "overall", label: "都不喜欢" }];
  function FeedbackTags({ tags = FB_TAGS, onSelect, active, disabled = false, style, ...rest }) {
    return React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, ...style }, ...rest },
      tags.map((t) => {
        const isActive = active === t.dimension; const reject = t.dimension === "overall";
        return React.createElement("button", { key: t.dimension, type: "button", disabled, onClick: () => onSelect && onSelect(t),
          style: { height: 40, padding: "0 16px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, borderRadius: "var(--radius-pill)", border: `1px solid ${isActive ? "var(--accent-bright)" : "var(--glass-hairline)"}`, background: isActive ? "var(--accent-tint)" : "var(--glass-inset-fill)", color: isActive ? "var(--accent-bright)" : reject ? "var(--failed)" : "var(--on-dark)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, letterSpacing: "-.01em" } }, t.label);
      }));
  }

  function ControlPill({ icon, label, active = false, as = "button", style, children, ...rest }) {
    return React.createElement(as, { type: as === "button" ? "button" : undefined, "aria-pressed": as === "button" ? active : undefined,
      style: { display: "inline-flex", alignItems: "center", gap: label ? 7 : 0, height: 38, padding: label ? "0 14px" : "0 11px", borderRadius: "var(--radius-pill)", border: `1px solid ${active ? "var(--accent-bright)" : "var(--glass-hairline)"}`, borderTopColor: active ? "var(--accent-bright)" : "var(--glass-edge)", background: active ? "var(--accent-tint)" : "var(--glass-pill-fill)", WebkitBackdropFilter: glassFilter, backdropFilter: glassFilter, color: active ? "var(--accent-bright)" : "var(--on-dark-2)", fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 600, letterSpacing: "-.01em", lineHeight: 1, cursor: as === "button" ? "pointer" : "default", ...style }, ...rest },
      icon != null && React.createElement("span", { "aria-hidden": "true", style: { fontSize: 15, lineHeight: 1 } }, icon), label, children);
  }

  function CameraChip({ children = "Camera on · nothing is saved", live = true, style, ...rest }) {
    return React.createElement("span", { role: "status", style: { display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 13px 7px 11px", borderRadius: "var(--radius-pill)", border: "1px solid var(--glass-hairline)", borderTopColor: "var(--glass-edge)", background: "var(--glass-pill-fill)", WebkitBackdropFilter: glassFilter, backdropFilter: glassFilter, color: "var(--on-dark-2)", fontFamily: "var(--font-sans)", fontSize: 12, letterSpacing: ".01em", ...style }, ...rest },
      React.createElement("span", { style: { width: 8, height: 8, borderRadius: "50%", flex: "0 0 auto", background: live ? "var(--live)" : "var(--on-dark-3)", animation: live ? "fsh-live-pulse 1.8s var(--ease-out) infinite" : "none" } }), children);
  }

  function ToolStep({ label, done = false, index = 0, style, ...rest }) {
    return React.createElement("div", { style: { display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 15px", borderRadius: "var(--radius-pill)", border: "1px solid var(--glass-hairline)", background: "var(--glass-pill-fill)", WebkitBackdropFilter: glassFilter, backdropFilter: glassFilter, color: done ? "var(--on-dark-2)" : "var(--on-dark)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500, letterSpacing: "-.01em", animation: "fsh-item-in var(--dur-base) var(--ease-out) both", animationDelay: `${index * 0.08}s`, ...style }, ...rest },
      done
        ? React.createElement("span", { "aria-hidden": "true", style: { display: "inline-flex", color: "var(--accent-bright)", flex: "0 0 auto" } },
            React.createElement("svg", { width: 15, height: 15, viewBox: "0 0 16 16", fill: "none" }, React.createElement("path", { d: "M3.5 8.5l3 3 6-6.5", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" })))
        : React.createElement("span", { "aria-hidden": "true", style: { width: 15, height: 15, flex: "0 0 auto", borderRadius: "50%", border: "2px solid var(--on-dark-line)", borderTopColor: "var(--accent-bright)", animation: "fsh-spin .8s linear infinite" } }),
      React.createElement("span", null, label));
  }

  const ICONS = {
    "arrow-left": [["line", { x1: 19, y1: 12, x2: 5, y2: 12 }], ["polyline", { points: "12 19 5 12 12 5" }]],
    "arrow-right": [["line", { x1: 5, y1: 12, x2: 19, y2: 12 }], ["polyline", { points: "12 5 19 12 12 19" }]],
    camera: [["path", { d: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" }], ["circle", { cx: 12, cy: 13, r: 4 }]],
    hand: [["path", { d: "M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2" }], ["path", { d: "M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2" }], ["path", { d: "M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" }], ["path", { d: "M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" }]],
    "thumbs-up": [["path", { d: "M7 10v12" }], ["path", { d: "M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z" }]],
    fist: [["path", { d: "M6 14a6 6 0 0 1 12 0v2a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4Z" }], ["path", { d: "M8 12V9a1.5 1.5 0 0 1 3 0v3" }], ["path", { d: "M11 12V8a1.5 1.5 0 0 1 3 0v4" }], ["path", { d: "M14 12V9.5a1.5 1.5 0 0 1 3 0V12" }]],
    expand: [["polyline", { points: "15 3 21 3 21 9" }], ["polyline", { points: "9 21 3 21 3 15" }], ["line", { x1: 21, y1: 3, x2: 14, y2: 10 }], ["line", { x1: 3, y1: 21, x2: 10, y2: 14 }]],
    volume: [["polygon", { points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5" }], ["path", { d: "M15.54 8.46a5 5 0 0 1 0 7.07" }], ["path", { d: "M19.07 4.93a10 10 0 0 1 0 14.14" }]],
    "volume-x": [["polygon", { points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5" }], ["line", { x1: 22, y1: 9, x2: 16, y2: 15 }], ["line", { x1: 16, y1: 9, x2: 22, y2: 15 }]],
    mic: [["rect", { x: 9, y: 2, width: 6, height: 11, rx: 3 }], ["path", { d: "M5 10v2a7 7 0 0 0 14 0v-2" }], ["line", { x1: 12, y1: 19, x2: 12, y2: 22 }]],
    check: [["polyline", { points: "20 6 9 17 4 12" }]],
    ruler: [["rect", { x: 8, y: 2, width: 8, height: 20, rx: 1.5 }], ["line", { x1: 8, y1: 7, x2: 11.5, y2: 7 }], ["line", { x1: 8, y1: 12, x2: 12.5, y2: 12 }], ["line", { x1: 8, y1: 17, x2: 11.5, y2: 17 }]],
    scale: [["rect", { x: 3, y: 3, width: 18, height: 18, rx: 3 }], ["circle", { cx: 12, cy: 13, r: 1 }], ["path", { d: "m12 13 3-4" }]],
    user: [["circle", { cx: 12, cy: 8, r: 4 }], ["path", { d: "M4 21a8 8 0 0 1 16 0" }]],
    calendar: [["rect", { x: 3, y: 5, width: 18, height: 16, rx: 2 }], ["line", { x1: 3, y1: 10, x2: 21, y2: 10 }], ["line", { x1: 8, y1: 3, x2: 8, y2: 6 }], ["line", { x1: 16, y1: 3, x2: 16, y2: 6 }]]
  };
  function Icon({ name, size = 20, stroke = 2, style, ...rest }) {
    const parts = ICONS[name] || [];
    return React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { display: "block", flex: "0 0 auto", ...style }, ...rest }, parts.map((p, i) => React.createElement(p[0], { key: i, ...p[1] })));
  }

  Object.assign(window, {
    FashiniMirrorDesignSystem_c521b8: {
      GlassPanel, Button, MicroLabel, PriceTag, Hairline, Icon,
      SegmentedControl, Stepper, LanguageSwitch, ConsentCheck, FeedbackTags,
      ControlPill, CameraChip, ToolStep
    }
  });
})();
