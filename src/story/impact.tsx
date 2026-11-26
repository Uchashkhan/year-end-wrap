import { createContext, useContext, type RefObject } from "react";
import gsap from "gsap";

/**
 * Screen impact (badge landings): a short, damped, mostly vertical shake of the
 * story's background and screen layers — never its chrome (progress bar, close),
 * which sits in its own layer.
 *
 *   y(t) = A · e(t) · sin(2π · 15 Hz · t),   x(t) = 0.2 · A · e(t) · sin(… + 1.3)
 *   e(t) = e^(−10 t) · (1 − t / 0.22)        (0 at 0.22 s)
 * 15 Hz puts a peak on every second 60 fps frame (≈ 0.78 A, −0.5 A, 0.26 A …)
 * instead of aliasing between frames.
 *
 * The layers also scale up by 1 % × e(t) while shaking, so a 3 px shake never
 * exposes an edge (1 % of 844 px ≈ 4.2 px of margin each side). The shake writes
 * the CSS `translate` and `scale` properties, which compose with (and never
 * overwrite) the slides' own `transform` animations. Shakes do not accumulate: a
 * new impact restarts the shake at the larger of its amplitude and what is left
 * of the current one. GSAP clock: deterministic in the Motion Inspector.
 */
export type Shake = (amplitude?: number) => void;

const DUR = 0.22;
const HZ = 15;

export function createShake(frame: RefObject<HTMLElement | null>): { shake: Shake; kill: () => void } {
  let tween: gsap.core.Tween | null = null;
  const state = { t: 0, amp: 0 };
  const env = (t: number) => (t >= DUR ? 0 : Math.exp(-10 * t) * (1 - t / DUR));
  const layers = () =>
    frame.current ? [...frame.current.querySelectorAll<HTMLElement>(":scope > .story-bg, :scope > .story-slide")] : [];
  const paint = () => {
    const e = env(state.t);
    const a = state.amp * e;
    const ph = 2 * Math.PI * HZ * state.t;
    const y = a * Math.sin(ph);
    const x = 0.2 * a * Math.sin(ph + 1.3);
    for (const el of layers()) {
      if (e <= 0) {
        el.style.translate = "";
        el.style.scale = "";
      } else {
        el.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
        el.style.scale = String((1 + 0.01 * e).toFixed(4));
      }
    }
  };
  const kill = () => {
    tween?.kill();
    tween = null;
    state.t = DUR;
    paint();
  };
  const shake: Shake = (amplitude = 4) => {
    const left = tween ? state.amp * env(state.t) : 0;
    tween?.kill();
    state.amp = Math.max(amplitude, left);
    state.t = 0;
    tween = gsap.to(state, { t: DUR, duration: DUR, ease: "none", onUpdate: paint, onComplete: paint });
  };
  return { shake, kill };
}

const ImpactCtx = createContext<Shake | null>(null);
export const ImpactProvider = ImpactCtx.Provider;
/** The story's screen shake (null outside a story, e.g. the share export). */
export const useImpact = () => useContext(ImpactCtx);
