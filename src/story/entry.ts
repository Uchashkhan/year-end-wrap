import { createContext, useContext } from "react";
import type { Frame } from "../screens/geometry";

/**
 * How the visible slide arrived. "sky" = Cover → Screen 02 over the shared night
 * sky (forward, one step, full motion): the background never changes, only the
 * foreground hands over. Everything else is the normal T1 nav.
 * The frame size is the story frame at navigation time, in px.
 */
export interface Entry {
  /** sky: Cover → 02 · flow: 02 → 03 · focus: 03 → 04 · answer: 04 → 05 · fade: any other step between two sky slides · normal: T1 */
  kind: "sky" | "flow" | "focus" | "answer" | "watch" | "takeover" | "dayline" | "assemble" | "onward" | "fade" | "normal";
  frame: Frame;
}
const EMPTY: Entry = { kind: "normal", frame: { W: 0, H: 0 } };

/** Per slide: how *this* slide entered. */
export const EntryCtx = createContext<Entry>(EMPTY);
export const useEntry = () => useContext(EntryCtx);

/**
 * Story-wide: the most recent navigation. Provided outside AnimatePresence, so a
 * slide that is *leaving* can read how it is leaving and run its own exit.
 */
export const NavCtx = createContext<Entry>(EMPTY);
export const useNav = () => useContext(NavCtx);

/**
 * Cover → Screen 02 (Nov 22): one continuous hand-over, ≈ 0.85 s, in s from the
 * tap. The digits never regroup: they leave from their corners.
 *   0 → 0.32      the centre content (bird, title, line, start control) fades
 *                 and lifts a little
 *   0 → 0.62      each corner digit moves a short way further out, past its own
 *                 edges, and fades (slightly accelerating; no regrouping)
 *   0 → 0.8       the background drifts from the cover's ground to Study Time's
 *   0.28 → 0.88   Screen 02: the clock rises from the bottom, the headline fades
 *                 up, the yellow number reveals and counts
 */
export const SKY_HANDOFF = {
  contentFade: 0.32,
  contentLift: 10,
  digitsOut: { at: 0, dur: 0.62, fadeAt: 0.22, ease: [0.45, 0, 0.7, 0.35] as const },
  /** Background colour transition length. */
  bgDur: 0.8,
  /** Screen 02 content starts. */
  revealAt: 0.28,
  /** The cover is removed once its digits have gone. */
  coverOut: 0.64,
  /** Navigation is locked until Screen 02 has visibly arrived (ms). */
  lockMs: 700,
} as const;

/**
 * Screen 02 → Screen 03, "Clock drops, seat rises" into "The Roll Call" (Nov 22):
 * ONE continuous entrance (≈ 1.1 s) with three overlapping checkpoints, in s
 * from the tap. The background layer and the story chrome never move.
 *   0 → 0.18     Screen 02's headline, number and line fade …
 *   0.04 → 0.44  … while the clock is already dropping out of the frame
 *   0.14 → 0.59  the student's yellow seat rises from the same place, before the
 *                clock has gone — straight to its resting spot, once
 *   0.1          the headline rises
 *   0.2 → 0.75   01 classroom: the four rows establish behind the seat as one
 *                arrangement, front to back
 *   0.62 → 1.12  the other seats dim and the hall steps back around the seat
 *   0.8 → 1.45   02 present — the seat's own beat: its light comes up, it lifts
 *                once gently, a ring forms round it and holds (≈ 0.4 s of
 *                stillness to take it in), then widens away
 *   1.3 → 1.8    03 reveal: the count rises above the room and counts; the
 *                statement and held total follow. Then still.
 * Ownership: the room, seat, ring and 02's clock are ONE GSAP master timeline
 * (screens/heroHandoff.ts); Motion owns 02's text fade and 03's text.
 */
export const FLOW = {
  textOut: 0.18,
  /** Starts under 02's text fade, so the frame is never empty. */
  clock: { at: 0.04, dur: 0.42 },
  /** Screen 02 is removed once its clock is gone. */
  out: 0.5,
  seat: { at: 0.14, dur: 0.5 },
  room: { at: 0.2, dur: 0.5, step: 0.05 },
  /** The other seats dim and the hall steps back, clearing the stage for the seat. */
  recede: { at: 0.62, dur: 0.5 },
  /** "Present": the seat's moment — its light comes up, one gentle lift, a ring forms; then it holds. */
  present: { at: 0.8, glow: 0.5, lift: 0.55 },
  halo: { at: 0.86, dur: 0.45, out: 1.45 },
  head: { at: 0.1 },
  /** After the seat's moment has been seen; counted by ≈ 1.8 s. */
  stat: { at: 1.3, count: 0.5 },
  /** Taps are ignored until the count is readable (ms). */
  lockMs: 1450,
} as const;

