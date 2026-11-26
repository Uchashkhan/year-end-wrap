import { ANSWER, ASSEMBLE, DAYLINE, FLOW, FOCUS, ONWARD, SKY_HANDOFF, TAKEOVER, WATCH } from "../story/entry";
import { MOTION } from "../lib/motion";
import type { MotionCategory } from "./categories";
import type { AmbientLoop } from "./ambient";
import { OFFER_RULE } from "./tokens";
import { BIRD_COVER } from "./birdCover";
import { VIDEO_BEYOND } from "./videoBeyond";

/**
 * Phase markers per screen, in seconds from the tap that starts the screen
 * (forward navigation, full motion). Three sources, never mixed:
 *
 *   measured  the Motion Audit (25 Nov 2026, review/wrap-2026-motion-audit.md):
 *             a probe sampled every element of the incoming screen each frame,
 *             390 × 844, Chrome, high-activity profile. Fixed numbers.
 *   code      derived from the timing constants the screen runs today (the
 *             imported ones update themselves; literals name their source).
 *   target    the Motion Design System V1 budget for future refinement. A
 *             proposal, not the current behaviour.
 *
 * handoverEnd  the outgoing screen leaves the stage
 * heroAt       the personalised result is readable (stopped moving and counting)
 * copyAt       all supporting copy is readable
 * settleAt     the finite entrance has settled (ambient loops excluded); for a
 *              closing, the emotional ending
 * offerSettleAt  closings only: settled including the course recommendation
 * offerStartAt   closings only: the course recommendation starts
 * conceptEndAt   02 only: the clock's initial spin lands (after the copy)
 */
export type Seconds = number;
export type Range = readonly [Seconds, Seconds];

export interface PhaseMarkers {
  handoverEnd: Seconds | null;
  heroAt: Seconds | null;
  copyAt: Seconds | null;
  settleAt: Seconds | null;
  offerSettleAt?: Seconds | null;
  /** 02 only: the clock's initial spin lands (the concept), after the copy has completed. */
  conceptEndAt?: Seconds | null;
  /** Closings only: the course recommendation starts (the end of the recommendation hold). */
  offerStartAt?: Seconds | null;
}

export interface TargetMarkers {
  heroAt?: Seconds | Range | "keep";
  copyAt?: Seconds | Range | "keep";
  settleAt?: Seconds | "keep";
  offerStartAt?: Seconds | "copySettle+1.2";
  offerSettleAt?: Seconds | "copySettle+1.95";
}

export interface ScreenMotion {
  label: string;
  category: MotionCategory;
  /** Internal motion reference: not changed while other screens are refined. */
  reference?: true;
  source: string;
  library: string;
  ambientLoops: AmbientLoop[];
  measured: PhaseMarkers;
  code: PhaseMarkers;
  target: TargetMarkers;
  notes?: string;
  /** Screen-facet designs of this screen that run their own choreography (dev only; variants/facets.tsx). */
  variants?: Record<string, { label: string; source: string; library: string; code: PhaseMarkers; notes: string }>;
  /** Global motion profiles other than "original" (motion/profile.tsx), for screens moved onto the primitives. */
  profiles?: { reference?: { measured: PhaseMarkers; source: string; notes: string } };
}

export const BIRD_3D_MOTION: ScreenMotion = {
  label: "01 Cover · 3D Bird Journey",
  category: "M4",
  source: "src/journey/Bird3DCover.tsx, src/motion/birdCover.ts",
  library: "GSAP",
  ambientLoops: ["backgroundTwinkle", "birdCoverHover"],
  measured: { handoverEnd: null, heroAt: null, copyAt: null, settleAt: null },
  code: {
    handoverEnd: null,
    heroAt: BIRD_COVER.year.at + BIRD_COVER.year.duration,
    copyAt: BIRD_COVER.support.at + BIRD_COVER.support.duration,
    settleAt: BIRD_COVER.end,
  },
  target: {},
  notes: "One flight curve drives the bird, year track, cloud parallax and wind. Only the bird's subtle hover continues after the CTA settles.",
};

export const VIDEO_BEYOND_MOTION: ScreenMotion = {
  label: "06 Video · Beyond the Screen",
  category: "M1",
  source: "src/screens/VideoBeyond.tsx, src/motion/videoBeyond.ts",
  library: "GSAP",
  ambientLoops: ["backgroundTwinkle", "videoLessonLight"],
  measured: { handoverEnd: null, heroAt: null, copyAt: null, settleAt: null },
  code: {
    handoverEnd: WATCH.out,
    heroAt: VIDEO_BEYOND.land,
    copyAt: VIDEO_BEYOND.comparison + 0.42,
    settleAt: VIDEO_BEYOND.end,
  },
  target: {},
  notes: "The player and count share one playback curve. The optical experiment clears the bezel before the number lands.",
};

