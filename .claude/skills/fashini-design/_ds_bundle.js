/* @ds-bundle: {"format":4,"namespace":"FashiniDesignSystem_c28a45","components":[{"name":"AhaTimeline","sourcePath":"components/agent/AhaTimeline.jsx"},{"name":"ConstraintDelta","sourcePath":"components/agent/ConstraintDelta.jsx"},{"name":"ProductRow","sourcePath":"components/agent/ProductRow.jsx"},{"name":"RecTypeLabel","sourcePath":"components/agent/RecTypeLabel.jsx"},{"name":"RecommendationCard","sourcePath":"components/agent/RecommendationCard.jsx"},{"name":"ToolCallTrace","sourcePath":"components/agent/ToolCallTrace.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Hairline","sourcePath":"components/core/Hairline.jsx"},{"name":"MicroLabel","sourcePath":"components/core/MicroLabel.jsx"},{"name":"PriceTag","sourcePath":"components/core/PriceTag.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"FeedbackTags","sourcePath":"components/forms/FeedbackTags.jsx"},{"name":"LanguageSwitch","sourcePath":"components/forms/LanguageSwitch.jsx"},{"name":"NumberField","sourcePath":"components/forms/NumberField.jsx"},{"name":"SegmentedControl","sourcePath":"components/forms/SegmentedControl.jsx"},{"name":"PrivacyChip","sourcePath":"components/status/PrivacyChip.jsx"},{"name":"StatusBadge","sourcePath":"components/status/StatusBadge.jsx"},{"name":"ToolStatusChip","sourcePath":"components/status/ToolStatusChip.jsx"},{"name":"TryOnStage","sourcePath":"components/tryon/TryOnStage.jsx"}],"sourceHashes":{"components/agent/AhaTimeline.jsx":"ddc732da2eb8","components/agent/ConstraintDelta.jsx":"eef40eb9b8f0","components/agent/ProductRow.jsx":"e2148700c470","components/agent/RecTypeLabel.jsx":"f31ca95a4109","components/agent/RecommendationCard.jsx":"d003e99326f0","components/agent/ToolCallTrace.jsx":"4abbdca9a686","components/core/Button.jsx":"dc8ac5b431c5","components/core/Hairline.jsx":"74588de7ae32","components/core/MicroLabel.jsx":"2c38de2a6076","components/core/PriceTag.jsx":"ccddf854aabb","components/forms/Checkbox.jsx":"1dce59cf79d3","components/forms/FeedbackTags.jsx":"2165d2e70963","components/forms/LanguageSwitch.jsx":"a870fd4994b1","components/forms/NumberField.jsx":"81ec0e9056e9","components/forms/SegmentedControl.jsx":"24aefb970752","components/status/PrivacyChip.jsx":"80efef1fce4d","components/status/StatusBadge.jsx":"6d2738c9432c","components/status/ToolStatusChip.jsx":"b4c08034a715","components/tryon/TryOnStage.jsx":"ddd0be66e46c","ui_kits/entrance_screen/Attract.jsx":"b7d6e828a45d","ui_kits/mirror/Flow.jsx":"1f4bd5a85fea","ui_kits/staff_ipad/Console.jsx":"8e89a318de9b"},"inlinedExternals":[],"unexposedExports":[{"name":"toolTone","sourcePath":"components/status/ToolStatusChip.jsx"}]} */

(() => {

const __ds_ns = (window.FashiniDesignSystem_c28a45 = window.FashiniDesignSystem_c28a45 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/agent/AhaTimeline.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Aha timeline — the choreographed demo rail: Lucy realtime → Google
 * fallback → try-on handoff. Bind to `AgentState.aha_demo`. The active
 * stage is highlighted in cobalt.
 */
function AhaTimeline({
  stage = "idle",
  narrative,
  steps,
  style,
  ...rest
}) {
  const defaultSteps = [{
    key: "lucy_preview",
    label: "Lucy realtime",
    value: "previewing"
  }, {
    key: "google_fallback",
    label: "Google fallback",
    value: "generating"
  }, {
    key: "handoff",
    label: "Try-on handoff",
    value: "ready"
  }];
  const list = steps || defaultSteps;
  const activeMap = {
    lucy_preview: ["lucy_preview"],
    google_generating: ["google_fallback"],
    google_ready: ["google_fallback"],
    handoff_ready: ["handoff"]
  };
  const activeKeys = activeMap[stage] || [];
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "grid",
      gridTemplateColumns: "minmax(200px, 0.9fr) 1.6fr",
      gap: 20,
      padding: 20,
      border: "1px solid var(--hairline)",
      borderRadius: "var(--radius-card)",
      background: "var(--surface)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "var(--accent)"
    }
  }, "Aha demo"), /*#__PURE__*/React.createElement("strong", {
    style: {
      display: "block",
      marginTop: 8,
      fontSize: 20,
      fontWeight: 700,
      letterSpacing: "-0.02em",
      color: "var(--ink)",
      textTransform: "capitalize"
    }
  }, String(stage).replaceAll("_", " ")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "8px 0 0",
      fontSize: 13,
      lineHeight: 1.5,
      color: "var(--muted)"
    }
  }, narrative || "Agent runtime is waiting for the first customer action.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10
    }
  }, list.map(s => {
    const active = activeKeys.includes(s.key);
    return /*#__PURE__*/React.createElement("div", {
      key: s.key,
      style: {
        flex: 1,
        padding: "14px 14px",
        borderRadius: "var(--radius-control)",
        border: `1px solid ${active ? "var(--accent)" : "var(--hairline)"}`,
        background: active ? "var(--accent-soft)" : "var(--inset)",
        transition: "background var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        color: active ? "var(--accent)" : "var(--muted)"
      }
    }, s.label), /*#__PURE__*/React.createElement("strong", {
      style: {
        display: "block",
        marginTop: 8,
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        fontWeight: 600,
        color: active ? "var(--accent)" : "var(--ink)"
      }
    }, s.value));
  })));
}
Object.assign(__ds_scope, { AhaTimeline });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/agent/AhaTimeline.jsx", error: String((e && e.message) || e) }); }

// components/agent/ConstraintDelta.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Constraint delta — shows how feedback changed the agent's constraints
 * (prefer / avoid), the demo evidence that the loop reacted. Bind to
 * `AgentConstraints` (prefer[], avoid[], budget_yen).
 */
function ConstraintDelta({
  prefer = [],
  avoid = [],
  budgetYen,
  style,
  ...rest
}) {
  const Row = ({
    kind,
    item
  }) => {
    const isAvoid = kind === "avoid";
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 12px",
        borderRadius: "var(--radius-control)",
        background: "var(--inset)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        fontWeight: 700,
        color: isAvoid ? "var(--failed)" : "var(--accent)",
        width: 14,
        flex: "0 0 auto"
      }
    }, isAvoid ? "−" : "+"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--faint)",
        width: 72,
        flex: "0 0 auto"
      }
    }, item.dimension), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        fontWeight: 600,
        color: "var(--ink)"
      }
    }, item.value), item.reason && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "var(--muted)",
        marginLeft: "auto",
        textAlign: "right"
      }
    }, item.reason));
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      border: "1px solid var(--hairline)",
      borderRadius: "var(--radius-card)",
      background: "var(--surface)",
      padding: 18,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "var(--ink)"
    }
  }, "Constraint delta"), typeof budgetYen === "number" && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "var(--muted)"
    }
  }, "budget \u2264 \xA5", budgetYen.toLocaleString("ja-JP"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 7
    }
  }, prefer.map((item, i) => /*#__PURE__*/React.createElement(Row, {
    key: `p-${i}`,
    kind: "prefer",
    item: item
  })), avoid.map((item, i) => /*#__PURE__*/React.createElement(Row, {
    key: `a-${i}`,
    kind: "avoid",
    item: item
  })), prefer.length === 0 && avoid.length === 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "var(--muted)"
    }
  }, "No constraints yet \u2014 give feedback to refine.")));
}
Object.assign(__ds_scope, { ConstraintDelta });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/agent/ConstraintDelta.jsx", error: String((e && e.message) || e) }); }

// components/agent/RecTypeLabel.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const REC_TYPE_LABEL = {
  explicit_need: "Explicit need",
  similar: "Similar",
  style: "Style",
  seasonal: "Seasonal"
};