/**
 * Screen 03 → Screen 04, "focus shift" (forward, full motion), in s from the tap.
 * Screen 04 is an emotional pause after the attendance data: attention moves
 * from the student's seat to the teacher, slowly, with a held breath before the
 * name. Less celebration, more appreciation.
 *   A  0 → 0.45        03's number, text and the other seats fade; the yellow seat lingers
 *   B  0.3 → 1.45      04's room settles darker; the light comes up slowly from the top
 *   C  0.6 → 1.6       the yellow seat fades away softly as the light pool forms
 *   D  1.1 → 1.9       the teacher appears in the light; the framing line with it
 *      ≈1.9 → 1.75…    a held stillness, then the name fades softly into place (≈2.6)
 * Ownership: one GSAP master timeline (screens/focusHandoff.ts) drives 03's seats
 * and 04's light and figure; Motion drives both screens' text.
 */
export const FOCUS = {
  textOut: 0.3,
  rowsOut: { at: 0, dur: 0.45 },
  seatOut: { at: 0.6, dur: 0.55 },
  /** Screen 03 is removed once its seat has gone. */
  out: 1.2,
  dim: { at: 0.3, dur: 0.9 },
  beam: { at: 0.55, dur: 0.9 },
  pool: { at: 0.8, dur: 0.8 },
  figure: { at: 1.1, dur: 0.8 },
  framing: { at: 1.0, dur: 0.8 },
  /** After the figure has settled and a beat of stillness. */
  name: { at: 1.75, dur: 0.9 },
  /** Taps are ignored until the name has begun to appear (ms); a pause should not be skipped by accident. */
  lockMs: 1900,
} as const;

/**
 * Screen 04 → Screen 05, "Spotlight → Quiz", then Screen 05's three states
 * ("The Answer Parade — One Last Question"), in s from the tap.
 *   A  0 → 0.45        the teacher sinks out of frame; name and framing fade; the
 *                      spotlight stays
 *   B  0.15 → 0.65     the beam narrows to the centre; answer A enters its light
 *   C  0.65 → 0.95     the beam fades as B, C, D take their places under A: one
 *                      multiple-choice question (hero ≈ 0.95 s)
 *   01 quiz    1.4     an answer is picked — B fills yellow (a choice, never "correct")
 *   02 done    2.1     the four answers square up into one stack; the quiz's
 *                      progress bar fills; a small check: quiz finished
 *   03 final   3.45    the stack fans out into the finished-quiz rails at the
 *                      foot; the progress bar rises to underline the count; the
 *                      statement and count reveal; each rail ticks done
 *              ≈ 4.6   everything rests. No loops.
 * Ownership: one GSAP master timeline (screens/quizHandoff.ts) drives Screen
 * 04's figure, light and veil and Screen 05's deck, rows, bar and check
 * (transforms and opacity); state colours are CSS transitions keyed by the
 * slide's data-qa attribute, which the same timeline sets; Motion drives all text.
 */
export const ANSWER = {
  textOut: 0.25,
  figureOut: { at: 0, dur: 0.45 },
  poolOut: { at: 0, dur: 0.35 },
  dimOut: { at: 0.25, dur: 0.5 },
  beamNarrow: { at: 0.15, dur: 0.5 },
  beamOut: { at: 0.65, dur: 0.3 },
  /** Answer A, alone in the light. */
  first: { at: 0.35, dur: 0.45 },
  /** B, C, D join under it. */
  rows: { at: 0.62, step: 0.08, dur: 0.42 },
  /** Screen 04 is removed once the light has gone. */
  out: 0.95,
  headline: { at: 0.45, dur: 0.5 },
  /** State 01: the pick. */
  pick: { at: 1.4, press: 0.12, dur: 0.35 },
  /** State 02: the stack, the bar, the check. */
  done: { at: 2.1, dur: 0.6, bar: { at: 2.4, dur: 0.25, fill: { at: 2.55, dur: 0.5 } }, check: { at: 3.0, dur: 0.25 } },
  /** State 03: the reveal. */
  final: { at: 3.45, dur: 0.85, step: 0.06, under: { at: 3.5, dur: 0.8 } },
  stat: { at: 3.75, step: 0.07, dur: 0.5, count: 0.8 },
  note: { at: 4.4, dur: 0.4 },
  /** Taps are ignored until the hero hand-over is done (ms). */
  lockMs: 1000,
} as const;