const STAT: TargetMarkers = { heroAt: [1.6, 2.4], settleAt: 2.8 };
const EMOTIONAL: TargetMarkers = { heroAt: [2.2, 2.6], settleAt: 3.0 };
const OFFER = { offerStartAt: "copySettle+1.2", offerSettleAt: "copySettle+1.95" } as const; // OFFER_RULE: +1.2, then 0.75

// Literal code values below come from constants that are not exported; each names its source.
export const SCREEN_MOTION = {
  cover: {
    label: "01 Cover (original)",
    category: "M4",
    reference: true,
    source: "src/screens/CoverFigma.tsx (OPEN)",
    library: "Motion",
    ambientLoops: ["coverDigitFloat", "coverArrowNudge", "backgroundTwinkle"],
    measured: { handoverEnd: 0.28, heroAt: 1.64, copyAt: 1.97, settleAt: 1.97 },
    // story layer 0.28 s (App.tsx); title 1.0 + 0.6; start control 1.42 + 0.55
    code: { handoverEnd: 0.28, heroAt: 1.6, copyAt: 1.97, settleAt: 1.97 },
    target: { heroAt: "keep", copyAt: "keep", settleAt: "keep" },
  },
  study: {
    label: "02 Study time",
    category: "M1",
    source: "src/screens/StudyClock.tsx (COUNT 1.4), components/AnalogClock.tsx (spin 3.2)",
    library: "Motion",
    ambientLoops: ["liveClock", "backgroundTwinkle"],
    // settle: the copy; the clock hands land on the real time at ≈ 3.8–4.7 s
    measured: { handoverEnd: 0.73, heroAt: 1.74, copyAt: 2.18, settleAt: 2.18, conceptEndAt: 3.8 },
    // t0 = revealAt 0.28; count from t0 + 0.3 for 1.4; comparison at t0 + 0.3 + 1.05 + 0.15, 0.45
    code: {
      handoverEnd: SKY_HANDOFF.coverOut,
      heroAt: SKY_HANDOFF.revealAt + 0.3 + 1.4,
      copyAt: SKY_HANDOFF.revealAt + 0.3 + 1.4 * 0.75 + 0.15 + 0.45,
      settleAt: SKY_HANDOFF.revealAt + 0.3 + 1.4 * 0.75 + 0.15 + 0.45,
      conceptEndAt: SKY_HANDOFF.revealAt + 0.3 + 3.2,
    },
    profiles: {
      reference: {
        // probe, 26 Nov 2026, 390 × 844, from the cover (?mprofile=reference)
        measured: { handoverEnd: 0.73, heroAt: 3.6, copyAt: 4.85, settleAt: 4.85 },
        source: "src/screens/StudyClock.tsx (reference branch), AnalogClock onSpin, motion/primitives.ts",
        notes:
          "Timing exception (approved Nov 26: the reference's natural duration over the 2.8 s target). The count is the clock's spin (3.2 s, SPIN_EASE, read from the minute hand), so the number is readable when the hands land (≈ 3.6 s); landing 0.76 s; the comparison follows the landing by 0.4 s (C3 hours). Original clock only; the Timekeeper is unchanged. Tap lock unchanged.",
      },
    },
    target: STAT,
    notes: "Clock hands land at t0 + 0.3 + 3.2 ≈ 3.78 s (code); counted as the concept, not the settle.",
  },
  live: {
    label: "03 Live classes",
    category: "M1",
    reference: true,
    source: "src/screens/LiveClass.tsx, heroHandoff.ts (FLOW)",
    library: "GSAP + Motion",
    ambientLoops: ["backgroundTwinkle"],
    measured: { handoverEnd: 0.57, heroAt: 1.71, copyAt: 1.92, settleAt: 1.97 },
    code: {
      handoverEnd: FLOW.out,
      heroAt: FLOW.stat.at + FLOW.stat.count,
      copyAt: FLOW.stat.at + 0.22 + 0.45,
      settleAt: Math.max(FLOW.halo.out + 0.45, FLOW.stat.at + 0.22 + 0.45),
    },
    target: { heroAt: "keep", copyAt: "keep", settleAt: "keep" },
  },
  teacher: {
    label: "04 Teacher",
    category: "M2",
    source: "src/screens/TeacherSpotlight.tsx, focusHandoff.ts (FOCUS)",
    library: "GSAP + Motion",
    ambientLoops: ["backgroundTwinkle"],
    measured: { handoverEnd: 1.27, heroAt: 2.62, copyAt: 2.62, settleAt: 2.62 },
    code: {
      handoverEnd: FOCUS.out,
      heroAt: FOCUS.name.at + FOCUS.name.dur,
      copyAt: FOCUS.name.at + FOCUS.name.dur,
      settleAt: FOCUS.name.at + FOCUS.name.dur,
    },
    target: EMOTIONAL,
    variants: {
      cinematic: {
        label: "04 Teacher — Cinematic Spotlight (teacher.design = cinematic)",
        source: "src/screens/TeacherCinematic.tsx (one GSAP timeline + paint), focusHandoff.ts (03's side only)",
        library: "GSAP",
        // Focus hand-over: spotlight starts at 1.29 s. Direct entry starts it at 0.49 s.
        code: { handoverEnd: FOCUS.out, heroAt: 3.64, copyAt: 3.94, settleAt: 4.34 },
        notes:
          "Timings describe the Focus hand-over from the original Live screen. Direct entry and standard transitions start the spotlight 0.8 s earlier. The 04 → 05 Answer hand-over still uses the standard transition with Cinematic Spotlight.",
      },
    },
  },
  quiz: {
    label: "05 Quiz",
    category: "M1",
    source: "src/screens/QuizRecap.tsx, quizHandoff.ts (ANSWER)",
    library: "GSAP + Motion + CSS",
    ambientLoops: ["backgroundTwinkle"],
    measured: { handoverEnd: 1.02, heroAt: 4.36, copyAt: 4.74, settleAt: 4.74 },
    code: {
      handoverEnd: ANSWER.out,
      heroAt: ANSWER.stat.at + ANSWER.stat.step + ANSWER.stat.count,
      copyAt: ANSWER.note.at + ANSWER.note.dur,
      settleAt: ANSWER.note.at + ANSWER.note.dur,
    },
    target: { heroAt: 2.6, settleAt: 3.0 },
    notes:
      "M1's extended exception (decided Nov 25): hero ≈ 2.6 s, settle within 3.0 s. From 26 Nov 2026 the Quiz screen is Quiz Activities A (centered, quiz.design default; src/screens/QuizActivities.tsx, the reference's C3 clock: number lands 2.61 s, settles 5.4 s — see variants.reference); these markers describe the Answer Parade, still selectable.",
    variants: {
      reference: {
        label: "05 Quiz — Quiz Activities (reference C3, quiz.design = reference)",
        source: "src/screens/QuizActivities.tsx (port of the reference's C3 mountQuiz / landFx / badgeRig)",
        library: "GSAP (one clock driving the reference's closed-form springs) + canvas",
        // from the screen's start (standard transition: 04 → 05 and 05 → 06 have no hand-over here)
        // the 12th card starts at 0.55 + 11 × 0.16 = 2.31 s; the count lands at 2.61 s (LAND); the top three
        // fan from 2.86 s; the panel (nudge / badge) rises at 3.35 s; the springs are within a pixel by 5.4 s
        code: { handoverEnd: MOTION.nav.duration, heroAt: 2.61, copyAt: 3.35 + 0.6, settleAt: 5.4 },
        notes:
          "Timing exception (Nov 26 brief: reference fidelity over the budget): the reference's own clock is kept — hero 2.61 s (inside M1's 2.6 s within a frame), settle 5.4 s (over the 3.0 s target: the fan's low-damping springs, ζ .32, ring out). Not to be re-timed to the budget.",
      },
    },
  },
  video: {
    label: "06 Video",
    category: "M1",
    source: "src/screens/VideoWatchline.tsx, watchHandoff.ts (WATCH)",
    library: "Motion",
    ambientLoops: ["backgroundTwinkle"],
    measured: { handoverEnd: 0.49, heroAt: 3.14, copyAt: 3.24, settleAt: 3.24 },
    code: {
      handoverEnd: WATCH.out,
      heroAt: WATCH.to3.stat.at + WATCH.to3.stat.count,
      copyAt: WATCH.to3.cmp.at + WATCH.to3.cmp.dur,
      settleAt: WATCH.to3.cmp.at + WATCH.to3.cmp.dur,
    },
    profiles: {
      reference: {
        // probe, 26 Nov 2026, 390 × 844, from Screen 05 (?mprofile=reference)
        measured: { handoverEnd: 0.49, heroAt: 4.0, copyAt: 4.42, settleAt: 4.42 },
        source: "src/screens/VideoWatchline.tsx + watchHandoff.ts (reference branch), motion/primitives.ts",
        notes:
          "Timing exception (approved Nov 26). The minutes are the four lesson cards folding into the year's tiles (their own times and curves), ending ≈ 3.17 s; the number lands + 0.05 s (C3 video); the comparison follows + 0.4 s, the badge rises + 0.5 s on the panel spring. Wide row: the swell is scaled to stay 8 px inside the screen (≈ 1.12 at 390 px). Tap lock unchanged (150 ms).",
      },
    },
    target: STAT,
  },
  subject: {
    label: "07 Subject",
    category: "M1",
    source: "src/screens/SubjectTakeover.tsx (TAKEOVER)",
    library: "Motion + GSAP",
    ambientLoops: ["backgroundTwinkle"],
    measured: { handoverEnd: 0.64, heroAt: 2.32, copyAt: 2.49, settleAt: 2.49 },
    code: {
      handoverEnd: TAKEOVER.out,
      heroAt: TAKEOVER.lift.at + TAKEOVER.lift.dur,
      copyAt: TAKEOVER.support.at + TAKEOVER.support.dur,
      settleAt: TAKEOVER.support.at + TAKEOVER.support.dur,
    },
    target: STAT,
  },
  peakDay: {
    label: "08 Most active day",
    category: "M1",
    reference: true,
    source: "src/screens/PeakDayLit.tsx (DAYLINE)",
    library: "rAF clock",
    ambientLoops: ["backgroundTwinkle"],
    measured: { handoverEnd: 0.61, heroAt: 1.66, copyAt: 1.85, settleAt: 1.85 },
    code: {
      handoverEnd: DAYLINE.out,
      heroAt: DAYLINE.heroMonth.at + DAYLINE.heroMonth.dur,
      copyAt: DAYLINE.support.at + DAYLINE.support.dur,
      settleAt: DAYLINE.end,
    },
    target: { heroAt: "keep", copyAt: "keep", settleAt: "keep" },
  },
  learnerType: {
    label: "09 Learner type",
    category: "M2",
    source: "src/screens/LearnerReveal.tsx (DURATION 1.65, progress map)",
    library: "rAF clock",
    ambientLoops: ["backgroundTwinkle"],
    measured: { handoverEnd: 0.35, heroAt: 1.32, copyAt: 1.59, settleAt: 1.72 },
    // generic T1 page turn; identity 0.79 × 1.65; actions 0.94 × 1.65; clock 1.65
    code: { handoverEnd: MOTION.nav.duration, heroAt: 0.79 * 1.65, copyAt: 0.94 * 1.65, settleAt: 1.65 },
    target: EMOTIONAL,
  },
  marksheet: {
    label: "10 Marksheet",
    category: "M3",
    source: "src/screens/MarksheetBento.tsx (ASSEMBLE)",
    library: "Motion",
    ambientLoops: ["backgroundTwinkle"],
    // hero: the card in place (≈, from the filmstrip)
    measured: { handoverEnd: 0.52, heroAt: 0.8, copyAt: 1.18, settleAt: 1.18 },
    code: {
      handoverEnd: ASSEMBLE.out,
      heroAt: ASSEMBLE.groups[1].at + ASSEMBLE.groups[1].dur,
      copyAt: ASSEMBLE.actions.at + ASSEMBLE.actions.dur,
      settleAt: ASSEMBLE.end,
    },
    target: { settleAt: 1.6 },
  },
  close: {
    label: "11 See you in 2027 (The Year Turns)",
    category: "M4",
    reference: true,
    source: "src/screens/YearTurnsClosing.tsx (YEAR_TURNS)",
    library: "GSAP",
    ambientLoops: ["backgroundTwinkle"],
    // hero (the roll) was not measured separately; settleAt = the ending before the offer
    measured: { handoverEnd: 0.71, heroAt: null, copyAt: null, settleAt: null, offerSettleAt: 4.24 },
    // roll 0.85 + 1.15; line 1.7 + 0.55; end 2.35; offer 3.45 → 4.2
    code: { handoverEnd: ONWARD.out, heroAt: 2.0, copyAt: 2.25, settleAt: 2.35, offerStartAt: 3.45, offerSettleAt: 4.2 },
    target: { heroAt: "keep", copyAt: "keep", settleAt: "keep", ...OFFER },
    notes: `Follows the shared offer rule once refinement activates it (decided Nov 25; the ≈ 0.1 s shift is accepted): start ${OFFER_RULE.afterCopySettle} s after the copy settles (≈ 3.55 s vs 3.45 s today), ${OFFER_RULE.entrance} s entrance.`,
  },
  freshCover: {
    label: "Fresh Start · cover",
    category: "M4",
    source: "src/screens/EndScreens.tsx",
    library: "Motion",
    ambientLoops: ["backgroundTwinkle"],
    measured: { handoverEnd: null, heroAt: null, copyAt: null, settleAt: null },
    code: { handoverEnd: null, heroAt: null, copyAt: null, settleAt: null },
    target: {},
    notes: "Not covered by the audit.",
  },
  freshClose: {
    label: "Fresh Start · close",
    category: "M4",
    source: "src/screens/EndScreens.tsx",
    library: "Motion",
    ambientLoops: ["backgroundTwinkle"],
    measured: { handoverEnd: null, heroAt: null, copyAt: null, settleAt: null },
    code: { handoverEnd: null, heroAt: null, copyAt: null, settleAt: null },
    target: {},
    notes: "Not covered by the audit.",
  },
} satisfies Record<string, ScreenMotion>;

