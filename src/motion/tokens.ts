/**
 * Motion Design System V1: the canonical motion tokens (Nov 25, 2026).
 *
 * One source for durations, curves and staggers. Numbers here are seconds.
 * Screens adopt these during the screen-by-screen refinement; until then the
 * existing per-screen constants (story/entry.ts, each screen's timing object)
 * stay the runtime truth, unchanged. `lib/motion.ts` is the earlier T0–T3 tier
 * file; it remains for its current consumers (nav, Entrance, CountUp, legacy
 * screens) and is superseded by this module for new work.
 */

export const DURATION = {
  press: 0.12,
  exit: 0.2,
  quick: 0.3,
  base: 0.45,
  settle: 0.6,
  slow: 0.9,
  count: 1.0,
} as const;
export type DurationToken = keyof typeof DURATION;

/** A cubic-bezier as four control values, or linear. */
export type Bezier = readonly [number, number, number, number];
export type EaseValue = Bezier | "linear";

export const EASE = {
  /** Default arrival: long, soft settle. (Today: the local `OUT` in 10 files; GSAP "wrap-settle-room".) */
  settle: [0.22, 1, 0.36, 1],
  /** Fast in, long tail: counts, the seat, the cover title. (GSAP "wrap-arrive".) */
  arrive: [0.16, 1, 0.3, 1],
  /** Content and text leaving. */
  exit: [0.4, 0, 0.2, 1],
  /** Shared-element moves between two places. */
  glide: [0.55, 0, 0.25, 1],
  /** Accelerating departures (the clock dropping out). (GSAP "wrap-drop".) */
  drop: [0.55, 0, 0.9, 0.45],
  linear: "linear",
} as const satisfies Record<string, EaseValue>;
export type EaseToken = keyof typeof EASE;

export const STAGGER = {
  line: 0.06,
  row: 0.08,
  tile: 0.12,
} as const;
export type StaggerToken = keyof typeof STAGGER;

/**
 * Specialised curves that are essential to an existing animation and are kept
 * as they are (not folded into the tokens). Listed so they are named in one
 * place; their consumers still declare them locally until migrated.
 */
export const SPECIAL_EASE = {
  /** Cover: the 2 × 2 cluster opening to the corners. */
  coverExpand: [0.6, 0, 0.2, 1],
  /** Cover → 02: the digits leaving, slightly accelerating. */
  coverDigitsOut: [0.45, 0, 0.7, 0.35],
  /** Ambient sine (digit float, twinkle). */
  ambientSine: [0.37, 0, 0.63, 1],
  /** 04: the light coming up ("wrap-dawn"). */
  dawn: [0.45, 0, 0.25, 1],
  /** 04: the name, a held, soft arrival. */
  nameSoft: [0.33, 0, 0.2, 1],
  /** 03 → 04: the seats leaving softly ("wrap-leave-soft"). */
  leaveSoft: [0.45, 0, 0.75, 0.6],
  /** 04: the figure settling ("wrap-settle"; not the same curve as EASE.settle). */
  figureSettle: [0.25, 0.6, 0.3, 1],
  /** 03: the hall receding ("wrap-recede"). */
  recede: [0.45, 0, 0.2, 1],
  /** 02 day/night: the sun setting (reference C3 .hr-sun, accelerating). */
  celestialSet: [0.5, 0, 0.7, 1],
  /** 02 day/night: the moon rising with an overshoot (reference C3 --pop). */
  celestialRise: [0.34, 1.56, 0.64, 1],
  /** 05 Quiz Activities (reference C3): text rising in (.up), its --pop curve. */
  refPop: [0.34, 1.56, 0.64, 1],
  /** Reference (C3 --ease): a caption's soft fade. */
  refSoft: [0.2, 0.8, 0.2, 1],
  /** 05: quiz rows ("wrap-quiz-*"). */
  quizLeave: [0.5, 0, 0.75, 0.4],
  quizArrive: [0.2, 0.8, 0.3, 1],
  quizGlide: [0.6, 0, 0.25, 1],
  quizPress: [0.3, 0, 0.5, 1],
  /** 06: the watchline filling. */
  watchFill: [0.35, 0, 0.2, 1],
  /** 07: the subject lanes' drift. */
  laneSmooth: [0.45, 0, 0.55, 1],
  /** 02: the clock's live tick. */
  clockTick: [0.25, 0.9, 0.3, 1],
  /** Story nav (T1) and the story layer. */
  nav: [0.2, 0.8, 0.2, 1],
} as const satisfies Record<string, Bezier>;
export type SpecialEase = keyof typeof SPECIAL_EASE;

/**
 * The course recommendation's shared timing rule (future; not active). Today
 * The Year Turns starts it at 3.45 s and the Bird closing at 6.45 s.
 */
export const OFFER_RULE = {
  /** Seconds after the closing copy has settled. */
  afterCopySettle: 1.2,
  /** Entrance length. */
  entrance: 0.75,
} as const;
