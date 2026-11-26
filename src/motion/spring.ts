/**
 * The reference prototype's spring (C3 Journey, `spr(t, ζ, ωn)`): the closed-form
 * unit-step response of an under-damped spring with zero initial velocity. One
 * formula for every engine — GSAP and Motion take it as an ease, rAF clocks call
 * it directly — so a spring looks the same wherever it runs.
 * See docs/reference-motion-language.md §1.3.
 */
export interface Spring {
  /** Damping ratio ζ (0 < ζ < 1). */
  z: number;
  /** Natural frequency ωn (rad/s). */
  wn: number;
}

/** Position of the spring at t seconds (0 → 1, overshooting). */
export function spr(t: number, z: number, wn: number): number {
  if (t <= 0) return 0;
  const wd = wn * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * wn * t) * (Math.cos(wd * t) + ((z * wn) / wd) * Math.sin(wd * t));
}

/** Time for the envelope to fall within `tol` of rest (default 1 %, ≈ 4.6 / ζωn). */
export function settleTime({ z, wn }: Spring, tol = 0.01): number {
  return -Math.log(tol) / (z * wn);
}

/** Overshoot as a fraction (e.g. 0.095 for ζ 0.6). */
export const overshoot = ({ z }: Spring) => Math.exp((-z * Math.PI) / Math.sqrt(1 - z * z));

/**
 * The spring as an ease over `duration` seconds (default: its 1 % settle time),
 * for a GSAP tween or a Motion keyframe animation of that duration. The last
 * frame is exactly 1.
 */
export function springEase(s: Spring, duration = settleTime(s)): (p: number) => number {
  return (p) => (p >= 1 ? 1 : spr(p * duration, s.z, s.wn));
}

/** The same spring as Motion's physical spring (mass 1): stiffness ωn², damping 2ζωn. */
export const toMotionSpring = ({ z, wn }: Spring) => ({ type: "spring" as const, stiffness: wn * wn, damping: 2 * z * wn, mass: 1 });