/** The Bird Journey variants of 01 and 11 (dev-only experiment). */
export const BIRD_MOTION = {
  cover: {
    label: "Bird Journey cover",
    category: "M4",
    source: "src/journey/ExperimentalBirdJourneyCover.tsx (JOURNEY)",
    library: "GSAP + flight ticker",
    ambientLoops: ["birdIdle", "coverDigitFloat", "coverArrowNudge", "backgroundTwinkle"],
    measured: { handoverEnd: 0.28, heroAt: 3.8, copyAt: 4.1, settleAt: 4.13 },
    // head 3.3 + 0.5; start control 3.56 + 0.38; end 3.95
    code: { handoverEnd: 0.28, heroAt: 3.8, copyAt: 3.94, settleAt: 3.95 },
    target: { heroAt: "keep", copyAt: "keep", settleAt: "keep" },
  },
  close: {
    label: "Bird Journey closing",
    category: "M4",
    source: "src/journey/ExperimentalBirdJourneyClosingSky.tsx (SKY_CLOSING)",
    library: "GSAP + flight ticker",
    ambientLoops: ["birdFlight", "backgroundTwinkle"],
    measured: { handoverEnd: 0.7, heroAt: 4.85, copyAt: 4.85, settleAt: null, offerSettleAt: 7.35 },
    // line 4.3 + 0.55; actions 4.45 + 0.5 = end 4.95; reveal 6.45 → 7.35
    code: { handoverEnd: ONWARD.out, heroAt: 4.85, copyAt: 4.95, settleAt: 4.95, offerStartAt: 6.45, offerSettleAt: 7.35 },
    target: { heroAt: [3.0, 3.2], ...OFFER },
    notes: "Future: the closing message at ≈ 3.0–3.2 s without giving up convincing flight.",
  },
} satisfies Record<string, ScreenMotion>;