/**
 * The rec-type label on a recommendation set — one of the few places the
 * cobalt accent is allowed. Bind to `RecommendationSet.rec_type`.
 */
function RecTypeLabel({
  recType,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      fontFamily: "var(--font-sans)",
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "var(--accent)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: "var(--accent)"
    }
  }), REC_TYPE_LABEL[recType] || recType);
}
Object.assign(__ds_scope, { RecTypeLabel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/agent/RecTypeLabel.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
let injected = false;
function useStyles() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-fashini", "button");
  el.textContent = `
    .fsh-btn {
      font-family: var(--font-sans);
      font-weight: var(--weight-semibold);
      border: 1px solid transparent;
      border-radius: var(--radius-control);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      letter-spacing: -0.01em;
      transition: transform var(--dur-fast) var(--ease-out),
                  background var(--dur-fast) var(--ease-out),
                  border-color var(--dur-fast) var(--ease-out),
                  color var(--dur-fast) var(--ease-out);
      white-space: nowrap;
    }
    .fsh-btn:active:not(:disabled) { transform: scale(0.975); }
    .fsh-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .fsh-btn:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }

    .fsh-btn--sm { height: 36px; padding: 0 14px; font-size: 13px; }
    .fsh-btn--md { height: 44px; padding: 0 20px; font-size: 15px; }
    .fsh-btn--lg { height: 60px; padding: 0 28px; font-size: 17px; }
    .fsh-btn--block { width: 100%; }

    .fsh-btn--primary { background: var(--accent); color: var(--accent-ink); }
    .fsh-btn--primary:hover:not(:disabled) { background: #1523b0; }

    .fsh-btn--secondary { background: var(--surface); color: var(--ink); border-color: var(--hairline); }
    .fsh-btn--secondary:hover:not(:disabled) { border-color: var(--ink); }

    .fsh-btn--ghost { background: var(--inset); color: var(--ink); }
    .fsh-btn--ghost:hover:not(:disabled) { background: #ececec; }

    .fsh-btn--text { background: transparent; color: var(--muted); padding-left: 4px; padding-right: 4px; }
    .fsh-btn--text:hover:not(:disabled) { color: var(--ink); }
  `;
  document.head.appendChild(el);
}

/**
 * Fashini primary action button. Cobalt accent is reserved for `primary`.
 */
function Button({
  variant = "primary",
  size = "md",
  block = false,
  icon = null,
  iconRight = null,
  children,
  className = "",
  ...rest
}) {
  useStyles();
  const cls = ["fsh-btn", `fsh-btn--${variant}`, `fsh-btn--${size}`, block ? "fsh-btn--block" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    className: cls
  }, rest), icon, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Hairline.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * A crisp 1px hairline rule. The primary structural divider in Fashini —
 * used instead of shadows or heavy borders.
 */
function Hairline({
  vertical = false,
  inset = 0,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "separator",
    style: vertical ? {
      width: 1,
      alignSelf: "stretch",
      background: "var(--hairline)",
      margin: `${inset}px 0`,
      ...style
    } : {
      height: 1,
      width: "100%",
      background: "var(--hairline)",
      margin: `0 ${inset}px`,
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Hairline });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Hairline.jsx", error: String((e && e.message) || e) }); }

// components/core/MicroLabel.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Uppercase micro-label with wide tracking. Used for step markers,
 * section eyebrows, and code-voice labels.
 */
function MicroLabel({
  children,
  tone = "muted",
  as = "span",
  style,
  ...rest
}) {
  const Tag = as;
  const color = tone === "accent" ? "var(--accent)" : tone === "ink" ? "var(--ink)" : "var(--muted)";
  return /*#__PURE__*/React.createElement(Tag, _extends({
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-micro)",
      fontWeight: "var(--weight-semibold)",
      letterSpacing: "var(--tracking-label)",
      textTransform: "uppercase",
      color,
      margin: 0,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { MicroLabel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/MicroLabel.jsx", error: String((e && e.message) || e) }); }

// components/core/PriceTag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Monospace, tabular-nums price in JPY (¥). Prices are the loudest type
 * on the screen. Optionally animates a count-up to the value on mount.
 */
function PriceTag({
  amount,
  size = "md",
  countUp = false,
  currency = "¥",
  style,
  ...rest
}) {
  const [display, setDisplay] = React.useState(countUp ? 0 : amount);
  React.useEffect(() => {
    if (!countUp) {
      setDisplay(amount);
      return;
    }
    const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(amount);
      return;
    }
    let raf;
    const start = performance.now();
    const dur = 700;
    const tick = now => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(amount * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [amount, countUp]);
  const fontSize = size === "sm" ? "16px" : size === "lg" ? "46px" : size === "xl" ? "64px" : "24px";
  const symSize = size === "sm" ? "11px" : size === "lg" ? "22px" : size === "xl" ? "30px" : "15px";
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      fontFamily: "var(--font-mono)",
      fontVariantNumeric: "tabular-nums",
      fontWeight: "var(--weight-bold)",
      fontSize,
      letterSpacing: "-0.01em",
      color: "var(--ink)",
      lineHeight: 1,
      whiteSpace: "nowrap",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: symSize,
      fontWeight: "var(--weight-semibold)",
      marginRight: 2
    }
  }, currency), display.toLocaleString("ja-JP"));
}
Object.assign(__ds_scope, { PriceTag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/PriceTag.jsx", error: String((e && e.message) || e) }); }

// components/agent/ProductRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SLOT_LABEL = {
  outerwear: "Outerwear",
  top: "Top",
  bottom: "Bottom",
  dress: "Dress",
  shoes: "Shoes",
  accessory: "Accessory"
};

/**
 * A single product line inside a recommendation set: slot label + name,
 * price (¥), and color / fit meta. Bind to `Product`.
 */
function ProductRow({
  product,
  style,
  ...rest
}) {
  const {
    name,
    category,
    price_yen,
    colors = [],
    style_tags = [],
    fit
  } = product;
  const meta = [colors.join(" / "), fit || style_tags[0]].filter(Boolean).join(" · ");
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "12px 0",
      borderBottom: "1px solid var(--hairline)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "var(--faint)",
      width: 78,
      flex: "0 0 auto"
    }
  }, SLOT_LABEL[category] || category), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 15,
      fontWeight: 600,
      color: "var(--ink)",
      letterSpacing: "-0.01em",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, name), meta && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--muted)",
      marginTop: 2
    }
  }, meta)), /*#__PURE__*/React.createElement(__ds_scope.PriceTag, {
    amount: price_yen,
    size: "md"
  }));
}
Object.assign(__ds_scope, { ProductRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/agent/ProductRow.jsx", error: String((e && e.message) || e) }); }

// components/agent/RecommendationCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
let injected = false;
function useStyles() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-fashini", "reccard");
  el.textContent = `
    .fsh-reccard {
      background: var(--surface);
      border: 1px solid var(--hairline);
      border-radius: var(--radius-card);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: transform var(--dur-base) var(--ease-out),
                  box-shadow var(--dur-base) var(--ease-out),
                  border-color var(--dur-base) var(--ease-out);
      animation: fashini-materialize var(--dur-slow) var(--ease-out) both;
    }
    .fsh-reccard:hover { transform: translateY(-3px); box-shadow: var(--shadow-lift); }
    .fsh-reccard[data-selected="true"] {
      border-color: var(--accent);
      box-shadow: 0 0 0 1px var(--accent);
    }
  `;
  document.head.appendChild(el);
}

/**
 * Recommendation SET CARD. Header (rec-type + round), reason, product rows,
 * total, and Preview / Confirm actions. Bind to `RecommendationSet`.
 * Materializes on mount (blur→sharp + rise); use `index` for stagger.
 */
function RecommendationCard({
  set,
  selected = false,
  index = 0,
  onSelect,
  onPreview,
  onConfirm,
  style,
  ...rest
}) {
  useStyles();
  const products = set.products || [];
  const total = products.reduce((sum, p) => sum + (p.price_yen || 0), 0);
  return /*#__PURE__*/React.createElement("div", _extends({
    className: "fsh-reccard",
    "data-selected": selected,
    style: {
      animationDelay: `${index * 0.09}s`,
      ...style
    },
    onClick: onSelect
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.RecTypeLabel, {
    recType: set.rec_type
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      fontWeight: 600,
      color: "var(--muted)"
    }
  }, "Round ", set.round, " \xB7 ", set.set_id)), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "12px 0 6px",
      fontSize: 14,
      lineHeight: 1.5,
      color: "var(--ink)",
      textWrap: "pretty"
    }
  }, set.reason), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 2
    }
  }, products.map(p => /*#__PURE__*/React.createElement(__ds_scope.ProductRow, {
    key: p.product_id || p.name,
    product: p
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "var(--faint)"
    }
  }, "Set total"), /*#__PURE__*/React.createElement(__ds_scope.PriceTag, {
    amount: total,
    size: "lg",
    countUp: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    onClick: e => {
      e.stopPropagation();
      onPreview && onPreview(set);
    }
  }, "Preview"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "primary",
    iconRight: /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\u2192"),
    onClick: e => {
      e.stopPropagation();
      onConfirm && onConfirm(set);
    }
  }, "Confirm"))));
}
Object.assign(__ds_scope, { RecommendationCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/agent/RecommendationCard.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Square consent checkbox with the brand ✓ mark. Checked state fills ink
 * (not accent — consent is neutral, not a "primary action").
 */
function Checkbox({
  checked = false,
  onChange,
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
      padding: "12px 0",
      fontSize: 13,
      lineHeight: 1.5,
      color: "var(--ink)",
      cursor: "pointer",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 19,
      height: 19,
      flex: "0 0 auto",
      border: `1px solid ${checked ? "var(--ink)" : "var(--faint)"}`,
      borderRadius: 4,
      background: checked ? "var(--ink)" : "transparent",
      color: "var(--accent-ink)",
      display: "grid",
      placeItems: "center",
      fontSize: 12,
      lineHeight: 1,
      transition: "background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)"
    }
  }, checked ? "✓" : ""), /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    checked: checked,
    onChange: e => onChange && onChange(e.target.checked),
    style: {
      position: "absolute",
      opacity: 0,
      width: 0,
      height: 0
    }
  }, rest)), /*#__PURE__*/React.createElement("span", null, children));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/FeedbackTags.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const DEFAULT_TAGS = [{
  dimension: "color",
  label: "Color"
}, {
  dimension: "fit",
  label: "Fit"
}, {
  dimension: "style",
  label: "Style"
}, {
  dimension: "price",
  label: "Price"
}, {
  dimension: "overall",
  label: "Reject all"
}];

