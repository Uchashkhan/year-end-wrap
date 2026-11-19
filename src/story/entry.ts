import { createContext, useContext } from "react";
import type { Frame } from "../screens/geometry";

/**
 * How the visible slide arrived. "sky" = Cover → Screen 02 over the shared night
 * sky (forward, one step, full motion): the background never changes, only the
 * foreground hands over. Everything else is the normal T1 nav.
 * The frame size is the story frame at navigation time, in px.
 */
export interface Entry {
  /** sky: Cover → 02 · flow: 02 → 03 · fade: any other step between two sky slides · normal: T1 */
  kind: "sky" | "flow" | "fade" | "normal";
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
 * Cover → Screen 02: the four original corner digits line up in one row (s).
 *   0 → contentFade             heading, bird, description, start control fade out
 *   converge.at → +dur          each digit travels from where it is to its slot in
 *                               a centred horizontal row (straightening, one size,
 *                               one baseline, equal gaps)
 *   + hold                      the row rests
 *   exitAt → +exitDur           the four digits scale up slightly and fade together
 *   revealAt                    Screen 02 starts (overlaps the final 200 ms of the
 *                               digits' exit)
 * Total ≈ 1.65 s to the cover's removal; Screen 02 is on screen from ≈ 1.45 s.
 */
const converge = { at: 0.1, dur: 0.85 };
const hold = 0.2;
const exitAt = converge.at + converge.dur + hold;
const exitDur = 0.5;
export const SKY_HANDOFF = {
  contentFade: 0.2,
  converge,
  hold,
  exitAt,
  exitDur,
  /** Screen 02 content starts. */
  revealAt: exitAt + exitDur - 0.2,
  /** The row's exit: a subtle scale-up, not a zoom. */
  exitScale: 1.12,
  /** The cover is removed once the year has gone. */
  coverOut: exitAt + exitDur,
  /** One curve for the whole convergence: coordinated, no overshoot. */
  ease: [0.45, 0, 0.2, 1] as const,
  /** Navigation is locked until Screen 02 has visibly arrived (ms). */
  lockMs: Math.round((exitAt + exitDur + 0.3) * 1000),
} as const;

/**
 * Screen 02 → Screen 03, "Clock drops, seat rises" (forward, full motion), in s
 * from the tap. The night sky and the story chrome never move.
 *   A  0 → 0.18        Screen 02's headline, number and line fade; the clock holds
 *   B  0.15 → 0.57     the clock drops straight down below the frame (accelerating)
 *   C  0.36 → 0.86     the student's yellow chair rises from below and settles
 *                      (decelerating), overlapping the clock's last third
 *   D  0.50 → ≈1.2     the other rows stand up in place, front row first, then
 *                      backwards (row-level stagger) — they begin while the yellow
 *                      chair is still settling, so there is no pause
 *   E  0.78 → ≈1.35    headline rises through its mask, the number counts, unit fades in
 * Ownership: the hero timeline (B, C, D) is ONE GSAP master timeline built by
 * Screen 03 (screens/heroHandoff.ts); Motion owns everything else (A, E, the
 * story UI). No element property is animated by both.
 */
export const FLOW = {
  textOut: 0.18,
  clock: { at: 0.15, dur: 0.42 },
  /** Screen 02 is removed once its clock is gone. */
  out: 0.65,
  seat: { at: 0.36, dur: 0.5 },
  rows: { at: 0.5, step: 0.05, dur: 0.42 },
  stat: { at: 0.78, count: 0.5 },
  /** Taps are ignored until the entrance has essentially settled (ms). */
  lockMs: 1100,
} as const;