/** Bird-led Storytelling (version 2 experiment): the screens that differ from the original. */
export const BIRD_LED_MOTION = {
  study: {
    label: "Bird-led · 02 The Timekeeper",
    category: "M1",
    source: "src/screens/StudyTimekeeper.tsx (TIMEKEEPER)",
    library: "GSAP (bird rig + clock hands) + Motion (count-up)",
    ambientLoops: ["liveClock", "backgroundTwinkle"],
    // not yet measured by an audit run; the Motion Inspector shows live values
    measured: { handoverEnd: null, heroAt: null, copyAt: null, settleAt: null },
    // revised Nov 25 (friction model: stuck → gives way → coasts to rest on the real minute): the coast is
    // 1.6–2.8 s depending on how far the hand must turn, so the hands settle at ≈ 3.5–4.5 s. Values below: the
    // inspector's fixed wall clock (10:10, a near-full turn, the longest case): hands and count land ≈ 4.5;
    // comparison 4.5 + 0.45; the bird's return 4.58 → 5.43, settled ≈ 5.73
    code: { handoverEnd: SKY_HANDOFF.coverOut, heroAt: 4.5, copyAt: 4.95, settleAt: 5.73, conceptEndAt: 4.5 },
    target: { heroAt: [3.1, 3.9], settleAt: 4.8 },
    notes: "Brief (physics-inspired): approach 0–0.8, anticipation/resistance 0.8–1.2, push 1.2–1.7, free momentum 1.7–3.4, return 3.4–4.5, settle to 4.8. The free run's length depends on the time of day (how far the minute hand must turn).",
  },
} satisfies Record<string, ScreenMotion>;
