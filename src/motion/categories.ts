/**
 * Motion categories and their budgets (targets for the screen-by-screen
 * refinement; nothing is retimed by this file). Seconds from the tap.
 *
 * Every screen follows one choreography; phases overlap where they should:
 *   1 hand-over         the incoming screen takes over from the outgoing one
 *   2 concept           the screen's main visual idea moves
 *   3 hero              the personalised result becomes readable: the most
 *                       important visual event on the screen
 *   4 support           supporting copy and details
 *   5 rest              the settled reading state (ambient loops may continue)
 * Unrelated graphics are not forced to morph into each other for the sake of a
 * transition: a hand-over may simply clear and arrive.
 */

export type MotionCategory = "M1" | "M2" | "M3" | "M4";

export interface CategoryBudget {
  name: string;
  /** Hero readable window [from, to]; null where the category does not set one. */
  hero: readonly [number, number] | null;
  /** Finite entrance settles by this time (ambient loops excluded). */
  settle: number | null;
  rules: readonly string[];
}

export const CATEGORIES: Record<MotionCategory, CategoryBudget> = {
  M1: {
    name: "Standard storytelling",
    hero: [1.6, 2.4],
    settle: 2.8,
    rules: [
      "Applies to 02 Study time, 03 Live classes, 05 Quiz, 06 Video, 07 Subject, 08 Most active day.",
      "Continuous motion, without unnecessary intermediate holds.",
      "Quiz is the extended exception: hero ≈ 2.6 s.",
      "Reference: 08 Most active day (pacing, continuous movement); 03 Live classes (shared-element hand-over).",
    ],
  },
  M2: {
    name: "Emotional reveal",
    hero: [2.2, 2.6],
    settle: 3.0,
    rules: [
      "Applies to 04 Teacher and 09 Learner type.",
      "One deliberate anticipation beat before the hero.",
      "More emphasis than a stat screen; the hero is still the main event.",
    ],
  },
  M3: {
    name: "Information assembly",
    hero: null,
    settle: 1.6,
    rules: ["Applies to 10 Marksheet.", "Deliberate staggered assembly (STAGGER.tile); keep the Bento layout readable."],
  },
  M4: {
    name: "Cinematic storytelling",
    hero: null,
    settle: null,
    rules: [
      "Applies to the original and Bird Journey Cover and Closing.",
      "Each keeps its own opening / ending concept and length.",
      "References: the original Cover and The Year Turns.",
      "Bird Cover may keep its longer cinematic duration.",
      "Bird Closing (future): closing message at ≈ 3.0–3.2 s, without giving up convincing flight.",
      "Course recommendation (future, both closings): starts OFFER_RULE.afterCopySettle (1.2 s) after the closing copy settles, entrance OFFER_RULE.entrance (0.75 s).",
    ],
  },
};

/** Screens used as internal motion references; their animation is not changed during refinement of others. */
export const REFERENCE_SCREENS = ["peakDay", "live", "close"] as const;

/** Quiz's extended hero target (M1 exception). */
export const QUIZ_HERO_TARGET = 2.6;
/** Bird Closing's future closing-message target window. */
export const BIRD_CLOSING_LINE_TARGET = [3.0, 3.2] as const;
