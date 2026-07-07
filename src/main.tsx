import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { EntranceScreen } from "./EntranceScreen";
// Old styles first, then the Fashini design tokens so the DS values
// (cobalt --accent, #111 --ink, …) win over the retired cream/lime tokens.
import "./styles.css";
import "./design/fashini.css";

// Touchpoint routing. Default is the fitting-room mirror capture flow;
// `?scene=entrance` mounts the entrance big-screen attract loop.
const scene = new URLSearchParams(window.location.search).get("scene");

createRoot(document.getElementById("root")!).render(
  <StrictMode>{scene === "entrance" ? <EntranceScreen /> : <App />}</StrictMode>
);
