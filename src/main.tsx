import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Load the retired global styles + design tokens FIRST, before App — App and
// the screens import the per-screen CSS (mirror/console/entrance), so those
// load afterwards and win over styles.css at equal specificity (kills serif /
// old-token bleed like `.analysis-copy h2 { Playfair }`). fashini tokens after
// styles.css so cobalt --accent / #111 --ink win over the cream/lime tokens.
import "./styles.css";
import "./design/fashini.css";
import App from "./App";
import { EntranceScreen } from "./EntranceScreen";

// Touchpoint routing. Default is the fitting-room mirror capture flow;
// `?scene=entrance` mounts the entrance big-screen attract loop.
const scene = new URLSearchParams(window.location.search).get("scene");

createRoot(document.getElementById("root")!).render(
  <StrictMode>{scene === "entrance" ? <EntranceScreen /> : <App />}</StrictMode>
);
