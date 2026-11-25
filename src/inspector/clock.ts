/**
 * Motion Inspector — the preview frame's virtual clock (development only).
 *
 * Installed in the inspector's preview iframe before any app module runs (see
 * frameBoot.ts), it becomes the one time source for everything that animates
 * there, so every library is paused, slowed, sped up and fast-forwarded together
 * — without migrating a single screen:
 *
 *   performance.now, Date.now, new Date()   GSAP's ticker, Motion's frameloop,
 *                                           StoryViewer's tap lock, the live clock
 *   requestAnimationFrame                   GSAP, Motion, the rAF clocks (08, 09, flight)
 *   setTimeout / setInterval                count-up starts, exits, delayed callbacks
 *   CSS animations and transitions          background colours, quiz states, twinkle
 *                                           (held paused, their currentTime set from the clock)
 *
 * Element.prototype.animate is removed in the frame, so Motion runs its
 * animations on its JS driver (its own documented path for a manual clock)
 * instead of on the browser's compositor clock, which nothing can pause.
 *
 * Time advances in steps of at most one 60 Hz frame (16.7 ms), whatever the
 * playback speed, so the capped-step rAF clocks (1/40 s) are never slowed by
 * large steps. The wall clock starts at a fixed time, so the live clock on 02 is
 * the same in every replay.
 */

type Fn = (...a: unknown[]) => void;
interface Timer {
  due: number;
  cb: Fn;
  args: unknown[];
  every: number | null;
}

export interface VirtualClock {
  /** Virtual time since install (s). */
  now(): number;
  play(): void;
  pause(): void;
  readonly playing: boolean;
  setSpeed(s: number): void;
  readonly speed: number;
  /** Advance virtual time by `seconds`, yielding to React between steps (paused or not). */
  advance(seconds: number): Promise<void>;
  /** Called after every virtual step (observation). */
  onStep(fn: (t: number) => void): () => void;
}

const STEP = 1000 / 60;
const PERF_BASE = 1000; // performance.now() starts at 1 s (never 0)
const WALL_BASE = new Date(2026, 10, 25, 10, 10, 0).getTime(); // fixed local wall clock: 25 Nov 2026, 10:10:00

export function installVirtualClock(): VirtualClock {
  const w = window as unknown as Record<string, unknown>;
  const real = {
    raf: window.requestAnimationFrame.bind(window),
    now: performance.now.bind(performance),
    setTimeout: window.setTimeout.bind(window),
    Date: window.Date,
  };
  let v = 0; // virtual ms
  let speed = 1;
  let playing = false;
  let nextId = 1_000_000;
  const rafQ = new Map<number, FrameRequestCallback>();
  const timers = new Map<number, Timer>();
  const steppers = new Set<(t: number) => void>();

  // ── time sources ──
  performance.now = () => PERF_BASE + v;
  const RealDate = real.Date;
  class VDate extends RealDate {
    constructor(...a: unknown[]) {
      if (a.length === 0) super(WALL_BASE + v);
      else super(...(a as [number]));
    }
    static now() {
      return WALL_BASE + v;
    }
  }
  w.Date = VDate;

  // ── frames and timers ──
  w.requestAnimationFrame = (cb: FrameRequestCallback) => {
    const id = nextId++;
    rafQ.set(id, cb);
    return id;
  };
  w.cancelAnimationFrame = (id: number) => void rafQ.delete(id);
  const addTimer = (cb: unknown, ms: unknown, args: unknown[], every: boolean) => {
    const id = nextId++;
    if (typeof cb !== "function") return id;
    const d = Math.max(0, Number(ms) || 0);
    timers.set(id, { due: v + d, cb: cb as Fn, args, every: every ? Math.max(1, d) : null });
    return id;
  };
  w.setTimeout = (cb: unknown, ms?: unknown, ...args: unknown[]) => addTimer(cb, ms, args, false);
  w.setInterval = (cb: unknown, ms?: unknown, ...args: unknown[]) => addTimer(cb, ms, args, true);
  w.clearTimeout = w.clearInterval = (id: number) => void timers.delete(id);

  // ── Motion: no WAAPI, so every animation runs on the (virtual) frameloop ──
  try {
    delete (Element.prototype as unknown as Record<string, unknown>).animate;
  } catch {
    /* ignore */
  }

  // ── CSS animations and transitions: paused, their time set from the clock ──
  const css = new WeakMap<Animation, { born: number }>();
  const syncCss = () => {
    for (const a of document.getAnimations()) {
      let s = css.get(a);
      if (!s) {
        s = { born: v };
        css.set(a, s);
      }
      if (a.playState !== "paused") a.pause();
      const t = (v - s.born) * (a.playbackRate || 1);
      const end = Number(a.effect?.getComputedTiming().endTime ?? Infinity);
      if (Number.isFinite(end) && t >= end) a.finish();
      else a.currentTime = t;
    }
  };

  const runTimers = () => {
    for (let guard = 0; guard < 1000; guard++) {
      let id = -1;
      let t: Timer | undefined;
      for (const [k, x] of timers) if (x.due <= v && (!t || x.due < t.due)) [id, t] = [k, x];
      if (!t) return;
      if (t.every) t.due += t.every;
      else timers.delete(id);
      try {
        t.cb(...t.args);
      } catch (e) {
        console.error(e);
      }
    }
  };
  const runFrames = () => {
    const q = [...rafQ.values()];
    rafQ.clear();
    const ts = PERF_BASE + v;
    for (const cb of q) {
      try {
        cb(ts);
      } catch (e) {
        console.error(e);
      }
    }
  };
  const step = (ms: number) => {
    v += ms;
    runTimers();
    runFrames();
    syncCss();
    steppers.forEach((f) => f(v / 1000));
  };
  const advanceSync = (ms: number) => {
    while (ms > 1e-6) {
      const d = Math.min(STEP, ms);
      step(d);
      ms -= d;
    }
  };

  // real-time driver (only while playing)
  let lastReal = 0;
  const drive = (now: number) => {
    if (playing && lastReal) advanceSync(Math.min(100, now - lastReal) * speed);
    lastReal = now;
    real.raf(drive);
  };
  real.raf(drive);

  // a real macrotask (React's scheduler uses MessageChannel; this queues after its work)
  const yieldTask = () =>
    new Promise<void>((res) => {
      const ch = new MessageChannel();
      ch.port1.onmessage = () => res();
      ch.port2.postMessage(0);
    });

  return {
    now: () => v / 1000,
    play() {
      playing = true;
      lastReal = 0;
    },
    pause() {
      playing = false;
    },
    get playing() {
      return playing;
    },
    setSpeed(s) {
      speed = s;
    },
    get speed() {
      return speed;
    },
    async advance(seconds) {
      const wasPlaying = playing;
      playing = false;
      let ms = seconds * 1000;
      while (ms > 1e-6) {
        const d = Math.min(STEP, ms);
        step(d);
        ms -= d;
        await yieldTask();
        await yieldTask();
      }
      if (wasPlaying) {
        playing = true;
        lastReal = 0;
      }
    },
    onStep(fn) {
      steppers.add(fn);
      return () => void steppers.delete(fn);
    },
  };
}