/**
 * Structured feedback quick-tags. Fashini reacts to structured feedback by
 * updating constraints and re-recommending — these are the tap targets that
 * drive that loop (FeedbackDimension). "Reject all" is treated as reject_all.
 */
function FeedbackTags({
  tags = DEFAULT_TAGS,
  onSelect,
  active,
  disabled = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      ...style
    }
  }, rest), tags.map(t => {
    const isActive = active === t.dimension;
    const reject = t.dimension === "overall";
    return /*#__PURE__*/React.createElement("button", {
      key: t.dimension,
      type: "button",
      disabled: disabled,
      onClick: () => onSelect && onSelect(t),
      style: {
        height: 40,
        padding: "0 16px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        borderRadius: "var(--radius-control)",
        border: `1px solid ${isActive ? "var(--accent)" : reject ? "var(--hairline)" : "var(--hairline)"}`,
        background: isActive ? "var(--accent-soft)" : "var(--surface)",
        color: isActive ? "var(--accent)" : reject ? "var(--failed)" : "var(--ink)",
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        transition: "background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)"
      }
    }, t.label);
  }));
}
Object.assign(__ds_scope, { FeedbackTags });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FeedbackTags.jsx", error: String((e && e.message) || e) }); }

// components/forms/LanguageSwitch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const LANGS = [{
  code: "en",
  label: "EN"
}, {
  code: "zh",
  label: "中文"
}, {
  code: "ja",
  label: "日本語"
}];

/**
 * Trilingual language switch (EN / 中文 / 日本語). Active fills ink.
 */
function LanguageSwitch({
  value = "en",
  onChange,
  langs = LANGS,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    "aria-label": "Language selector",
    style: {
      display: "inline-flex",
      gap: 3,
      padding: 3,
      border: "1px solid var(--hairline)",
      borderRadius: "var(--radius-control)",
      background: "var(--surface)",
      ...style
    }
  }, rest), langs.map(l => {
    const active = l.code === value;
    return /*#__PURE__*/React.createElement("button", {
      key: l.code,
      type: "button",
      onClick: () => onChange && onChange(l.code),
      style: {
        border: 0,
        cursor: "pointer",
        padding: "6px 10px",
        borderRadius: 5,
        background: active ? "var(--ink)" : "transparent",
        color: active ? "var(--accent-ink)" : "var(--muted)",
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.06em"
      }
    }, l.label);
  }));
}
Object.assign(__ds_scope, { LanguageSwitch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/LanguageSwitch.jsx", error: String((e && e.message) || e) }); }

// components/forms/NumberField.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Large numeric field with a trailing unit — the display value is set in
 * the display grotesk, big and editorial (height/weight capture).
 */
function NumberField({
  value,
  onChange,
  unit,
  min,
  max,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 70,
      borderBottom: "1px solid var(--ink)",
      display: "flex",
      alignItems: "baseline",
      gap: 8,
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "number",
    value: value,
    min: min,
    max: max,
    onChange: e => onChange && onChange(Number(e.target.value)),
    style: {
      width: "100%",
      border: 0,
      outline: "none",
      background: "transparent",
      fontFamily: "var(--font-sans)",
      fontWeight: 700,
      fontSize: 40,
      letterSpacing: "-0.03em",
      color: "var(--ink)"
    }
  }, rest)), unit && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 15,
      color: "var(--muted)",
      flex: "0 0 auto"
    }
  }, unit));
}
Object.assign(__ds_scope, { NumberField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/NumberField.jsx", error: String((e && e.message) || e) }); }

// components/forms/SegmentedControl.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Segmented single-select control. Active segment fills cobalt.
 * Used for gender presentation, age range, and other discrete picks.
 */
function SegmentedControl({
  options,
  value,
  onChange,
  size = "md",
  style,
  ...rest
}) {
  const h = size === "lg" ? 60 : size === "sm" ? 40 : 52;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist",
    style: {
      display: "grid",
      gridAutoFlow: "column",
      gridAutoColumns: "1fr",
      gap: 8,
      ...style
    }
  }, rest), options.map(opt => {
    const val = typeof opt === "string" ? opt : opt.value;
    const label = typeof opt === "string" ? opt : opt.label;
    const active = val === value;
    return /*#__PURE__*/React.createElement("button", {
      key: val,
      type: "button",
      role: "tab",
      "aria-selected": active,
      onClick: () => onChange && onChange(val),
      style: {
        height: h,
        padding: "0 12px",
        cursor: "pointer",
        borderRadius: "var(--radius-control)",
        border: `1px solid ${active ? "var(--accent)" : "var(--hairline)"}`,
        background: active ? "var(--accent)" : "var(--surface)",
        color: active ? "var(--accent-ink)" : "var(--ink)",
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        fontWeight: active ? 600 : 500,
        letterSpacing: "-0.01em",
        transition: "background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)"
      }
    }, label);
  }));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// components/status/PrivacyChip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Standing privacy reassurance chip — a quiet dot + line. Fashini shows
 * privacy plainly and repeatedly ("Photos deleted after this session").
 */
