import { bn } from "../lib/bangla";
import { LAND, SPRING, TEXT, eo, kf } from "./reference";
import { settleTime, springEase, type Spring } from "./spring";

/**
 * Reference Motion primitives (docs/reference-motion-language.md §3). Engine-
 * agnostic pieces a screen composes into its OWN choreography under the
 * "reference" profile; under "original" a screen keeps its existing steps and
 * never calls these. Everything is a function of time (or of a driver's
 * progress), so it runs on Motion sequences, GSAP timelines or rAF clocks and
 * seeks deterministically in the Motion Inspector. No WAAPI.
 *
 * Hierarchy (approved Nov 26): headings and supporting text get the restrained
 * text rise (≈ 10 % overshoot of 22 px), infographic elements the springs, the
 * hero number the landing.
 */

type Keyframes = Record<string, (number | string)[]>;
type Bez = [number, number, number, number];
type Options = { duration: number; ease: Bez | ((p: number) => number) | "linear" };

/**
 * Text entrance by role (C3 .up / .fade):
 *   kicker, line  opacity 0 → 1, y 22 px → 0, scale 0.96 → 1, 0.9 s on --pop
 *   caption       opacity 0 → 1, 0.7 s on --ease
 * `fromY` replaces the 22 px rise for text that rises through a mask (e.g. "140%").
 */
export function textIn(role: "kicker" | "line" | "caption", fromY?: string | number): { keyframes: Keyframes; options: Options } {
  if (role === "caption") return { keyframes: { opacity: [0, 1] }, options: { duration: TEXT.fade.dur, ease: [...TEXT.fade.ease] as Bez } };
  return {
    keyframes: { opacity: [0, 1], y: [fromY ?? TEXT.up.y, 0], scale: [TEXT.up.scale, 1] },
    options: { duration: TEXT.up.dur, ease: [...TEXT.up.ease] as Bez },
  };
}

/** A support panel / pill rising on a spring (C3 badge panel: 26 px, ζ .6 ωn 12; opacity in 0.25 s). */
export function panelIn(spring: Spring = SPRING.panel): { rise: { keyframes: Keyframes; options: Options }; show: { keyframes: Keyframes; options: Options } } {
  const d = settleTime(spring);
  return {
    rise: { keyframes: { y: [26, 0] }, options: { duration: d, ease: springEase(spring, d) } },
    show: { keyframes: { opacity: [0, 1] }, options: { duration: 0.25, ease: "linear" } },
  };
}

/**
 * A count driven by the visual: write N · p (p from the driver, 0 → 1) only when
 * the shown value changes. The final value is always exact (p = 1 → N).
 */
export function coupledCount(el: HTMLElement | null, to: number, fmt: (n: number) => string = bn): (p: number) => void {
  let last = "";
  return (p) => {
    if (!el) return;
    const s = fmt(Math.round(to * Math.max(0, Math.min(1, p))));
    if (s !== last) el.textContent = last = s;
  };
}

/**
 * The hero number landing (C3 landFx), without the gold colour flash (our hero
 * numbers are already yellow): the number swells to 1.16, dips to 0.97 and
 * returns to 1 (0.76 s); a subtle gold glow blooms behind it (scale 0.3 → 1.8,
 * peak at 0.22 s, gone by 1 s); optional one-shot sparks (0.8 s).
 * `paint(a)` takes seconds since landing (< 0 = before). `dispose()` removes the
 * glow and the sparks canvas it created.
 */
