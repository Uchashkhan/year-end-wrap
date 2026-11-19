import type { AnimationPlaybackControls, DOMKeyframesDefinition, AnimationOptions } from "motion/react";

/** One beat: [selector inside the scope, keyframes, options incl. `at`]. */
export type Step = [string, DOMKeyframesDefinition, AnimationOptions & { at?: number }];

// useAnimate's scoped animate(); typed loosely because its overloads don't narrow well for sequences.
type ScopedAnimate = (seq: never) => AnimationPlaybackControls;

/**
 * Runs a timeline inside `root`, dropping any beat whose element is absent
 * (e.g. no name → no name beat), so optional content never breaks the sequence.
 */
export function sequence(root: Element | null, animate: unknown, steps: Step[]): AnimationPlaybackControls | undefined {
  if (!root) return;
  const live = steps.filter(([sel]) => root.querySelector(sel));
  if (!live.length) return;
  return (animate as ScopedAnimate)(live as never);
}
