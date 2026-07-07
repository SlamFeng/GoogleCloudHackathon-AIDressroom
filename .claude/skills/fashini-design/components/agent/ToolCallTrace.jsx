import React from "react";
import { ToolStatusChip, toolTone } from "../status/ToolStatusChip.jsx";

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
export function ToolCallTrace({ toolCalls = [], title = "Tool call trace", style, ...rest }) {
  useStyles();
  const [open, setOpen] = React.useState(null);
  const failed = toolCalls.filter((c) => toolTone(c.output) === "failed").length;

  return (
    <div className="fsh-trace" style={style} {...rest}>
      <div className="fsh-trace-head">
        <span className="fsh-trace-title">{title}</span>
        <span className="fsh-trace-hint">
          {toolCalls.length === 0
            ? "awaiting first call"
            : `${toolCalls.length} calls${failed ? ` · ${failed} failed` : ""} · click to inspect`}
        </span>
      </div>

      {toolCalls.length === 0 ? (
        <div className="fsh-trace-empty">
          No tool calls yet. Ask for a recommendation to watch the agent run{" "}
          match_body_template, get_recommendations and the inventory tools.
        </div>
      ) : (
        toolCalls.map((call, i) => {
          const isOpen = open === i;
          return (
            <React.Fragment key={`${call.tool}-${call.called_at}-${i}`}>
              <button
                className="fsh-trace-row"
                style={{ animationDelay: `${i * 0.08}s` }}
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : i)}
              >
                <span className="fsh-trace-idx">{String(i + 1).padStart(2, "0")}</span>
                <span className="fsh-trace-name">{call.tool}</span>
                <ToolStatusChip status={toolTone(call.output)} />
                <span className="fsh-trace-time">{time(call.called_at)}</span>
                <span className="fsh-trace-caret" aria-hidden="true">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              {isOpen && (
                <div className="fsh-trace-body">
                  <div className="fsh-trace-io">
                    <span>Input</span>
                    <pre>{fmt(call.input)}</pre>
                  </div>
                  <div className="fsh-trace-io">
                    <span>Output</span>
                    <pre>{fmt(call.output)}</pre>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })
      )}
    </div>
  );
}
