import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/tokens.css";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// dev only: lets review tooling slow every GSAP timeline (e.g. 0.25× motion review)
if (import.meta.env.DEV) import("gsap").then((m) => ((window as unknown as { __gsap: unknown }).__gsap = m.default));
