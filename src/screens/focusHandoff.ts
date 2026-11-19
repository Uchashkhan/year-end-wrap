import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { FOCUS } from "../story/entry";

gsap.registerPlugin(CustomEase);
// Hand-overs share choreography with Motion and timers that run on wall-clock
// time, so GSAP must too: no lag smoothing (it would let GSAP fall behind after
// a slow frame and desynchronise the two screens).
gsap.ticker.lagSmoothing(0);

/**
 * Screen 03 → 04 "focus shift" as ONE GSAP master timeline: the seats leaving
 * (Screen 03) and the light and teacher arriving (Screen 04) share one playhead.
 *
 * Ownership (never shared with Motion):
 *   .fr-row, .fr-you (03)          opacity, y          — 03's own GSAP entrance is killed first
 *   .tc-dim, .tc-beam, .tc-pool,
 *   .tc-figure (04)                opacity, scale/scaleY, y
 * Motion owns 03's text fade and 04's framing line and name.
 *
 * Eases by job: things leave softly, light comes up like dawn (slow start, long
 * settle — never a switch), the figure settles without travel. This is the
 * story's quiet moment; nothing here should feel like a reveal "hit".
 */
const EASE = {
  leave: CustomEase.create("wrap-leave-soft", "0.45,0,0.75,0.6"),
  light: CustomEase.create("wrap-dawn", "0.45,0,0.25,1"),
  arrive: CustomEase.create("wrap-settle", "0.25,0.6,0.3,1"),
};

export function focusTimeline(root: HTMLElement, opts: { from: HTMLElement | null; shift: number }) {
  const { from, shift } = opts;
  const at = (t: number) => Math.max(0, t + shift);
  const tl = gsap.timeline({ defaults: { overwrite: "auto" } });

  // A / C — Screen 03: the classroom goes, the student's seat holds a beat, then sinks away.
  if (from) {
    const rows = from.querySelectorAll(".fr-row");
    const you = from.querySelector(".fr-you");
    if (rows.length) tl.to(rows, { opacity: 0, duration: FOCUS.rowsOut.dur, ease: EASE.leave }, FOCUS.rowsOut.at);
    if (you) tl.to(you, { y: 24, opacity: 0, duration: FOCUS.seatOut.dur, ease: EASE.leave }, FOCUS.seatOut.at);
  }

  // B — the room dims; the beam opens downward from the top edge.
  const q = (s: string) => root.querySelector(s);
  const dim = q(".tc-dim");
  const beam = q(".tc-beam");
  const pool = q(".tc-pool");
  const figure = q(".tc-figure");
  if (dim) tl.fromTo(dim, { opacity: 0 }, { opacity: 1, duration: FOCUS.dim.dur, ease: EASE.light }, at(FOCUS.dim.at));
  if (beam)
    tl.fromTo(
      beam,
      { opacity: 0, scaleY: 0.6, transformOrigin: "50% 0%" },
      { opacity: 1, scaleY: 1, duration: FOCUS.beam.dur, ease: EASE.light },
      at(FOCUS.beam.at),
    );
  // C — the light pool forms where the beam lands.
  if (pool)
    tl.fromTo(
      pool,
      { opacity: 0, scale: 0.9, transformOrigin: "50% 50%" },
      { opacity: 1, scale: 1, duration: FOCUS.pool.dur, ease: EASE.light },
      at(FOCUS.pool.at),
    );
  // D — the teacher appears in the light.
  if (figure)
    tl.fromTo(
      figure,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: FOCUS.figure.dur, ease: EASE.arrive },
      at(FOCUS.figure.at),
    );

  return tl;
}
