import React from "react";

// Data-driven so the same source renders in JSX and plain-createElement contexts.
// 24×24 grid, 2px stroke, round caps — matches the system's hairline weight.
const ICONS = {
  "arrow-left": [["line", { x1: 19, y1: 12, x2: 5, y2: 12 }], ["polyline", { points: "12 19 5 12 12 5" }]],
  "arrow-right": [["line", { x1: 5, y1: 12, x2: 19, y2: 12 }], ["polyline", { points: "12 5 19 12 12 19" }]],
  camera: [["path", { d: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" }], ["circle", { cx: 12, cy: 13, r: 4 }]],
  hand: [
    ["path", { d: "M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2" }],
    ["path", { d: "M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2" }],
    ["path", { d: "M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" }],
    ["path", { d: "M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" }]
  ],
  "thumbs-up": [
    ["path", { d: "M7 10v12" }],
    ["path", { d: "M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z" }]
  ],
  fist: [
    ["path", { d: "M6 14a6 6 0 0 1 12 0v2a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4Z" }],
    ["path", { d: "M8 12V9a1.5 1.5 0 0 1 3 0v3" }],
    ["path", { d: "M11 12V8a1.5 1.5 0 0 1 3 0v4" }],
    ["path", { d: "M14 12V9.5a1.5 1.5 0 0 1 3 0V12" }]
  ],
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

/**
 * The Fashini Mirror icon set — clean 24×24, 2px-stroke, round-cap glyphs on
 * `currentColor`, matching the system's hairline weight. Replaces emoji so the
 * kiosk reads as one crafted system. Names include the gesture glyphs used
 * hands-free: `hand` (✋ talk), `thumbs-up` (👍 confirm), `fist` (✊ back).
 */
export function Icon({ name, size = 20, stroke = 2, style, ...rest }) {
  const parts = ICONS[name] || [];
  return React.createElement(
    "svg",
    { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { display: "block", flex: "0 0 auto", ...style }, ...rest },
    parts.map((p, i) => React.createElement(p[0], { key: i, ...p[1] }))
  );
}

export const iconNames = Object.keys(ICONS);
