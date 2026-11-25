import type { AnimationPlaybackControls } from "motion/react";

/**
 * One playback interface over the four animation clocks the Wrap uses:
 *   GSAP timelines      03, 04, 05, 11, Bird cover / closing
 *   Motion sequences    01, 02, 06, 07, 10, nav
 *   rAF clocks          08, 09 (capped step: a long frame slows, never skips)
 *   CSS transitions     05's state colours
 *
 * A screen keeps building its animation exactly as it does today; it only wraps
 * the result in an adapter. The Motion Inspector (next phase) and tap-to-complete
 * (later) drive every screen through this interface, so neither needs to know
 * which library a screen uses.
 */
export interface TimelineHandle {
  readonly source: "gsap" | "motion" | "clock" | "css" | "group";
  /** Finite length in seconds (ambient loops excluded); NaN when unknown. */
  readonly duration: number;
  /** Current position in seconds. */
  readonly time: number;
  play(): void;
  pause(): void;
  /** Jump to a position (s) and hold there unless playing. */
  seek(seconds: number): void;
  /** Jump to the final frame and stay there. */
  finish(): void;
  /** Stop without completing (navigation away). */
  stop(): void;
  setSpeed(speed: number): void;
}

// ── adapters ────────────────────────────────────────────────────────────────

export function fromGsap(tl: gsap.core.Timeline | gsap.core.Tween): TimelineHandle {
  return {
    source: "gsap",
    get duration() {
      return tl.duration();
    },
    get time() {
      return tl.time();
    },
    play: () => void tl.play(),
    pause: () => void tl.pause(),
    seek: (s) => void tl.seek(s, false),
    finish: () => void tl.progress(1),
    stop: () => void tl.kill(),
    setSpeed: (s) => void tl.timeScale(s),
  };
}

export function fromMotion(c: AnimationPlaybackControls, duration = NaN): TimelineHandle {
  return {
    source: "motion",
    get duration() {
      return Number.isFinite(duration) ? duration : c.duration;
    },
    get time() {
      return c.time;
    },
    play: () => c.play(),
    pause: () => c.pause(),
    seek: (s) => {
      c.time = s;
    },
    finish: () => c.complete(),
    stop: () => c.stop(),
    setSpeed: (s) => {
      c.speed = s;
    },
  };
}

/** CSS animations / transitions running on (or under) an element. */
export function fromCss(el: Element, duration = NaN): TimelineHandle {
  const all = () => el.getAnimations({ subtree: true });
  return {
    source: "css",
    duration,
    get time() {
      const a = all()[0];
      return a ? Number(a.currentTime ?? 0) / 1000 : 0;
    },
    play: () => all().forEach((a) => a.play()),
    pause: () => all().forEach((a) => a.pause()),
    seek: (s) => all().forEach((a) => (a.currentTime = s * 1000)),
    finish: () => all().forEach((a) => a.finish()),
    stop: () => all().forEach((a) => a.cancel()),
    setSpeed: (s) => all().forEach((a) => (a.playbackRate = s)),
  };
}

/** Several handles as one (e.g. a GSAP stage timeline plus a Motion text sequence). */
export function group(...handles: (TimelineHandle | null | undefined)[]): TimelineHandle {
  const hs = handles.filter(Boolean) as TimelineHandle[];
  return {
    source: "group",
    get duration() {
      return Math.max(0, ...hs.map((h) => h.duration).filter(Number.isFinite));
    },
    get time() {
      return Math.max(0, ...hs.map((h) => h.time));
    },
    play: () => hs.forEach((h) => h.play()),
    pause: () => hs.forEach((h) => h.pause()),
    seek: (s) => hs.forEach((h) => h.seek(s)),
    finish: () => hs.forEach((h) => h.finish()),
    stop: () => hs.forEach((h) => h.stop()),
    setSpeed: (s) => hs.forEach((h) => h.setSpeed(s)),
  };
}

// ── rAF clock ───────────────────────────────────────────────────────────────

/**
 * The capped-step clock 08 and 09 hand-write today, as a reusable handle:
 * each frame advances by at most `maxStep` seconds, so a long frame slows the
 * animation for a moment instead of skipping ahead. `render(t)` draws the
 * frame for time t (s); the clock never touches the DOM itself.
 */
export function createClock(opts: { duration: number; render: (t: number) => void; maxStep?: number; onComplete?: () => void; autoplay?: boolean }): TimelineHandle {
  const { duration, render, maxStep = 1 / 40, onComplete } = opts;
  let t = 0;
  let speed = 1;
  let raf = 0;
  let last = 0;
  let playing = false;
  let done = false;
  const draw = () => render(Math.min(t, duration));
  const tick = (now: number) => {
    if (last) t += Math.max(0, Math.min(maxStep, (now - last) / 1000)) * speed;
    last = now;
    draw();
    if (t >= duration) {
      playing = false;
      if (!done) {
        done = true;
        onComplete?.();
      }
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  const handle: TimelineHandle = {
    source: "clock",
    duration,
    get time() {
      return Math.min(t, duration);
    },
    play() {
      if (playing || t >= duration) return;
      playing = true;
      last = 0;
      raf = requestAnimationFrame(tick);
    },
    pause() {
      playing = false;
      cancelAnimationFrame(raf);
    },
    seek(s) {
      t = Math.max(0, Math.min(duration, s));
      draw();
    },
    finish() {
      handle.pause();
      t = duration;
      draw();
      if (!done) {
        done = true;
        onComplete?.();
      }
    },
    stop() {
      handle.pause();
    },
    setSpeed(s) {
      speed = s;
    },
  };
  if (opts.autoplay !== false) handle.play();
  return handle;
}

// ── shared playback speed ───────────────────────────────────────────────────

/**
 * Every registered handle follows one review speed (1 = real time). GSAP's
 * global timeline and Motion's global config are left alone: only timelines
 * that registered are affected, so nothing changes until a screen opts in.
 */
const live = new Set<TimelineHandle>();
let playbackSpeed = 1;

export function registerTimeline(h: TimelineHandle): () => void {
  live.add(h);
  if (playbackSpeed !== 1) h.setSpeed(playbackSpeed);
  return () => {
    live.delete(h);
  };
}

export function setPlaybackSpeed(s: number) {
  playbackSpeed = s;
  live.forEach((h) => h.setSpeed(s));
}

export const getPlaybackSpeed = () => playbackSpeed;
export const liveTimelines = () => [...live];