/**
 * Screen 05 → Screen 06 ("The Watchline", V3 reference): three connected states
 * in ONE continuous Motion sequence (≈ 3.2 s), in s from the tap.
 *   01 play        0 → 0.5     05 fades; its underline slides into the player's
 *                              playback line; the player card and the state-01
 *                              copy rise in. Holds to ≈ 1.1.
 *   01 → 02        1.1 → 1.9   the state-01 copy hands over to state 02's; the
 *                              player becomes the first lesson card; two more
 *                              cards slide in behind; the shared line appears
 *                              and fills. Holds to ≈ 2.35.
 *   02 → 03        2.35 → 3.2  the cards fold into the playback tiles; the shared
 *                              line rises to become the year's watchline; the
 *                              minutes reveal and count; the comparison settles.
 * Ownership: one Motion sequence (screens/watchHandoff.ts); GSAP is only read
 * once to take over Screen 05's resting transforms.
 */
export const WATCH = {
  textOut: 0.2,
  deckOut: { at: 0, dur: 0.2 },
  bar: { at: 0, dur: 0.3 },
  barFade: { at: 0.28, dur: 0.1 },
  /** Screen 05 is removed once its underline has handed over. */
  out: 0.4,
  s1: { head: 0.08, player: { at: 0.1, dur: 0.42 }, copy: 0.3 },
  to2: {
    at: 1.1,
    textOut: 0.18,
    /** After the state-01 heading has gone: headings never overlap. */
    head: 1.3,
    player: { at: 1.1, dur: 0.45 },
    units: { at: 1.22, step: 0.1, dur: 0.45 },
    cap: 1.32,
    line: { at: 1.32, fill: { at: 1.38, dur: 0.55 } },
    marks: 1.45,
  },
  to3: {
    at: 2.35,
    textOut: 0.18,
    head: 2.53,
    units: { at: 2.35, step: 0.05, dur: 0.45 },
    /** After the third card has landed beside it. */
    tile4: 2.82,
    line: { at: 2.38, dur: 0.45 },
    label: 2.55,
    stat: { at: 2.5, step: 0.06, dur: 0.42, count: 0.6 },
    cmp: { at: 2.8, dur: 0.38 },
  },
  /** Navigation stays responsive: only a brief guard against double taps (ms). */
  lockMs: 150,
} as const;

/**
 * Screen 06 → Screen 07, "Subject Takes Over" with the Subject Reel (Nov 22):
 * ONE continuous entrance (≈ 2.2 s), in s from the tap; phases overlap.
 *   0 → 0.2      06's content clears; its yellow watchline stays …
 *   0.08 → 0.46  … and slides into place as 07's yellow underbar
 *   0.1 → 1.2    the reel: the student's subjects scroll up through one focus
 *                slot along a gently curved, swivelling path (3–4 readable)
 *   1.2 → 1.75   it decelerates smoothly onto the most-active subject
 *   1.45 → 1.77  the other subjects fade away; the subject turns Shikho yellow
 *   1.78         the final name takes over in place (one line, same size and
 *                place as the reel's subject); its icon comes in (1.62 → 2.07)
 *   1.74 → 2.15  the headline (once the reel has cleared above), then the line
 * Entered any other way, the same entrance runs without the hand-over and the
 * underbar grows with the name.
 */
