import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
// Old styles first, then the Fashini design tokens so the DS values
// (cobalt --accent, #111 --ink, …) win over the retired cream/lime tokens.
import "./styles.css";
import "./design/fashini.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