export function createLanding(
  hero: HTMLElement,
  opts: {
    origin?: string;
    sparks?: boolean;
    canvasHost?: HTMLElement | null;
    seed?: number;
    /**
     * Keep the swelling number inside these bounds (e.g. the screen), 8 px clear.
     * A row too wide for the reference's 16 % swell gets a proportionally smaller
     * swell (same curve and timing) and a growth origin set by the room on each side.
     */
    fit?: HTMLElement | null;
  } = {},
): { paint: (a: number) => void; dispose: () => void } {
  let origin = opts.origin ?? "50% 75%";
  let amp = 1;
  if (opts.fit) {
    const b = opts.fit.getBoundingClientRect();
    const kids = [...hero.children].map((c) => c.getBoundingClientRect()).filter((r) => r.width > 0);
    const hr = hero.getBoundingClientRect();
    const l = Math.min(...kids.map((r) => r.left), hr.right);
    const r = Math.max(...kids.map((r) => r.right), hr.left);
    const w = Math.max(1, r - l);
    const roomL = Math.max(0, l - b.left - 8);
    const roomR = Math.max(0, b.right - 8 - r);
    const peak = LAND.scale[1][1] - 1; // 0.16
    amp = Math.min(1, (roomL + roomR) / (peak * w));
    const ox = l - hr.left + (roomL + roomR > 0 ? (w * roomL) / (roomL + roomR) : w / 2);
    origin = `${((ox / Math.max(1, hr.width)) * 100).toFixed(2)}% ${origin.split(" ")[1] ?? "75%"}`;
  }
  const prev = { origin: hero.style.transformOrigin, iso: hero.style.isolation, pos: hero.style.position, tf: hero.style.transform };
  hero.style.transformOrigin = origin;
  hero.style.isolation = "isolate";
  if (getComputedStyle(hero).position === "static") hero.style.position = "relative";

  // the glow: a gold radial disc behind the number (C3 .fl), sized to the number
  const glow = document.createElement("i");
  glow.setAttribute("aria-hidden", "true");
  const size = hero.offsetHeight * LAND.glow.sizeToHeight;
  Object.assign(glow.style, {
    position: "absolute",
    left: "50%",
    top: "55%",
    width: `${size}px`,
    height: `${size}px`,
    margin: `${-size / 2}px 0 0 ${-size / 2}px`,
    borderRadius: "50%",
    zIndex: "-1",
    pointerEvents: "none",
    background: "radial-gradient(closest-side, rgba(255,201,60,.9), rgba(255,201,60,.35) 45%, rgba(255,201,60,0))",
    opacity: "0",
    willChange: "transform, opacity",
  } satisfies Partial<CSSStyleDeclaration>);
  hero.prepend(glow);

  // optional sparks (C3 FX.sparks) on a canvas over the screen
  let paintSparks: ((a: number) => void) | null = null;
  let canvas: HTMLCanvasElement | null = null;
  const host = opts.canvasHost;
  if (opts.sparks && host) {
    canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "5" });
    host.append(canvas);
    const hr = host.getBoundingClientRect();
    const nr = hero.getBoundingClientRect();
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    canvas.width = Math.round(hr.width * dpr);
    canvas.height = Math.round(hr.height * dpr);
    const cx = canvas.getContext("2d");
    const star = new Path2D("M12 0C12.9 7.6 16.4 11.1 24 12 16.4 12.9 12.9 16.4 12 24 11.1 16.4 7.6 12.9 0 12 7.6 11.1 11.1 7.6 12 0Z");
    let seed = opts.seed ?? 61;
    const rnd = () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const c = { x: nr.left - hr.left + nr.width / 2, y: nr.top - hr.top + nr.height / 2 };
    const dist = Math.max(LAND.sparks.minDist, nr.width * LAND.sparks.widthFactor);
    const n = LAND.sparks.n;
    const ps = Array.from({ length: n }, (_, i) => ({ a: (i / n) * Math.PI * 2 + rnd() * 0.4, d: dist * (0.7 + rnd() * 0.5), col: i % 3 ? "#FFC93C" : "#FFFFFF" }));
    let drawn = false;
    paintSparks = (a) => {
      if (!cx || !canvas) return;
      const on = a >= 0 && a <= LAND.sparks.life;
      if (!on && !drawn) return;
      cx.setTransform(1, 0, 0, 1, 0, 0);
      cx.clearRect(0, 0, canvas.width, canvas.height);
      drawn = on;
      if (!on) return;
      const u = a / LAND.sparks.life;
      for (const p of ps) {
        const d = p.d * (u < 0.55 ? eo(u / 0.55) : 1 + (0.15 * (u - 0.55)) / 0.45);
        const s = u < 0.55 ? 0.2 + 0.9 * (u / 0.55) : 1.1 - 0.8 * ((u - 0.55) / 0.45);
        const rot = u * 2.8;
        const co = Math.cos(rot) * s * dpr;
        const si = Math.sin(rot) * s * dpr;
        cx.globalAlpha = Math.max(0, Math.min(1, u < 0.55 ? 1 : 1 - (u - 0.55) / 0.45));
        cx.setTransform(co, si, -si, co, (c.x + Math.cos(p.a) * d) * dpr, (c.y + Math.sin(p.a) * d) * dpr);
        cx.translate(-8, -8);
        cx.scale(0.667, 0.667);
        cx.fillStyle = p.col;
        cx.fill(star);
      }
      cx.globalAlpha = 1;
    };
  }

  const r3 = (n: number) => Math.round(n * 1000) / 1000;
  return {
    paint(a) {
      hero.style.transform = a < 0 || a >= LAND.end ? "" : `scale(${r3(1 + (kf(LAND.scale, a) - 1) * amp)})`;
      glow.style.opacity = String(a < 0 ? 0 : r3(kf(LAND.glow.opacity, a) * LAND.glowPeak));
      glow.style.transform = `scale(${r3(a < 0 ? LAND.glow.scaleFrom : LAND.glow.scaleFrom + (LAND.glow.scaleTo - LAND.glow.scaleFrom) * eo(a))})`;
      paintSparks?.(a);
    },
    dispose() {
      glow.remove();
      canvas?.remove();
      hero.style.transformOrigin = prev.origin;
      hero.style.isolation = prev.iso;
      hero.style.position = prev.pos;
      hero.style.transform = prev.tf;
    },
  };
}
