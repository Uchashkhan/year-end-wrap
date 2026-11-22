import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { FLOW } from "../story/entry";

gsap.registerPlugin(CustomEase);
// Hand-overs share choreography with Motion and timers that run on wall-clock
// time, so GSAP must too: no lag smoothing (it would let GSAP fall behind after
// a slow frame and desynchronise the two screens).
gsap.ticker.lagSmoothing(0);

/**
 * Screen 02 → 03 "Clock drops, seat rises" into "The Roll Call" as ONE GSAP
 * master timeline: 02's clock, and 03's room, seat, ring and recede.
 *
 * Ownership (never shared with Motion):
 *   .sc-clock (Screen 02)         yPercent
 *   .fr-stage                     y            (the hall's step back)
 *   .fr-rows, .fr-row-N           opacity, y   (the room as one arrangement)
 *   .fr-you                       y, scale     (the student's seat)
 *   .fr-halo                      opacity, scale
 * Motion keeps Screen 02's text fade and Screen 03's text.
 *
 * Resting state is CSS: the hall stepped back (its layout place), the rows
 * receded, the ring gone, the yellow seat whole.
 * GSAP sets SVG transforms as attributes, so pre-states are opacity only.
 */
const EASE = {
  drop: CustomEase.create("wrap-drop", "0.55,0,0.9,0.45"),
  arrive: CustomEase.create("wrap-arrive", "0.16,1,0.3,1"),
  settle: CustomEase.create("wrap-settle-room", "0.22,1,0.36,1"),
  recede: CustomEase.create("wrap-recede", "0.45,0,0.2,1"),
};

export function heroTimeline(root: HTMLElement, opts: { clock: HTMLElement | null; shift: number }) {
  const { clock, shift } = opts;
  const at = (t: number) => Math.max(0, t + shift);
  const q = (s: string) => root.querySelector<HTMLElement>(s);
  const stage = q(".fr-stage");
  const rowsG = q(".fr-rows");
  const rows = [...root.querySelectorAll<SVGGElement>(".fr-row")]
    .map((el) => ({ el, r: Number(/fr-row-(\d+)/.exec(el.getAttribute("class") ?? "")?.[1] ?? 0) }))
    .sort((a, b) => b.r - a.r); // front row (highest index) first
  const you = q(".fr-you");
  const halo = q(".fr-halo");

  const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
  const lift = root.clientHeight * 0.066; // the hall's step back at the recede (CSS: 61.6cqh vs 55cqh)

  // Initial: the hall at its forward place; everything but the clock hidden.
  if (stage) gsap.set(stage, { y: -lift });
  if (rowsG) gsap.set(rowsG, { opacity: 1 });
  rows.forEach(({ el }) => gsap.set(el, { opacity: 0, y: 22 }));
  if (halo) gsap.set(halo, { opacity: 0, scale: 0.6, transformOrigin: "50% 50%" });

  // The clock drops straight down, fully out of the frame.
  if (clock) tl.to(clock, { yPercent: 64, duration: FLOW.clock.dur, ease: EASE.drop }, FLOW.clock.at);

  // The student's seat rises from the same place, before the clock has gone —
  // straight to its RESTING spot: while the hall is lifted it carries the
  // opposite offset, which the recede unwinds in step with the hall, so the
  // seat lands once and never moves again.
  const hall = root.querySelector<SVGSVGElement>(".fr-hall");
  const unit = hall ? hall.getBoundingClientRect().width / 390 : 1; // px per hall unit
  const counter = lift / unit;
  if (you)
    tl.fromTo(
      you,
      { y: counter + 240, scale: 1.06, opacity: 1, transformOrigin: "50% 100%" },
      { y: counter, scale: 1, duration: FLOW.seat.dur, ease: EASE.arrive },
      at(FLOW.seat.at),
    );

  // 01 classroom: the room establishes as one arrangement, front to back.
  const rm = FLOW.room;
  rows.forEach(({ el }, i) =>
    tl.to(el, { opacity: 1, y: 0, duration: rm.dur, ease: EASE.settle }, at(rm.at + i * rm.step)),
  );

  // The room recedes first (below), then the seat gets its own moment.
  // 02 present — the seat's own moment, after the room has settled: its light
  // comes up, it lifts once (no bounce), a ring forms and holds, then widens away.
  const pr = FLOW.present;
  const aura = q(".fr-you-aura");
  const glow = q(".fr-you-glow");
  if (aura) tl.fromTo(aura, { opacity: 0, scale: 0.6, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: pr.glow, ease: EASE.settle }, at(pr.at));
  if (glow) tl.fromTo(glow, { opacity: 0.3 }, { opacity: 1, duration: pr.glow, ease: EASE.settle }, at(pr.at));
  if (you) {
    tl.to(you, { scale: 1.07, duration: pr.lift * 0.45, ease: EASE.settle }, at(pr.at));
    tl.to(you, { scale: 1, duration: pr.lift * 0.55, ease: EASE.recede }, at(pr.at + pr.lift * 0.45));
  }
  const h = FLOW.halo;
  if (halo) {
    tl.to(halo, { opacity: 0.95, scale: 1.05, duration: h.dur, ease: EASE.settle }, at(h.at));
    tl.to(halo, { opacity: 0, scale: 1.18, duration: 0.45, ease: EASE.recede }, at(h.out));
  }
  // … and the others recede: they dim, and the hall steps back.
  const rc = FLOW.recede;
  if (rowsG) tl.to(rowsG, { opacity: 0.6, duration: rc.dur, ease: EASE.recede }, at(rc.at));
  if (stage) tl.to(stage, { y: 0, duration: rc.dur, ease: EASE.recede }, at(rc.at));
  if (you) tl.to(you, { y: 0, duration: rc.dur, ease: EASE.recede }, at(rc.at));

  return tl;
}

/**
 * Snap Screen 03 to its resting frame: stop every tween on its room (its own
 * entrance and Screen 04's hand-over) and drop their inline values, so the CSS
 * resting state shows. Used when the slide is revived mid-exit.
 */
export function settleHall(root: HTMLElement) {
  const els = root.querySelectorAll(".fr-stage, .fr-rows, .fr-row, .fr-you, .fr-halo, .fr-you-aura, .fr-you-glow");
  gsap.killTweensOf(els);
  gsap.set(els, { clearProps: "all" });
  // The pre-entrance CSS hides these until the entrance shows them; it has run.
  gsap.set(root.querySelectorAll(".fr-you, .fr-row"), { opacity: 1 });
}
