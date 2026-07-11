import React from "react";

/**
 * GuidePet — a small, tasteful companion that voices the agent's lines via a
 * speech bubble and reacts with subtle emotion. Premium and geometric (a glass
 * "pebble" with a soft cobalt core + two eyes), NOT a cartoon mascot. It lives
 * in a corner and never covers the reflection; it animates in on entry and
 * waves off on exit (e.g. after a purchase is confirmed).
 *
 * moods: idle · listening · working · talking · happy
 */
export function GuidePet({ visible = true, message, mood = "idle", side = "right", style, ...rest }) {
  const [rendered, setRendered] = React.useState(visible);
  const [leaving, setLeaving] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      setRendered(true);
      setLeaving(false);
      return;
    }
    if (rendered) {
      setLeaving(true);
      const t = setTimeout(() => {
        setRendered(false);
        setLeaving(false);
      }, 420);
      return () => clearTimeout(t);
    }
  }, [visible, rendered]);

  if (!rendered) return null;

  const bodyAnim = {
    idle: "fsh-pet-idle 2.8s var(--ease-aura) infinite",
    listening: "fsh-pet-idle 1.4s var(--ease-aura) infinite",
    working: "fsh-pet-idle 1s var(--ease-aura) infinite",
    talking: "fsh-pet-talk 0.5s var(--ease-aura) infinite",
    happy: "fsh-pet-happy 0.6s var(--ease-out)"
  }[mood];

  // eyes react per mood (height / radius); "happy" arcs, "working" squints.
  const eye =
    mood === "happy"
      ? { width: 9, height: 5, borderRadius: "9px 9px 0 0", background: "var(--accent-bright)" }
      : mood === "working"
        ? { width: 9, height: 2.5, borderRadius: 3, background: "var(--on-dark-2)" }
        : mood === "listening"
          ? { width: 8, height: 8, borderRadius: "50%", background: "var(--accent-bright)" }
          : { width: 7, height: 7, borderRadius: "50%", background: "var(--on-dark)" };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: side === "right" ? "flex-end" : "flex-start",
        gap: 10,
        pointerEvents: "none",
        animation: `${leaving ? "fsh-pet-out" : "fsh-pet-in"} 0.42s var(--ease-out) both`,
        ...style
      }}
      {...rest}
    >
      {message && (
        <div
          style={{
            maxWidth: 210,
            background: "var(--glass-raised-fill)",
            WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
            backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
            border: "1px solid var(--glass-hairline)",
            borderTopColor: "var(--glass-edge)",
            color: "var(--on-dark)",
            padding: "11px 15px",
            borderRadius: 18,
            [side === "right" ? "borderBottomRightRadius" : "borderBottomLeftRadius"]: 5,
            fontSize: 14,
            lineHeight: 1.45,
            boxShadow: "var(--glass-shadow-raised)"
          }}
        >
          {message}
        </div>
      )}
      {/* the pet body */}
      <div
        style={{
          position: "relative",
          width: 58,
          height: 58,
          borderRadius: 20,
          background: "var(--glass-raised-fill)",
          WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
          backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
          border: "1px solid var(--glass-hairline)",
          borderTopColor: "var(--glass-edge)",
          boxShadow: `var(--glass-shadow-raised), inset 0 0 26px -8px var(--accent-glow)`,
          display: "grid",
          placeItems: "center",
          animation: bodyAnim
        }}
      >
        {/* listening halo */}
        {mood === "listening" && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: -4,
              borderRadius: 24,
              border: "1px solid var(--accent-bright)",
              opacity: 0.5,
              animation: "fsh-live-pulse 1.6s var(--ease-out) infinite"
            }}
          />
        )}
        {/* eyes */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ display: "block", transition: "all var(--dur-fast) var(--ease-out)", ...eye }} />
          <span style={{ display: "block", transition: "all var(--dur-fast) var(--ease-out)", ...eye }} />
        </div>
      </div>
    </div>
  );
}
