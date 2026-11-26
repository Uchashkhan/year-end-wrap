import type { Slide } from "../data/compose";
import { MOTION } from "../lib/motion";
import { ANSWER, ASSEMBLE, DAYLINE, FLOW, FOCUS, ONWARD, SKY_HANDOFF, TAKEOVER, WATCH, type Entry } from "../story/entry";

/**
 * Screen-to-screen hand-overs, in one table keyed by step ("study→live").
 * StoryViewer (which kind runs, how long the outgoing screen stays, the tap
 * lock) and background.ts (the colour transition length) both read it.
 *
 * Every number is the existing constant from story/entry.ts, referenced, not
 * copied: behaviour is unchanged. The screens' own phase timings stay in
 * entry.ts and the screens; phase markers per screen are in motion/screens.ts.
 */
export type ScreenId = Slide["id"];
export type HandoverKind = Entry["kind"];
type Bespoke = Exclude<HandoverKind, "fade" | "normal">;

export interface Handover {
  kind: Bespoke;
  from: ScreenId;
  to: ScreenId;
  /** Extra condition the step needs (besides: forward one step, full motion). */
  requires?: Requirement | Requirement[];
}

export interface KindTiming {
  /** How long the outgoing screen stays mounted (s); for fade / normal, the T1 transition length. */
  out: number;
  /** Background colour transition (s), full motion. */
  bg: number;
  /**
   * Navigation while the hand-over runs. Today: a lock (taps ignored for lockMs).
   * Future (not active): "tapToComplete" — a tap finishes the entrance, the next advances.
   */
  navigation: { mode: "lock"; lockMs: number } | { mode: "none" };
}

/** Forward, one step, full motion. Any other step is "fade" (two sky slides) or "normal" (T1). */
export const HANDOVERS: readonly Handover[] = [
  { kind: "sky", from: "cover", to: "study", requires: "coverOnSky" },
  { kind: "flow", from: "study", to: "live", requires: "liveOriginal" },
  { kind: "focus", from: "live", to: "teacher", requires: "liveOriginal" },
  { kind: "answer", from: "teacher", to: "quiz", requires: ["quizParade", "teacherOriginal"] },
  { kind: "watch", from: "quiz", to: "video", requires: "quizParade" },
  { kind: "takeover", from: "video", to: "subject" },
  { kind: "dayline", from: "subject", to: "peakDay" },
  { kind: "assemble", from: "learnerType", to: "marksheet", requires: "marksheetCurrent" },
  { kind: "onward", from: "marksheet", to: "close" },
];

const lock = (lockMs: number) => ({ mode: "lock" as const, lockMs });

export const KIND_TIMING: Record<HandoverKind, KindTiming> = {
  sky: { out: SKY_HANDOFF.coverOut, bg: SKY_HANDOFF.bgDur, navigation: lock(SKY_HANDOFF.lockMs) },
  flow: { out: FLOW.out, bg: FLOW.out, navigation: lock(FLOW.lockMs) },
  focus: { out: FOCUS.out, bg: FOCUS.beam.at + FOCUS.beam.dur, navigation: lock(FOCUS.lockMs) },
  answer: { out: ANSWER.out, bg: ANSWER.out, navigation: lock(ANSWER.lockMs) },
  watch: { out: WATCH.out, bg: WATCH.out, navigation: lock(WATCH.lockMs) },
  takeover: { out: TAKEOVER.out, bg: 0.8, navigation: lock(TAKEOVER.lockMs) },
  dayline: { out: DAYLINE.out, bg: 0.8, navigation: lock(DAYLINE.lockMs) },
  assemble: { out: ASSEMBLE.out, bg: 0.6, navigation: lock(ASSEMBLE.lockMs) },
  onward: { out: ONWARD.out, bg: 0.6, navigation: lock(ONWARD.lockMs) },
  fade: { out: MOTION.nav.duration, bg: 0.6, navigation: { mode: "none" } },
  normal: { out: MOTION.nav.duration, bg: 0.6, navigation: { mode: "none" } },
};

/** Background colour transition under reduced motion (any kind). */
export const BG_REDUCED = 0.3;

export const isBespoke = (k: HandoverKind): k is Bespoke => k !== "fade" && k !== "normal";

export interface StepContext {
  /** Forward by exactly one, with full motion. */
  step: boolean;
  /** Both slides sit on the shared sky (01 → 03 family), so a non-bespoke step cross-fades. */
  bothSky: boolean;
  /** The cover in use shares the sky with 02 (the approved cover or Bird Journey's). */
  coverOnSky: boolean;
  /** Screen 10 is the shipped card (the V2 explorations have no assembly). */
  marksheetCurrent: boolean;
  /** Screen 05 is The Answer Parade (04 → 05 and 05 → 06 hand its answer rows and underline over); its
   *  reference design ("Quiz Activities") has none, so those steps use the standard transition. */
  quizParade: boolean;
  /** Screen 04 is "Teacher in the Spotlight" (04 → 05 takes over its figure and light); its Cinematic Spotlight has its own light. */
  teacherOriginal: boolean;
  /** Screen 03 is the original "Front-Row Seat" (03 → 04 takes over its yellow seat); its other designs have none. */
  liveOriginal: boolean;
}
type Requirement = "coverOnSky" | "marksheetCurrent" | "quizParade" | "teacherOriginal" | "liveOriginal";

/** Which hand-over a navigation runs (same rules StoryViewer used inline before). */
export function resolveKind(from: ScreenId | undefined, to: ScreenId, ctx: StepContext): HandoverKind {
  if (from && ctx.step) {
    const h = HANDOVERS.find((x) => x.from === from && x.to === to);
    const ok = h && (!h.requires || ([] as Requirement[]).concat(h.requires).every((r) => ctx[r]));
    if (h && ok) return h.kind;
  }
  return ctx.bothSky ? "fade" : "normal";
}

export function bgDuration(kind: HandoverKind, reduced: boolean): number {
  return reduced ? BG_REDUCED : KIND_TIMING[kind].bg;
}
