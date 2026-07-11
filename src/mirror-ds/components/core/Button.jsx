import React from "react";

let injected = false;
function useStyles() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-fashini", "button");
  el.textContent = `
    .fshm-btn {
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
                  box-shadow var(--dur-fast) var(--ease-out),
                  color var(--dur-fast) var(--ease-out);
      white-space: nowrap;
    }
    .fshm-btn:active:not(:disabled) { transform: scale(0.975); }
    .fshm-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .fshm-btn:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }

    .fshm-btn--sm { height: 40px; padding: 0 16px; font-size: 13px; }
    .fshm-btn--md { height: 48px; padding: 0 22px; font-size: 15px; }
    .fshm-btn--lg { height: 64px; padding: 0 30px; font-size: 17px; }
    .fshm-btn--block { width: 100%; }

    /* primary — the cobalt action; glows softly on the dark surface */
    .fshm-btn--primary { background: var(--accent); color: var(--accent-ink); box-shadow: 0 10px 30px -10px var(--accent-glow); }
    .fshm-btn--primary:hover:not(:disabled) { background: var(--accent-bright); box-shadow: 0 12px 36px -8px var(--accent-glow); }

    /* glass — frosted, for secondary actions on the mirror */
    .fshm-btn--glass {
      background: var(--glass-pill-fill);
      -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
      backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
      color: var(--on-dark);
      border-color: var(--glass-hairline);
      border-top-color: var(--glass-edge);
    }
    .fshm-btn--glass:hover:not(:disabled) { border-color: rgba(255,255,255,0.34); }

    /* ghost — quietest; a bare tappable label on glass */
    .fshm-btn--ghost { background: rgba(255,255,255,0.06); color: var(--on-dark); }
    .fshm-btn--ghost:hover:not(:disabled) { background: rgba(255,255,255,0.12); }

    /* text — link-like, for "← Back" / "Just pick for me" */
    .fshm-btn--text { background: transparent; color: var(--on-dark-2); padding-left: 6px; padding-right: 6px; }
    .fshm-btn--text:hover:not(:disabled) { color: var(--on-dark); }
  `;
  document.head.appendChild(el);
}

/**
 * Fashini Mirror action button. The cobalt accent is reserved for `primary`;
 * everything else is glass / ghost / text on the dark surface.
 */
export function Button({
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
  const cls = [
    "fshm-btn",
    `fshm-btn--${variant}`,
    `fshm-btn--${size}`,
    block ? "fshm-btn--block" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");
  // Defensively strip non-DOM props (some JSX transforms leak object-rest keys).
  ["variant", "size", "block", "icon", "iconRight"].forEach((k) => {
    delete rest[k];
  });
  return (
    <button type="button" className={cls} {...rest}>
      {icon}
      {children}
      {iconRight}
    </button>
  );
}
