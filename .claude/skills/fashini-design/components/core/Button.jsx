import React from "react";

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
    "fsh-btn",
    `fsh-btn--${variant}`,
    `fsh-btn--${size}`,
    block ? "fsh-btn--block" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type="button" className={cls} {...rest}>
      {icon}
      {children}
      {iconRight}
    </button>
  );
}
