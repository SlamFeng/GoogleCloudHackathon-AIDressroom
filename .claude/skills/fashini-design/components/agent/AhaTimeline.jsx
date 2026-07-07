import React from "react";

/**
 * Aha timeline — the choreographed demo rail: Lucy realtime → Google
 * fallback → try-on handoff. Bind to `AgentState.aha_demo`. The active
 * stage is highlighted in cobalt.
 */
export function AhaTimeline({ stage = "idle", narrative, steps, style, ...rest }) {
  const defaultSteps = [
    { key: "lucy_preview", label: "Lucy realtime", value: "previewing" },
    { key: "google_fallback", label: "Google fallback", value: "generating" },
    { key: "handoff", label: "Try-on handoff", value: "ready" }
  ];
  const list = steps || defaultSteps;
  const activeMap = {
    lucy_preview: ["lucy_preview"],
    google_generating: ["google_fallback"],
    google_ready: ["google_fallback"],
    handoff_ready: ["handoff"]
  };
  const activeKeys = activeMap[stage] || [];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(200px, 0.9fr) 1.6fr",
        gap: 20,
        padding: 20,
        border: "1px solid var(--hairline)",
        borderRadius: "var(--radius-card)",
        background: "var(--surface)",
        ...style
      }}
      {...rest}
    >
      <div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--accent)"
          }}
        >
          Aha demo
        </span>
        <strong
          style={{
            display: "block",
            marginTop: 8,
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            textTransform: "capitalize"
          }}
        >
          {String(stage).replaceAll("_", " ")}
        </strong>
        <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.5, color: "var(--muted)" }}>
          {narrative || "Agent runtime is waiting for the first customer action."}
        </p>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        {list.map((s) => {
          const active = activeKeys.includes(s.key);
          return (
            <div
              key={s.key}
              style={{
                flex: 1,
                padding: "14px 14px",
                borderRadius: "var(--radius-control)",
                border: `1px solid ${active ? "var(--accent)" : "var(--hairline)"}`,
                background: active ? "var(--accent-soft)" : "var(--inset)",
                transition: "background var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out)"
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: active ? "var(--accent)" : "var(--muted)"
                }}
              >
                {s.label}
              </span>
              <strong
                style={{
                  display: "block",
                  marginTop: 8,
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: active ? "var(--accent)" : "var(--ink)"
                }}
              >
                {s.value}
              </strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}
