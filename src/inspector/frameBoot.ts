/**
 * Motion Inspector — preview frame boot (development only).
 *
 * Vite's dev server injects this module before the app's entry (vite.config.ts,
 * `serve` only); it is never part of a production build. Outside the inspector's
 * preview frame (no `?motionFrame`) it does nothing.
 *
 * In the frame it installs the virtual clock before any app module (GSAP, Motion,
 * React) loads, then exposes a small control surface to the inspector page:
 * `window.__wrapInspector`. Navigation goes through the story's own keyboard
 * and button handling, so every hand-over is the production one.
 * (Only pure modules are imported here, so nothing reads the clock before it exists.)
 */
import { installVirtualClock, type VirtualClock } from "./clock";
import { createObserver, type ObserveOptions, type Observation } from "./observe";

export interface FrameApi {
  clock: VirtualClock;
  ready: Promise<void>;
  /** Virtual time since the current origin (s). */
  time(): number;
  /** Start a new observation; its origin is now. */
  observe(o: ObserveOptions): void;
  result(): Observation | null;
  next(): void;
  prev(): void;
  /** The home banner's start control (into 01). */
  openStory(): boolean;
  /** "03 Live classes — 3 / 11", or "home". */
  label(): string;
  /**
   * Full journey: start a new observation whenever the story moves to another
   * screen, at the virtual step it happened. Keyed by the label's screen number.
   */
  follow(map: Record<string, ObserveOptions> | null): void;
  timelines(): Promise<{ label: string; source: string; duration: number; time: number }[]>;
}

if (new URLSearchParams(location.search).has("motionFrame")) {
  const clock = installVirtualClock();
  let origin = 0;
  let obs: ReturnType<typeof createObserver> | null = null;
  let followMap: Record<string, ObserveOptions> | null = null;
  let lastLabel = "";
  const labelNow = () => document.querySelector(".story")?.getAttribute("aria-label") ?? "home";
  clock.onStep((t) => {
    if (followMap) {
      const l = labelNow();
      if (l !== lastLabel) {
        lastLabel = l;
        origin = t;
        obs = createObserver(followMap[l.slice(0, 2)] ?? { heroSel: null, offerAt: null });
      }
    }
    obs?.sample(t - origin);
  });

  const key = (k: string) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
  const ready = (async () => {
    await new Promise<void>((res) => (document.readyState === "complete" ? res() : addEventListener("load", () => res(), { once: true })));
    await document.fonts.ready;
    // the app's first render
    for (let i = 0; i < 200 && !document.querySelector("#root > *"); i++) await new Promise<void>((r) => requestIdleCallbackPolyfill(r));
  })();

  const api: FrameApi = {
    clock,
    ready,
    time: () => clock.now() - origin,
    observe(o) {
      origin = clock.now();
      obs = createObserver(o);
      obs.sample(0);
    },
    result: () => obs?.result() ?? null,
    next: () => key("ArrowRight"),
    prev: () => key("ArrowLeft"),
    openStory() {
      const b = [...document.querySelectorAll<HTMLButtonElement>(".home button, button")].find((x) => /দেখো|খাতা|খোলো|শুরু/.test(x.textContent ?? ""));
      b?.click();
      return !!b;
    },
    label: labelNow,
    follow(map) {
      followMap = map;
      lastLabel = labelNow();
    },
    async timelines() {
      const m = await import("../motion/timeline");
      return m.liveTimelineEntries().map(({ handle, label }) => ({ label, source: handle.source, duration: handle.duration, time: handle.time }));
    },
  };
  (window as unknown as { __wrapInspector: FrameApi }).__wrapInspector = api;
  document.documentElement.classList.add("motion-frame");
}

/** A real (unvirtualised) short wait: the clock owns setTimeout in the frame. */
function requestIdleCallbackPolyfill(r: () => void) {
  const ch = new MessageChannel();
  ch.port1.onmessage = () => r();
  ch.port2.postMessage(0);
}
