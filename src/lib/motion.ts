/**
 * Motion hierarchy (PRD §G: "purposeful, never decorative").
 *
 * Every animation in the Wrap belongs to exactly one tier. A tier defines its
 * timing AND its reduced-motion equivalent, so no screen invents its own.
 *
 *   T0 feedback  — press states. 120 ms.            Reduced: none.
 *   T1 nav       — slide-to-slide. 280 ms.          Reduced: 150 ms cross-fade, no travel.
 *   T2 content   — the slide's one data beat        Reduced: final state, no count.
 *                  (number counting, register marks,
 *                  rows assembling). ≤ 1 per slide.
 *   T3 hero      — the stamp landing (09). Exactly   Reduced / repeat view: already stamped.
 *                  once per deck.
 *
 * Never: idle loops, floating particles, confetti, parallax, shimmer on repeat view.
 */
export const EASE_OUT = [0.2, 0.8, 0.2, 1] as const;

export const MOTION = {
  feedback: { duration: 0.12 },
  nav: { duration: 0.28, ease: EASE_OUT, distance: 28 },
  navReduced: { duration: 0.15 },
  content: { duration: 0.56, ease: EASE_OUT, stagger: 0.06, countUp: 1.1 },
  hero: {
    /** Pre-reveal hold before the stamp lands (tap reveals early). */
    holdMs: 1600,
    /** Stamp: drops from 1.35× and settles with a single small overshoot. */
    from: { scale: 1.35, opacity: 0, rotate: -6 },
    to: { scale: 1, opacity: 1, rotate: 0 }, // the stamp's resting −4° tilt lives in CSS
    spring: { type: "spring" as const, stiffness: 520, damping: 30, mass: 0.9 },
    /** Actions appear after the stamp has settled, not with it. */
    actionsDelay: 0.5,
  },
  /**
   * T2 entrance sequences — one element per beat, never everything at once.
   * Purely presentational: navigation is live from frame 0.
   * Reduced motion / repeat view: everything renders in its final state.
   */
  entrance: {
    rise: 18, // px of upward travel
    duration: 0.5,
    writeDuration: 0.62,
    writeEase: [0.45, 0, 0.2, 1] as const,
    /** 01 Cover: year → label → name is written → details. Ends by ~1.2 s. */
    cover: { year: 0.1, label: 0.34, name: 0.56, details: 0.98 },
  },
} as const;