function PrivacyChip({
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      fontSize: 12,
      color: "var(--muted)",
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: "var(--ok)",
      boxShadow: "0 0 0 4px var(--inset)",
      flex: "0 0 auto"
    }
  }), children);
}
Object.assign(__ds_scope, { PrivacyChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/status/PrivacyChip.jsx", error: String((e && e.message) || e) }); }

// components/status/StatusBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * A labelled runtime badge — a small caption over a mono value. Used for
 * agent status, route, round, connection, model, etc. Bind to AgentState.
 * `active` highlights the badge in cobalt (e.g. the "held"/active state).
 */
function StatusBadge({
  label,
  value,
  active = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "inline-flex",
      flexDirection: "column",
      gap: 4,
      padding: "8px 12px",
      border: `1px solid ${active ? "var(--accent)" : "var(--hairline)"}`,
      background: active ? "var(--accent-soft)" : "var(--surface)",
      borderRadius: "var(--radius-control)",
      minWidth: 84,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: active ? "var(--accent)" : "var(--faint)"
    }
  }, label), /*#__PURE__*/React.createElement("strong", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: "-0.01em",
      color: active ? "var(--accent)" : "var(--ink)",
      textTransform: "lowercase"
    }
  }, value));
}
Object.assign(__ds_scope, { StatusBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/status/StatusBadge.jsx", error: String((e && e.message) || e) }); }

// components/status/ToolStatusChip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  ok: {
    color: "var(--ok)",
    bg: "var(--ok-soft)",
    border: "transparent"
  },
  held: {
    color: "var(--held)",
    bg: "var(--held-soft)",
    border: "var(--accent)"
  },
  failed: {
    color: "var(--failed)",
    bg: "var(--failed-soft)",
    border: "transparent"
  },
  neutral: {
    color: "var(--muted)",
    bg: "var(--inset)",
    border: "transparent"
  }
};

// Maps a ToolCallRecord.output to a tone (mirrors the source deriveToolStatus).
function toolTone(output) {
  if (output && typeof output === "object") {
    if (output.ok === false) return "failed";
    const s = output.status;
    if (typeof s === "string") {
      if (s === "confirmed" || s === "held" || s === "success") return s === "held" ? "held" : "ok";
      if (s === "not_found" || s === "failed") return "failed";
      return "neutral";
    }
  }
  return "ok";
}

/**
 * Small status chip for tool-call results: ok / held / failed / neutral.
 * `held` is the only accent-colored status.
 */
function ToolStatusChip({
  status = "ok",
  label,
  style,
  ...rest
}) {
  const t = TONES[status] || TONES.neutral;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "3px 9px",
      borderRadius: "var(--radius-pill)",
      background: t.bg,
      border: `1px solid ${t.border}`,
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      fontWeight: 600,
      color: t.color,
      letterSpacing: "0.01em",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: t.color
    }
  }), label || status);
}
Object.assign(__ds_scope, { toolTone, ToolStatusChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/status/ToolStatusChip.jsx", error: String((e && e.message) || e) }); }

// components/agent/ToolCallTrace.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
let injected = false;
function useStyles() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-fashini", "trace");
  el.textContent = `
    .fsh-trace { border: 1px solid var(--hairline); border-radius: var(--radius-card); overflow: hidden; background: var(--surface); }
    .fsh-trace-head { display: flex; align-items: baseline; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--hairline); }
    .fsh-trace-title { font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink); }
    .fsh-trace-hint { font-family: var(--font-mono); font-size: 11px; color: var(--faint); }
    .fsh-trace-row { display: grid; grid-template-columns: 34px 1fr auto auto 20px; align-items: center; gap: 12px; width: 100%; text-align: left; background: transparent; border: 0; border-bottom: 1px solid var(--hairline); padding: 12px 18px; cursor: pointer; font-family: var(--font-mono); animation: fashini-row-in var(--dur-slow) var(--ease-out) both; transition: background var(--dur-fast) var(--ease-out); }
    .fsh-trace-row:last-of-type { border-bottom: 0; }
    .fsh-trace-row:hover { background: var(--inset); }
    .fsh-trace-idx { color: var(--faint); font-size: 12px; }
    .fsh-trace-name { color: var(--ink); font-size: 13px; font-weight: 500; }
    .fsh-trace-time { color: var(--muted); font-size: 11px; }
    .fsh-trace-caret { color: var(--faint); font-size: 15px; text-align: center; }
    .fsh-trace-body { padding: 4px 18px 16px; background: var(--inset); border-bottom: 1px solid var(--hairline); animation: fashini-expand var(--dur-base) var(--ease-out) both; }
    .fsh-trace-io { margin-top: 12px; }
    .fsh-trace-io > span { font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
    .fsh-trace-io pre { margin: 6px 0 0; font-family: var(--font-mono); font-size: 11.5px; line-height: 1.55; color: var(--ink); white-space: pre-wrap; word-break: break-word; }
    .fsh-trace-empty { padding: 22px 18px; font-family: var(--font-mono); font-size: 12px; color: var(--muted); line-height: 1.6; }
  `;
  document.head.appendChild(el);
}
function fmt(value) {
  try {
    const json = JSON.stringify(value, null, 2);
    if (!json) return String(value);
    return json.length > 1400 ? `${json.slice(0, 1400)}\n… (truncated)` : json;
  } catch {
    return String(value);
  }
}
function time(iso) {
  try {
    return new Date(iso).toLocaleTimeString("en-GB");
  } catch {
    return "";
  }
}

/**
 * Tool-call trace inspector. Numbered rows stream in staggered (the "agent
 * is working live" moment); each row shows tool name + status chip + time,
 * and expands to reveal input / output JSON. Bind to `AgentState.tool_calls`.
 */
function ToolCallTrace({
  toolCalls = [],
  title = "Tool call trace",
  style,
  ...rest
}) {
  useStyles();
  const [open, setOpen] = React.useState(null);
  const failed = toolCalls.filter(c => __ds_scope.toolTone(c.output) === "failed").length;
  return /*#__PURE__*/React.createElement("div", _extends({
    className: "fsh-trace",
    style: style
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "fsh-trace-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "fsh-trace-title"
  }, title), /*#__PURE__*/React.createElement("span", {
    className: "fsh-trace-hint"
  }, toolCalls.length === 0 ? "awaiting first call" : `${toolCalls.length} calls${failed ? ` · ${failed} failed` : ""} · click to inspect`)), toolCalls.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "fsh-trace-empty"
  }, "No tool calls yet. Ask for a recommendation to watch the agent run", " ", "match_body_template, get_recommendations and the inventory tools.") : toolCalls.map((call, i) => {
    const isOpen = open === i;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: `${call.tool}-${call.called_at}-${i}`
    }, /*#__PURE__*/React.createElement("button", {
      className: "fsh-trace-row",
      style: {
        animationDelay: `${i * 0.08}s`
      },
      "aria-expanded": isOpen,
      onClick: () => setOpen(isOpen ? null : i)
    }, /*#__PURE__*/React.createElement("span", {
      className: "fsh-trace-idx"
    }, String(i + 1).padStart(2, "0")), /*#__PURE__*/React.createElement("span", {
      className: "fsh-trace-name"
    }, call.tool), /*#__PURE__*/React.createElement(__ds_scope.ToolStatusChip, {
      status: __ds_scope.toolTone(call.output)
    }), /*#__PURE__*/React.createElement("span", {
      className: "fsh-trace-time"
    }, time(call.called_at)), /*#__PURE__*/React.createElement("span", {
      className: "fsh-trace-caret",
      "aria-hidden": "true"
    }, isOpen ? "−" : "+")), isOpen && /*#__PURE__*/React.createElement("div", {
      className: "fsh-trace-body"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fsh-trace-io"
    }, /*#__PURE__*/React.createElement("span", null, "Input"), /*#__PURE__*/React.createElement("pre", null, fmt(call.input))), /*#__PURE__*/React.createElement("div", {
      className: "fsh-trace-io"
    }, /*#__PURE__*/React.createElement("span", null, "Output"), /*#__PURE__*/React.createElement("pre", null, fmt(call.output)))));
  }));
}
Object.assign(__ds_scope, { ToolCallTrace });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/agent/ToolCallTrace.jsx", error: String((e && e.message) || e) }); }

