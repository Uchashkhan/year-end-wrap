import { cubicBezier } from "motion/react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { EASE, SPECIAL_EASE, type EaseValue, type EaseToken, type SpecialEase } from "./tokens";

/**
 * Easing adapters: one token, four consumers.
 *
 *   motionEase("settle")   → [0.22, 1, 0.36, 1]          Motion for React (animate, sequences, transitions)
 *   gsapEase("settle")     → "wm-settle"                 GSAP (a CustomEase, registered once, on first use)
 *   cssEase("settle")      → "cubic-bezier(0.22, 1, 0.36, 1)"  CSS transitions / animations
 *   easeFn("settle")       → (t: number) => number       hand-written rAF clocks (08, 09)
 *
 * GSAP names use the "wm-" prefix on purpose: the screens already register
 * "wrap-settle", "wrap-arrive", … with their own curves, and "wrap-settle" is a
 * *different* curve from EASE.settle. Registering a token under an existing name
 * would silently change those screens.
 */

type AnyEase = EaseToken | SpecialEase;

export function easeValue(name: AnyEase): EaseValue {
  return (name in EASE ? EASE[name as EaseToken] : SPECIAL_EASE[name as SpecialEase]) as EaseValue;
}

/** Motion for React: a bezier array (or "linear"). */
export function motionEase(name: AnyEase): [number, number, number, number] | "linear" {
  const v = easeValue(name);
  return v === "linear" ? "linear" : [v[0], v[1], v[2], v[3]];
}

/** CSS: a timing-function string. */
export function cssEase(name: AnyEase): string {
  const v = easeValue(name);
  return v === "linear" ? "linear" : `cubic-bezier(${v.join(", ")})`;
}

const registered = new Set<string>();
/** GSAP: the name of a CustomEase for this token, registered on first use ("none" for linear). */
export function gsapEase(name: AnyEase): string {
  const v = easeValue(name);
  if (v === "linear") return "none";
  const id = `wm-${name}`;
  if (!registered.has(id)) {
    gsap.registerPlugin(CustomEase);
    CustomEase.create(id, v.join(","));
    registered.add(id);
  }
  return id;
}

const fns = new Map<string, (t: number) => number>();
/** rAF clocks: an easing function of progress 0…1. */
export function easeFn(name: AnyEase): (t: number) => number {
  let f = fns.get(name);
  if (!f) {
    const v = easeValue(name);
    f = v === "linear" ? (t: number) => t : cubicBezier(v[0], v[1], v[2], v[3]);
    fns.set(name, f);
  }
  return f;
}

/** Token durations as CSS time. */
export const cssTime = (seconds: number) => `${seconds}s`;
