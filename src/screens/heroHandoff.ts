import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { FLOW } from "../story/entry";

gsap.registerPlugin(CustomEase);

/**
 * The Screen 02 → 03 hero hand-over as ONE GSAP master timeline: the outgoing
 * clock, the incoming yellow chair and the hall's rows share one playhead, so
 * their overlaps are exact and the whole scene is killed in one call.
 *
 * Ownership (never shared with Motion):
 *   .sc-clock (Screen 02)   yPercent
 *   .fr-you                 y, scale, opacity
 *   .fr-row-N               y, scaleY, opacity
 * Motion keeps Screen 02's text fade, Screen 03's text masks, the count and all
 * story UI. Screen 02 stops its own Motion entrance before this runs.
 *
 * Eases are explicit curves, chosen by job: the clock accelerates away (leaving),
 * the chair and rows decelerate into place (arriving). No overshoot anywhere.
 */
const EASE = {
  drop: CustomEase.create("wrap-drop", "0.55,0,0.9,0.45"),
  arrive: CustomEase.create("wrap-arrive", "0.16,1,0.3,1"),
  stand: CustomEase.create("wrap-stand", "0.22,1,0.36,1"),
};

export function heroTimeline(root: HTMLElement, opts: { clock: HTMLElement | null; shift: number }) {
  const { clock, shift } = opts;
  const you = root.querySelector<SVGGElement>(".fr-you");
  const rows = [...root.querySelectorAll<SVGGElement>(".fr-row")]
    .map((el) => ({ el, r: Number(/fr-row-(\d+)/.exec(el.getAttribute("class") ?? "")?.[1] ?? 0) }))
    .sort((a, b) => a.r - b.r); // front row first

  const tl = gsap.timeline({ defaults: { overwrite: "auto" } });

  // B — the clock drops straight down, fully below the frame (66cqw of its 110cqw show).
  if (clock) tl.to(clock, { yPercent: 64, duration: FLOW.clock.dur, ease: EASE.drop }, FLOW.clock.at);

  // C — the student's chair rises from below. It starts a touch large (it comes
  // from nearer the viewer) and settles to size as it lands: depth, not bounce.
  if (you)
    tl.fromTo(
      you,
      { y: 240, scale: 1.06, opacity: 1, transformOrigin: "50% 100%" },
      { y: 0, scale: 1, duration: FLOW.seat.dur, ease: EASE.arrive },
      FLOW.seat.at + shift,
    );

  // D — whole rows stand up in place, front row first, then backwards.
  rows.forEach(({ el, r }) =>
    tl.fromTo(
      el,
      { opacity: 0, y: 14, scaleY: 0.9, transformOrigin: "50% 100%" },
      { opacity: 1, y: 0, scaleY: 1, duration: FLOW.rows.dur, ease: EASE.stand },
      FLOW.rows.at + r * FLOW.rows.step + shift,
    ),
  );

  return tl;
}