// components/tryon/TryOnStage.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function TryOnStage({
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
  return /*#__PURE__*/React.createElement("div", _extends({
    className: "fsh-tryon",
    "data-phase": phase,
    style: {
      aspectRatio: "3 / 4",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "fsh-tryon__badge"
  }, badge), /*#__PURE__*/React.createElement("div", {
    className: "fsh-tryon__figure"
  }, baseSrc ? /*#__PURE__*/React.createElement("img", {
    src: baseSrc,
    alt: ""
  }) : children), (outfitSrc || children) && /*#__PURE__*/React.createElement("div", {
    className: "fsh-tryon__reveal"
  }, outfitSrc ? /*#__PURE__*/React.createElement("div", {
    className: "fsh-tryon__figure"
  }, /*#__PURE__*/React.createElement("img", {
    src: outfitSrc,
    alt: ""
  })) : children), /*#__PURE__*/React.createElement("div", {
    className: "fsh-tryon__shimmer"
  }), /*#__PURE__*/React.createElement("div", {
    className: "fsh-tryon__scan"
  }), phase === "idle" && !baseSrc && !children && /*#__PURE__*/React.createElement("div", {
    className: "fsh-tryon__idle"
  }, idleHint), /*#__PURE__*/React.createElement("div", {
    className: "fsh-tryon__label"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ja"
  }, labelJa), /*#__PURE__*/React.createElement("span", {
    className: "en"
  }, labelEn)));
}
Object.assign(__ds_scope, { TryOnStage });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/tryon/TryOnStage.jsx", error: String((e && e.message) || e) }); }

