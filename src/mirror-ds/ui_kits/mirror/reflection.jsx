/* Fashini Magic Mirror — UI kit shared shell.
   The live CAMERA REFLECTION is the hero at every stage; here we can't run a
   real camera, so `Reflection` is an honest CSS stand-in: a dim, cool
   fitting-room scene with a softly-lit figure suggested by layered gradients.
   `MirrorFrame` is the portrait kiosk (9:16) that scales to the viewport. */

const { GlassPanel } = window.FashiniMirrorDesignSystem_c521b8;

// A softly-lit standing figure, suggested (not drawn) with radial gradients.
function ReflectionFigure() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
      {/* head */}
      <div style={{
        position: "absolute", left: "50%", top: "16%", width: "15%", aspectRatio: "0.82",
        transform: "translateX(-50%)", borderRadius: "50%",
        background: "radial-gradient(closest-side, rgba(200,198,206,0.5), rgba(120,120,132,0.18) 70%, transparent)"
      }} />
      {/* shoulders / torso */}
      <div style={{
        position: "absolute", left: "50%", top: "30%", width: "56%", height: "56%",
        transform: "translateX(-50%)",
        background: "radial-gradient(60% 70% at 50% 20%, rgba(176,178,190,0.42), rgba(90,92,104,0.16) 55%, transparent 74%)",
        borderRadius: "44% 44% 30% 30% / 30% 30% 20% 20%"
      }} />
    </div>
  );
}

// The reflection layer. `dim` softly blurs + darkens it (attract, pre-consent);
// `figure` toggles the suggested person.
function Reflection({ dim = false, figure = true, tint = "cool" }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#0a0a0c" }}>
      <div style={{
        position: "absolute", inset: 0,
        background: tint === "warm"
          ? "radial-gradient(75% 60% at 50% 34%, #3b3a3c 0%, #201f24 46%, #0b0b0f 100%)"
          : "radial-gradient(75% 60% at 50% 34%, #3a3f4c 0%, #20232c 46%, #0a0b0f 100%)",
        transform: "scaleX(-1)",
        filter: dim ? "blur(9px) brightness(0.62) saturate(0.85)" : "none",
        transition: "filter var(--dur-slow) var(--ease-out)"
      }}>
        {figure && <ReflectionFigure />}
      </div>
      {/* soft floor gradient + faint vignette */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(0,0,0,0.5) 100%)" }} />
      {/* subtle grain */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.05, mixBlendMode: "overlay",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
      }} />
    </div>
  );
}

// Legibility scrims — top for the camera chip / controls, bottom for sheets.
function Scrims({ bottom = true }) {
  return (
    <div aria-hidden="true" style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      background: `linear-gradient(to bottom, var(--scrim-top) 0%, transparent 22%, transparent ${bottom ? "52%" : "100%"}, ${bottom ? "var(--scrim-bottom) 100%" : "transparent"})`
    }} />
  );
}

// The portrait kiosk frame. container-type lets type scale to the FRAME width.
function MirrorFrame({ children, label }) {
  return (
    <div
      data-screen-label={label}
      style={{
        position: "relative",
        height: "min(92vh, calc(92vw * 16 / 9))",
        aspectRatio: "9 / 16",
        borderRadius: 30,
        overflow: "hidden",
        containerType: "inline-size",
        background: "#0a0a0c",
        boxShadow: "0 40px 120px -40px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.05)",
        flex: "0 0 auto"
      }}
    >
      {children}
    </div>
  );
}

Object.assign(window, { Reflection, ReflectionFigure, Scrims, MirrorFrame });