export const TAKEOVER = {
  textOut: 0.2,
  /** Screen 06's watchline leaves with 06's text; the underbar only arrives after selection. */
  lineOut: { at: 0, dur: 0.2 },
  /** Screen 06 is removed after its exit. */
  out: 0.5,
  /**
   * The Subject Shuffle Deck (shikho_subject_shuffle_comparison.html, "Shuffle
   * Deck"): five wide, tilted lanes drift across the screen on a cubic ease-out
   * (reference: ease(t / 1.5 s)); here each lane stops at a slightly offset time
   * (stopAt, lane 0 → 4). Between align.at and +dur they straighten (tilt → 0)
   * and contract (scale 0.88). The other lanes clear over out.
   */
  deck: {
    fadeIn: 0.25,
    stopAt: [1.42, 1.48, 1.55, 1.5, 1.6],
    align: { at: 0.95, dur: 0.65 },
    out: { at: 1.28, dur: 0.42 },
    /** The lane that carries the student's subject (the middle one). */
    sel: 2,
  },
  /** The title takes the selected word's exact place (after its lane has stopped and straightened). */
  swap: 1.62,
  /** The same title then moves into its headline position. */
  lift: { at: 1.7, dur: 0.5 },
  /** Shikho yellow only once selected. */
  accent: { at: 1.75, dur: 0.35 },
  bar: { at: 2.1, dur: 0.32 },
  head: { at: 1.95, dur: 0.35 },
  art: { at: 2.05, dur: 0.45 },
  support: { at: 2.2, dur: 0.3 },
  /** No deck (a single subject): the name alone rises in. */
  name: { at: 0.35, dur: 0.45 },
  lockMs: 1300,
} as const;

/**
 * 07 → 08 "The Day That Lit Up" (shikho_most_active_day.html). 07's subject
 * clears; its yellow underbar stays, stretches to the frame's width and drops
 * to become the rail the months ride on. One continuous entrance (≈ 1.8 s):
 * months pass and settle on the peak day's month; its name glides into the
 * calendar header; the calendar opens beneath it; the day lights up in its
 * cell; the large date and the support line reveal.
 */
export const DAYLINE = {
  /** Screen 07's text clears; 07 is removed once its bar has become the rail. */
  textOut: 0.2,
  out: 0.5,
  bar: { at: 0.04, dur: 0.4 },
  /** Months scroll and decelerate (0–0.75 s): already moving, the speed eases to zero on one smooth curve. */
  months: {
    pass: 4,
    dur: 0.75,
    fadeIn: { at: 0.06, dur: 0.25 },
    /** The other months (and the rail) fade back… */
    othersOut: { at: 0.6, dur: 0.28 },
    /** …and the month's own card and number, as its name moves on. */
    chipOut: { at: 0.68, dur: 0.22 },
  },
  head: { at: 0.1, dur: 0.35 },
  /** The month's name glides into the calendar header (0.68–1.06 s), once the carousel has all but stopped. */
  month: { at: 0.68, dur: 0.38 },
  year: { at: 0.94, dur: 0.22 },
  /** The calendar opens beneath its header (0.86–1.3 s): the header band appears, then a soft edge sweeps down. */
  cal: { at: 0.86, band: 0.18, dur: 0.36 },
  /** The day lights up in its cell (1.1–1.35 s). */
  pick: { at: 1.1, dur: 0.25 },
  /** The large date rises in its masks: the day, then the month. */
  day: { at: 1.25, dur: 0.35 },
  heroMonth: { at: 1.36, dur: 0.35 },
  underline: { at: 1.52, dur: 0.26 },
  support: { at: 1.45, dur: 0.35 },
  end: 1.8,
  lockMs: 1100,
} as const;

/**
 * 09 → 10 "Assembling the year". 09's badge stays as the shared element: its
 * text and actions clear, and the badge flies into the marksheet's identity
 * tile, which establishes around it; the chapters assemble in three groups;
 * the actions last. ≈ 1.15 s.
 */
export const ASSEMBLE = {
  /** Screen 09's text and actions clear; 09 is removed once the badge has left it. */
  textOut: 0.2,
  out: 0.45,
  /** The card's ink ground. */
  ground: { at: 0.02, dur: 0.3 },
  badge: { at: 0, dur: 0.55 },
  /** The identity tile establishes around the badge; its words settle. */
  identity: { at: 0.14, dur: 0.42 },
  words: { at: 0.36, dur: 0.36 },
  /** The chapters: three coordinated groups (stickers + hero block, the pairs, the foot). */
  groups: [
    { at: 0.46, dur: 0.42 },
    { at: 0.6, dur: 0.42 },
    { at: 0.74, dur: 0.36 },
  ],
  actions: { at: 0.9, dur: 0.3 },
  end: 1.2,
  lockMs: 900,
} as const;

/**
 * EXPERIMENT (Bird Journey only) — 10 → 11 "The Journey Continues". The
 * marksheet clears in three groups (the badge a beat longer) while the Cover
 * world returns; the bird turns toward ২০২৭ and the camera follows. ≈ 2.15 s.
 */
export const ONWARD = {
  /** Screen 10 stays mounted while its card recedes (the closing's Phase A, 0–0.6 s). */
  out: 0.62,
  lockMs: 1300,
} as const;