// ui_kits/entrance_screen/Attract.jsx
try { (() => {
/* Fashini — Entrance screen. Landscape attract mode + try-on climax.
   Glanceable from distance; the reveal loops. Exposes window.EntranceAttract. */

const NS = window.FashiniDesignSystem_c28a45;
const {
  MicroLabel,
  PriceTag,
  TryOnStage
} = NS;
const LOOK = [{
  name: "Structured wool blazer",
  price_yen: 21900
}, {
  name: "Merino turtleneck",
  price_yen: 8900
}, {
  name: "Slim tapered trouser",
  price_yen: 9900
}];
function EntranceAttract() {
  const [phase, setPhase] = React.useState("idle");
  const [k, setK] = React.useState(0);
  const [showTotal, setShowTotal] = React.useState(false);

  // loop the reveal
  React.useEffect(() => {
    let alive = true;
    function cycle() {
      setPhase("idle");
      setShowTotal(false);
      setK(x => x + 1);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!alive) return;
        setPhase("reveal");
        setTimeout(() => alive && setShowTotal(true), 2000);
      }));
    }
    cycle();
    const iv = setInterval(cycle, 6500);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);
  const total = LOOK.reduce((a, p) => a + p.price_yen, 0);
  return /*#__PURE__*/React.createElement("div", {
    className: "entrance"
  }, /*#__PURE__*/React.createElement("header", {
    className: "e-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "e-brand"
  }, /*#__PURE__*/React.createElement("strong", null, "FASHINI"), /*#__PURE__*/React.createElement(MicroLabel, null, "AI Style Advisor")), /*#__PURE__*/React.createElement(MicroLabel, null, "Store 001 \xB7 Spring floor")), /*#__PURE__*/React.createElement("div", {
    className: "e-grid"
  }, /*#__PURE__*/React.createElement("section", {
    className: "e-copy"
  }, /*#__PURE__*/React.createElement(MicroLabel, {
    tone: "accent"
  }, "Live styling \xB7 \u30B9\u30BF\u30A4\u30EA\u30F3\u30B0"), /*#__PURE__*/React.createElement("h1", {
    className: "e-kinetic"
  }, /*#__PURE__*/React.createElement("span", {
    className: "line"
  }, /*#__PURE__*/React.createElement("span", null, "Step up.")), /*#__PURE__*/React.createElement("span", {
    className: "line"
  }, /*#__PURE__*/React.createElement("span", null, "See the next")), /*#__PURE__*/React.createElement("span", {
    className: "line"
  }, /*#__PURE__*/React.createElement("span", null, "look that fits."))), /*#__PURE__*/React.createElement("p", {
    className: "e-lede"
  }, "Fashini reads your outfit and body, checks live inventory, and styles three in-stock sets \u2014 in about thirty seconds."), /*#__PURE__*/React.createElement("div", {
    className: "e-tokens"
  }, /*#__PURE__*/React.createElement("span", null, "Body profile"), /*#__PURE__*/React.createElement("span", null, "Outfit vector"), /*#__PURE__*/React.createElement("span", null, "Inventory match"))), /*#__PURE__*/React.createElement("section", {
    className: "e-stage"
  }, /*#__PURE__*/React.createElement(TryOnStage, {
    key: k,
    phase: phase,
    badge: "Lucy \xB7 realtime",
    labelJa: "\u30B9\u30BF\u30A4\u30EA\u30F3\u30B0\u5B8C\u4E86",
    labelEn: "Styled."
  }, /*#__PURE__*/React.createElement("div", {
    className: "efig"
  }, /*#__PURE__*/React.createElement("div", {
    className: "efig-head"
  }), /*#__PURE__*/React.createElement("div", {
    className: "efig-body"
  }), /*#__PURE__*/React.createElement("div", {
    className: "efig-legs"
  }))))), /*#__PURE__*/React.createElement("footer", {
    className: "e-foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "e-look"
  }, /*#__PURE__*/React.createElement(MicroLabel, {
    tone: "accent"
  }, "Explicit need \xB7 Round 2"), /*#__PURE__*/React.createElement("div", {
    className: "e-items"
  }, LOOK.map(p => /*#__PURE__*/React.createElement("div", {
    className: "e-item",
    key: p.name
  }, /*#__PURE__*/React.createElement("span", null, p.name), /*#__PURE__*/React.createElement(PriceTag, {
    amount: p.price_yen,
    size: "md"
  }))))), /*#__PURE__*/React.createElement("div", {
    className: `e-total ${showTotal ? "in" : ""}`
  }, /*#__PURE__*/React.createElement(MicroLabel, null, "Set total"), showTotal ? /*#__PURE__*/React.createElement(PriceTag, {
    amount: total,
    size: "xl",
    countUp: true
  }) : /*#__PURE__*/React.createElement(PriceTag, {
    amount: 0,
    size: "xl"
  }))));
}
window.EntranceAttract = EntranceAttract;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/entrance_screen/Attract.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mirror/Flow.jsx
try { (() => {
/* Fashini — Mirror. Vertical self-service capture + styling flow.
   Composes design-system components; steps through the real App flow.
   Exposes window.MirrorFlow. */

const NS = window.FashiniDesignSystem_c28a45;
const {
  Button,
  MicroLabel,
  PriceTag,
  Hairline,
  PrivacyChip,
  SegmentedControl,
  NumberField,
  Checkbox,
  LanguageSwitch,
  TryOnStage
} = NS;
const STEPS = ["welcome", "consent", "profile", "capture", "analyzing", "review", "complete"];
function MirrorFlow() {
  const [lang, setLang] = React.useState("en");
  const [step, setStep] = React.useState("welcome");
  const [profile, setProfile] = React.useState({
    height_cm: 168,
    weight_kg: 58,
    gender: "neutral",
    age: "26-35"
  });
  const [cam, setCam] = React.useState(false);
  const [proc, setProc] = React.useState(false);
  const [count, setCount] = React.useState(null);
  const [phase, setPhase] = React.useState("idle");
  const idx = STEPS.indexOf(step);
  const progress = Math.min(100, idx / (STEPS.length - 2) * 100);
  const go = s => setStep(s);

  // capture countdown
  React.useEffect(() => {
    if (step !== "capture") {
      setCount(null);
      return;
    }
    setCount(3);
    const t = setInterval(() => setCount(c => c === null ? null : c - 1), 900);
    return () => clearInterval(t);
  }, [step]);
  React.useEffect(() => {
    if (count === 0) {
      const t = setTimeout(() => go("analyzing"), 500);
      return () => clearTimeout(t);
    }
  }, [count]);
  React.useEffect(() => {
    if (step === "analyzing") {
      const t = setTimeout(() => go("review"), 2600);
      return () => clearTimeout(t);
    }
    if (step === "review") {
      setPhase("idle");
      requestAnimationFrame(() => requestAnimationFrame(() => setPhase("reveal")));
    }
  }, [step]);
  return /*#__PURE__*/React.createElement("div", {
    className: "mirror"
  }, /*#__PURE__*/React.createElement("header", {
    className: "m-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-brand"
  }, /*#__PURE__*/React.createElement("strong", null, "FASHINI"), /*#__PURE__*/React.createElement(MicroLabel, null, "AI Style Advisor")), /*#__PURE__*/React.createElement(LanguageSwitch, {
    value: lang,
    onChange: setLang
  })), step !== "welcome" && step !== "complete" && /*#__PURE__*/React.createElement("div", {
    className: "m-progress"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: `${progress}%`
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "m-body"
  }, step === "welcome" && /*#__PURE__*/React.createElement("section", {
    className: "m-welcome"
  }, /*#__PURE__*/React.createElement(MicroLabel, null, "Your personal store stylist"), /*#__PURE__*/React.createElement("h1", {
    className: "kinetic"
  }, /*#__PURE__*/React.createElement("span", {
    className: "line"
  }, /*#__PURE__*/React.createElement("span", null, "See your current style,")), /*#__PURE__*/React.createElement("span", {
    className: "line"
  }, /*#__PURE__*/React.createElement("span", null, "find the next look")), /*#__PURE__*/React.createElement("span", {
    className: "line"
  }, /*#__PURE__*/React.createElement("span", null, "that fits."))), /*#__PURE__*/React.createElement("p", {
    className: "m-lede"
  }, "Step in front of the mirror. Fashini reads your outfit signals and body proportions, then matches better options from real in-store inventory."), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    iconRight: /*#__PURE__*/React.createElement("span", null, "\u2192"),
    onClick: () => go("consent")
  }, "Start experience"), /*#__PURE__*/React.createElement("div", {
    className: "m-trust"
  }, /*#__PURE__*/React.createElement("span", null, "About 30 sec"), /*#__PURE__*/React.createElement("span", null, "No signup"), /*#__PURE__*/React.createElement("span", null, "Editable result"))), step === "consent" && /*#__PURE__*/React.createElement("section", {
    className: "m-panel"
  }, /*#__PURE__*/React.createElement(MicroLabel, null, "Step 01 \xB7 Privacy"), /*#__PURE__*/React.createElement("h2", null, "Clear consent before the camera opens."), /*#__PURE__*/React.createElement("p", {
    className: "m-intro"
  }, "We capture one front-facing full-body photo only after you agree, and use it for this styling analysis."), /*#__PURE__*/React.createElement("div", {
    className: "m-consent-cards"
  }, [["Only one shot", "No background recording, no face identity recognition."], ["This session only", "Used to generate body and outfit features."], ["Deleted after", "Not written to public logs or permanent links."]].map(([t, d], i) => /*#__PURE__*/React.createElement("article", {
    key: t
  }, /*#__PURE__*/React.createElement("span", null, String(i + 1).padStart(2, "0")), /*#__PURE__*/React.createElement("h3", null, t), /*#__PURE__*/React.createElement("p", null, d)))), /*#__PURE__*/React.createElement(Checkbox, {
    checked: cam,
    onChange: setCam
  }, "I agree to enable the camera and capture one front-facing full-body photo."), /*#__PURE__*/React.createElement(Checkbox, {
    checked: proc,
    onChange: setProc
  }, "I agree that AI may analyze the photo this session; results may be approximate."), /*#__PURE__*/React.createElement("div", {
    className: "m-actions"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "text",
    onClick: () => go("welcome")
  }, "\u2190 Back"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    disabled: !cam || !proc,
    iconRight: /*#__PURE__*/React.createElement("span", null, "\u2192"),
    onClick: () => go("profile")
  }, "Agree and continue"))), step === "profile" && /*#__PURE__*/React.createElement("section", {
    className: "m-panel"
  }, /*#__PURE__*/React.createElement(MicroLabel, null, "Step 02 \xB7 Profile"), /*#__PURE__*/React.createElement("h2", null, "Give visual analysis a real scale."), /*#__PURE__*/React.createElement("p", {
    className: "m-intro"
  }, "Height and weight calibrate the image. You choose age range and gender presentation; AI won't infer them."), /*#__PURE__*/React.createElement("div", {
    className: "m-form"
  }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", {
    className: "fl"
  }, "Height"), /*#__PURE__*/React.createElement(NumberField, {
    value: profile.height_cm,
    onChange: v => setProfile({
      ...profile,
      height_cm: v
    }),
    unit: "cm"
  })), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", {
    className: "fl"
  }, "Weight"), /*#__PURE__*/React.createElement(NumberField, {
    value: profile.weight_kg,
    onChange: v => setProfile({
      ...profile,
      weight_kg: v
    }),
    unit: "kg"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "fl2"
  }, "Gender presentation"), /*#__PURE__*/React.createElement(SegmentedControl, {
    size: "lg",
    value: profile.gender,
    onChange: v => setProfile({
      ...profile,
      gender: v
    }),
    options: [{
      value: "female",
      label: "Feminine"
    }, {
      value: "male",
      label: "Masculine"
    }, {
      value: "neutral",
      label: "Neutral"
    }]
  }), /*#__PURE__*/React.createElement("div", {
    className: "fl2"
  }, "Age range"), /*#__PURE__*/React.createElement(SegmentedControl, {
    size: "lg",
    value: profile.age,
    onChange: v => setProfile({
      ...profile,
      age: v
    }),
    options: ["18-25", "26-35", "36-45", "46+"]
  }), /*#__PURE__*/React.createElement("div", {
    className: "m-actions"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "text",
    onClick: () => go("consent")
  }, "\u2190 Back"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    iconRight: /*#__PURE__*/React.createElement("span", null, "\u2192"),
    onClick: () => go("capture")
  }, "Ready to capture"))), step === "capture" && /*#__PURE__*/React.createElement("section", {
    className: "m-capture"
  }, /*#__PURE__*/React.createElement(MicroLabel, null, "Step 03 \xB7 Capture"), /*#__PURE__*/React.createElement("h2", null, "Step into the frame."), /*#__PURE__*/React.createElement("div", {
    className: "cam"
  }, /*#__PURE__*/React.createElement("div", {
    className: `guide ${count !== null && count <= 2 ? "ready" : ""}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "c tl"
  }), /*#__PURE__*/React.createElement("span", {
    className: "c tr"
  }), /*#__PURE__*/React.createElement("span", {
    className: "c bl"
  }), /*#__PURE__*/React.createElement("span", {
    className: "c br"
  })), count !== null && count > 0 && /*#__PURE__*/React.createElement("div", {
    className: "countdown"
  }, count), /*#__PURE__*/React.createElement("div", {
    className: "cam-status"
  }, /*#__PURE__*/React.createElement("span", {
    className: `sl ${count !== null && count <= 2 ? "ready" : ""}`
  }), "Hold still \u2014 auto capture")), /*#__PURE__*/React.createElement("div", {
    className: "m-actions"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "text",
    onClick: () => go("profile")
  }, "\u2190 Back to profile"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "lg",
    onClick: () => go("analyzing")
  }, "Manual capture"))), step === "analyzing" && /*#__PURE__*/React.createElement("section", {
    className: "m-analyzing"
  }, /*#__PURE__*/React.createElement(MicroLabel, null, "Analyzing"), /*#__PURE__*/React.createElement("h2", null, "Reading outfit signals\u2026"), /*#__PURE__*/React.createElement(TryOnStage, {
    phase: "reveal",
    badge: "OOTD scan",
    labelJa: "\u89E3\u6790\u4E2D",
    labelEn: "Analyzing"
  }, /*#__PURE__*/React.createElement("div", {
    className: "afig"
  }, /*#__PURE__*/React.createElement("div", {
    className: "afig-head"
  }), /*#__PURE__*/React.createElement("div", {
    className: "afig-body"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "m-note"
  }, "Body handling is template-based; exact measurements are not stored or shared.")), step === "review" && /*#__PURE__*/React.createElement("section", {
    className: "m-review"
  }, /*#__PURE__*/React.createElement(MicroLabel, null, "Step 04 \xB7 OOTD"), /*#__PURE__*/React.createElement("h2", null, "Today's OOTD breakdown"), /*#__PURE__*/React.createElement("div", {
    className: "review-grid"
  }, /*#__PURE__*/React.createElement(TryOnStage, {
    phase: phase,
    badge: "Full look"
  }, /*#__PURE__*/React.createElement("div", {
    className: "afig"
  }, /*#__PURE__*/React.createElement("div", {
    className: "afig-head"
  }), /*#__PURE__*/React.createElement("div", {
    className: "afig-body"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "ootd-side"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ootd-facts"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(MicroLabel, null, "Style signals"), /*#__PURE__*/React.createElement("strong", null, "Smart casual \xB7 Navy")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(MicroLabel, null, "Silhouette"), /*#__PURE__*/React.createElement("strong", null, "Balanced"))), /*#__PURE__*/React.createElement("div", {
    className: "ootd-items"
  }, [["Top", "Ribbed knit", "Off-white · regular"], ["Bottom", "Straight denim", "Indigo · straight"], ["Shoes", "Leather sneaker", "White"]].map(([slot, name, meta]) => /*#__PURE__*/React.createElement("div", {
    className: "ootd-item",
    key: slot
  }, /*#__PURE__*/React.createElement(MicroLabel, null, slot), /*#__PURE__*/React.createElement("strong", null, name), /*#__PURE__*/React.createElement("span", null, meta)))), /*#__PURE__*/React.createElement("div", {
    className: "privacy-panel"
  }, /*#__PURE__*/React.createElement(MicroLabel, null, "Measurements not retained"), /*#__PURE__*/React.createElement("p", null, "Shoulder, inseam, bust, waist, hip and foot length are used only in-session and never shown or stored."), /*#__PURE__*/React.createElement(PrivacyChip, null, "Template-based body handling")))), /*#__PURE__*/React.createElement("div", {
    className: "m-actions"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "lg",
    onClick: () => go("capture")
  }, "Use another photo"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    iconRight: /*#__PURE__*/React.createElement("span", null, "\u2192"),
    onClick: () => go("complete")
  }, "Use this OOTD"))), step === "complete" && /*#__PURE__*/React.createElement("section", {
    className: "m-complete"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mark"
  }, "\u2713"), /*#__PURE__*/React.createElement(MicroLabel, null, "Handoff ready"), /*#__PURE__*/React.createElement("h2", null, "Sent to the styling agent."), /*#__PURE__*/React.createElement("p", {
    className: "m-intro"
  }, "A stylist can now ask about occasion, budget and style \u2014 and preview looks on this mirror."), /*#__PURE__*/React.createElement("div", {
    className: "m-summary"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(MicroLabel, null, "Body contract"), /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, "v1.2")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(MicroLabel, null, "Outfit contract"), /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, "v1.0")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(MicroLabel, null, "Detected items"), /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, "3"))), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    onClick: () => go("welcome")
  }, "Start new session"))));
}
window.MirrorFlow = MirrorFlow;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mirror/Flow.jsx", error: String((e && e.message) || e) }); }

// ui_kits/staff_ipad/Console.jsx
try { (() => {
/* Fashini — Staff iPad console. Assisted-selling control plane.
   Composes design-system components; fake agent progression for the demo.
   Exposes window.StaffConsole. */

const NS = window.FashiniDesignSystem_c28a45;
const {
  Button,
  MicroLabel,
  PriceTag,
  Hairline,
  StatusBadge,
  PrivacyChip,
  SegmentedControl,
  LanguageSwitch,
  FeedbackTags,
  RecommendationCard,
  ToolCallTrace,
  AhaTimeline,
  ConstraintDelta,
  TryOnStage
} = NS;
const now = () => new Date().toISOString();
const SETS_R1 = [{
  set_id: "set_a1",
  round: 1,
  rec_type: "explicit_need",
  reason: "A smart-casual set in your navy palette — a tailored blazer sharpens the loose silhouette you arrived in.",
  products: [{
    product_id: "p1",
    name: "Wool-blend tailored blazer",
    category: "outerwear",
    price_yen: 18900,
    colors: ["Navy"],
    fit: "tailored"
  }, {
    product_id: "p2",
    name: "Fine merino crew knit",
    category: "top",
    price_yen: 7900,
    colors: ["Off-white"],
    fit: "regular"
  }, {
    product_id: "p3",
    name: "Slim tapered trouser",
    category: "bottom",
    price_yen: 9900,
    colors: ["Charcoal"],
    fit: "slim"
  }]
}, {
  set_id: "set_b2",
  round: 1,
  rec_type: "similar",
  reason: "Close to what you're wearing now, upgraded in fabric — an easy yes if you like to stay in your lane.",
  products: [{
    product_id: "p4",
    name: "Cotton overshirt",
    category: "outerwear",
    price_yen: 12900,
    colors: ["Stone"],
    fit: "relaxed"
  }, {
    product_id: "p5",
    name: "Ribbed long-sleeve tee",
    category: "top",
    price_yen: 4900,
    colors: ["Black"],
    fit: "regular"
  }, {
    product_id: "p6",
    name: "Straight-leg denim",
    category: "bottom",
    price_yen: 8900,
    colors: ["Indigo"],
    fit: "straight"
  }]
}, {
  set_id: "set_c3",
  round: 1,
  rec_type: "seasonal",
  reason: "A seasonal push: lighter layers for the store's spring floor set, still grounded in neutrals.",
  products: [{
    product_id: "p7",
    name: "Unstructured linen jacket",
    category: "outerwear",
    price_yen: 15900,
    colors: ["Sand"],
    fit: "relaxed"
  }, {
    product_id: "p8",
    name: "Silk-touch camisole",
    category: "top",
    price_yen: 5900,
    colors: ["Ivory"],
    fit: "regular"
  }, {
    product_id: "p9",
    name: "Pleated wide trouser",
    category: "bottom",
    price_yen: 11900,
    colors: ["Olive"],
    fit: "wide"
  }]
}];
const SETS_R2 = [{
  set_id: "set_a4",
  round: 2,
  rec_type: "explicit_need",
  reason: "Re-run with fit=tailored preferred and red avoided. Same navy direction, tighter through the body.",
  products: [{
    product_id: "p10",
    name: "Structured wool blazer",
    category: "outerwear",
    price_yen: 21900,
    colors: ["Navy"],
    fit: "tailored"
  }, {
    product_id: "p11",
    name: "Merino turtleneck",
    category: "top",
    price_yen: 8900,
    colors: ["Grey"],
    fit: "slim"
  }, {
    product_id: "p12",
    name: "Slim tapered trouser",
    category: "bottom",
    price_yen: 9900,
    colors: ["Charcoal"],
    fit: "slim"
  }]
}, {
  set_id: "set_d5",
  round: 2,
  rec_type: "style",
  reason: "A sharper monochrome take on the same brief, for when precision matters more than softness.",
  products: [{
    product_id: "p13",
    name: "Double-faced coat",
    category: "outerwear",
    price_yen: 28900,
    colors: ["Ink"],
    fit: "tailored"
  }, {
    product_id: "p14",
    name: "Fine-gauge knit",
    category: "top",
    price_yen: 9900,
    colors: ["Off-white"],
    fit: "slim"
  }, {
    product_id: "p15",
    name: "Cropped cigarette trouser",
    category: "bottom",
    price_yen: 12900,
    colors: ["Black"],
    fit: "slim"
  }]
}];
function toolCallsFor(stage) {
  const base = [{
    tool: "classify_route",
    input: {
      text: "recommend three sets"
    },
    output: {
      status: "success",
      route: "recommendation"
    },
    called_at: now()
  }, {
    tool: "match_body_template",
    input: {
      height_cm: 168,
      weight_kg: 58
    },
    output: {
      status: "success",
      template_id: "tpl_07"
    },
    called_at: now()
  }, {
    tool: "get_recommendations",
    input: {
      route: "recommendation",
      round: 1
    },
    output: {
      status: "success",
      sets: 3
    },
    called_at: now()
  }, {
    tool: "check_inventory",
    input: {
      store_id: "store_001",
      skus: 9
    },
    output: {
      status: "held",
      reserved: 9
    },
    called_at: now()
  }];
  if (stage === "refined" || stage === "confirmed" || stage === "handoff") {
    base.push({
      tool: "apply_feedback",
      input: {
        dimension: "fit",
        value: "too_loose"
      },
      output: {
        status: "success",
        delta: 2
      },
      called_at: now()
    }, {
      tool: "get_recommendations",
      input: {
        route: "recommendation",
        round: 2
      },
      output: {
        status: "success",
        sets: 2
      },
      called_at: now()
    });
  }
  if (stage === "confirmed" || stage === "handoff") {
    base.push({
      tool: "reserve_items",
      input: {
        set_id: "set_a4"
      },
      output: {
        ok: true,
        hold_min: 30
      },
      called_at: now()
    });
  }
  if (stage === "handoff") {
    base.push({
      tool: "tryon_handoff",
      input: {
        set_id: "set_a4",
        use_own_face: false
      },
      output: {
        ok: true,
        template_id: "tpl_07"
      },
      called_at: now()
    });
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
    idle: "communicating",
    recommended: "recommending",
    refined: "recommending",
    previewing: "previewing",
    confirmed: "confirmed",
    handoff: "handoff_ready"
  };
  const ahaStage = {
    previewing: "lucy_preview",
    confirmed: "google_generating",
    handoff: "handoff_ready"
  }[stage] || "idle";
  function recommend() {
    setSets(SETS_R1);
    setSelected("set_a1");
    setRound(1);
    setStage("recommended");
    setFeedback(null);
  }
  function giveFeedback(tag) {
    setFeedback(tag.dimension);
    setSets(SETS_R2);
    setSelected("set_a4");
    setRound(2);
    setStage("refined");
    setPhase("idle");
  }
  function preview() {
    setStage("previewing");
    setPhase("idle");
    setTryKey(k => k + 1);
    requestAnimationFrame(() => requestAnimationFrame(() => setPhase("reveal")));
  }
  function confirm() {
    setStage("confirmed");
    setTimeout(() => setStage("handoff"), 1400);
  }
  const selectedSet = sets.find(s => s.set_id === selected);
  const toolCalls = stage === "idle" ? [] : toolCallsFor(stage);
  return /*#__PURE__*/React.createElement("div", {
    className: "ipad"
  }, /*#__PURE__*/React.createElement("header", {
    className: "ipad-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ipad-brand"
  }, /*#__PURE__*/React.createElement("strong", null, "FASHINI"), /*#__PURE__*/React.createElement(MicroLabel, null, "Staff \xB7 store_001")), /*#__PURE__*/React.createElement("div", {
    className: "ipad-status"
  }, /*#__PURE__*/React.createElement(StatusBadge, {
    label: "agent",
    value: statusMap[stage]
  }), /*#__PURE__*/React.createElement(StatusBadge, {
    label: "route",
    value: stage === "idle" ? "unclear" : "recommendation",
    active: stage !== "idle"
  }), /*#__PURE__*/React.createElement(StatusBadge, {
    label: "round",
    value: round
  }), /*#__PURE__*/React.createElement(StatusBadge, {
    label: "lucy",
    value: phase === "reveal" ? "previewing" : "idle"
  })), /*#__PURE__*/React.createElement("div", {
    className: "ipad-top-right"
  }, /*#__PURE__*/React.createElement(LanguageSwitch, {
    value: lang,
    onChange: setLang
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm"
  }, "Staff takeover"))), /*#__PURE__*/React.createElement("div", {
    className: "ipad-grid"
  }, /*#__PURE__*/React.createElement("section", {
    className: "ipad-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "need-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "need-input"
  }, /*#__PURE__*/React.createElement(MicroLabel, null, "Customer need"), /*#__PURE__*/React.createElement("textarea", {
    value: need,
    onChange: e => setNeed(e.target.value),
    rows: 2
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    iconRight: /*#__PURE__*/React.createElement("span", null, "\u2192"),
    onClick: recommend
  }, round === 0 ? "Recommend" : "Re-run")), /*#__PURE__*/React.createElement("div", {
    className: "rec-list"
  }, sets.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, /*#__PURE__*/React.createElement(MicroLabel, null, "No recommendation sets yet"), /*#__PURE__*/React.createElement("p", null, "Capture a customer need and run the agent to see three in-stock sets materialize here.")) : sets.map((s, i) => /*#__PURE__*/React.createElement(RecommendationCard, {
    key: s.set_id,
    set: s,
    index: i,
    selected: s.set_id === selected,
    onSelect: () => setSelected(s.set_id),
    onPreview: preview,
    onConfirm: confirm
  }))), sets.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "feedback-bar"
  }, /*#__PURE__*/React.createElement(MicroLabel, null, "Feedback"), /*#__PURE__*/React.createElement(FeedbackTags, {
    active: feedback,
    onSelect: giveFeedback
  }))), /*#__PURE__*/React.createElement("aside", {
    className: "ipad-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "preview-block"
  }, /*#__PURE__*/React.createElement(TryOnStage, {
    key: tryKey,
    phase: phase,
    badge: "Lucy \xB7 realtime",
    idleHint: selectedSet ? "Tap Preview on a set to try it on." : "Select a set to preview."
  }, /*#__PURE__*/React.createElement("div", {
    className: "fig"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fig-head"
  }), /*#__PURE__*/React.createElement("div", {
    className: "fig-body"
  }), /*#__PURE__*/React.createElement("div", {
    className: "fig-legs"
  }))), selectedSet && /*#__PURE__*/React.createElement("div", {
    className: "preview-meta"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(MicroLabel, {
    tone: "accent"
  }, selectedSet.rec_type.replace("_", " ")), /*#__PURE__*/React.createElement("span", {
    className: "mono-sm"
  }, selectedSet.set_id)), /*#__PURE__*/React.createElement(PriceTag, {
    amount: selectedSet.products.reduce((a, p) => a + p.price_yen, 0),
    size: "md"
  }))), /*#__PURE__*/React.createElement(AhaTimeline, {
    stage: ahaStage,
    narrative: stage === "handoff" ? "Look confirmed and reserved. Try-on handoff payload is ready for image generation." : stage === "previewing" ? "Lucy realtime preview running on the mirror. Awaiting confirmation." : "Agent runtime is waiting for the first customer action."
  }), stage === "refined" || stage === "confirmed" || stage === "handoff" ? /*#__PURE__*/React.createElement(ConstraintDelta, {
    prefer: [{
      dimension: "fit",
      value: "tailored",
      reason: "was too loose"
    }],
    avoid: feedback === "color" ? [{
      dimension: "color",
      value: "red",
      reason: "disliked"
    }] : [],
    budgetYen: 45000
  }) : null, /*#__PURE__*/React.createElement(ToolCallTrace, {
    toolCalls: toolCalls
  }), stage === "handoff" && /*#__PURE__*/React.createElement("div", {
    className: "pickup"
  }, /*#__PURE__*/React.createElement(MicroLabel, null, "Purchase \xB7 in-store pickup route"), /*#__PURE__*/React.createElement("ol", {
    className: "route"
  }, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", null, "01"), " Reserved at register \u2014 hold 30 min"), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", null, "02"), " Fitting room 3 \u2192 staff brings set_a4"), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", null, "03"), " Pickup counter B \xB7 floor 2")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    block: true,
    iconRight: /*#__PURE__*/React.createElement("span", null, "\u2192")
  }, "Confirm & reserve")), /*#__PURE__*/React.createElement("div", {
    className: "privacy-foot"
  }, /*#__PURE__*/React.createElement(PrivacyChip, null, "Measurements not retained \xB7 face use consent-gated")))));
}
window.StaffConsole = StaffConsole;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/staff_ipad/Console.jsx", error: String((e && e.message) || e) }); }

__ds_ns.AhaTimeline = __ds_scope.AhaTimeline;

__ds_ns.ConstraintDelta = __ds_scope.ConstraintDelta;

__ds_ns.ProductRow = __ds_scope.ProductRow;

__ds_ns.RecTypeLabel = __ds_scope.RecTypeLabel;

__ds_ns.RecommendationCard = __ds_scope.RecommendationCard;

__ds_ns.ToolCallTrace = __ds_scope.ToolCallTrace;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Hairline = __ds_scope.Hairline;

__ds_ns.MicroLabel = __ds_scope.MicroLabel;

__ds_ns.PriceTag = __ds_scope.PriceTag;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.FeedbackTags = __ds_scope.FeedbackTags;

__ds_ns.LanguageSwitch = __ds_scope.LanguageSwitch;

__ds_ns.NumberField = __ds_scope.NumberField;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

__ds_ns.PrivacyChip = __ds_scope.PrivacyChip;

__ds_ns.StatusBadge = __ds_scope.StatusBadge;

__ds_ns.ToolStatusChip = __ds_scope.ToolStatusChip;

__ds_ns.TryOnStage = __ds_scope.TryOnStage;

})();
