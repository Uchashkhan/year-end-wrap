import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Development only: the Motion Inspector's preview frame needs its virtual clock
 * installed before the app's modules load, so the dev server adds one module
 * script ahead of the entry. It does nothing unless the page is the inspector's
 * frame (`?motionFrame`). Not applied to production builds (`apply: "serve"`).
 */
const motionInspectorFrame = (): Plugin => ({
  name: "motion-inspector-frame",
  apply: "serve",
  transformIndexHtml(html) {
    // (the entry may carry a cache-busting query, e.g. /src/main.tsx?t=…)
    return html.replace(/<script type="module" src="\/src\/main\.tsx/, '<script type="module" src="/src/inspector/frameBoot.ts"></script>\n    $&');
  },
});

export default defineConfig({
  plugins: [react(), motionInspectorFrame()],
  server: { port: 5180 },
});
