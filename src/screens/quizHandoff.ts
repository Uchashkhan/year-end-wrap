import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ANSWER } from "../story/entry";

gsap.registerPlugin(CustomEase);
// Hand-overs share choreography with Motion and timers that run on wall-clock
// time, so GSAP must too (see heroHandoff.ts).
gsap.ticker.lagSmoothing(0);

/**
 * Screen 04 → 05 "Spotlight → Quiz" and Screen 05's three states as ONE GSAP
 * master timeline.
 *
 * Ownership (never shared with Motion):
 *   .tc-figure, .tc-pool, .tc-dim, .tc-beam (04)   yPercent, scaleX, opacity — 04's own timeline is killed first
 *   .qa-deck, .qa-opt (05)                        x, y, rotation, scale, opacity
 *   .qa-bar, .qa-bar-track, .qa-bar-fill,
 *   .qa-check (05)                                x, y, rotation, scaleX/scale, opacity
 *   the slide's data-qa attribute                 quiz → pick → done → final (colour
 *                                                 states are CSS transitions on it)
 * Motion owns 04's text fade and all of 05's text.
 *
 * Geometry: CSS lays everything out in its FINAL place (state 03). States 01 and
 * 02 are transforms computed from those layout boxes (offset*, which ignore
 * transforms — safe on re-runs), so the final frame is always the CSS one.
 */
const EASE = {
  leave: CustomEase.create("wrap-quiz-leave", "0.5,0,0.75,0.4"),
  arrive: CustomEase.create("wrap-quiz-arrive", "0.2,0.8,0.3,1"),
  glide: CustomEase.create("wrap-quiz-glide", "0.6,0,0.25,1"),
  press: CustomEase.create("wrap-quiz-press", "0.3,0,0.5,1"),
};

/** Layout box of `el` relative to `root` (sums offsets; ignores transforms). */
function boxIn(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== root) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight, cx: x + el.offsetWidth / 2, cy: y + el.offsetHeight / 2 };
}

export function quizTimeline(root: HTMLElement, opts: { from: HTMLElement | null; shift: number }) {
  const { from, shift } = opts;
  const at = (t: number) => Math.max(0, t + shift);
  const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
  const setState = (s: string) => tl.call(() => void (root.dataset.qa = s), undefined, undefined);

  // A–C, Screen 04's side: the teacher sinks away; the light stays, narrows, goes.
  if (from) {
    const q = (s: string) => from.querySelector(s);
    const fig = q(".tc-figure");
    const pool = q(".tc-pool");
    const dim = q(".tc-dim");
    const beam = q(".tc-beam");
    if (fig) tl.to(fig, { yPercent: 45, opacity: 0, duration: ANSWER.figureOut.dur, ease: EASE.leave }, ANSWER.figureOut.at);
    if (pool) tl.to(pool, { opacity: 0, duration: ANSWER.poolOut.dur, ease: "none" }, ANSWER.poolOut.at);
    if (dim) tl.to(dim, { opacity: 0, duration: ANSWER.dimOut.dur, ease: "none" }, ANSWER.dimOut.at);
    if (beam) {
      tl.to(beam, { scaleX: 0.5, transformOrigin: "50% 0%", duration: ANSWER.beamNarrow.dur, ease: EASE.glide }, ANSWER.beamNarrow.at);
      tl.to(beam, { opacity: 0, duration: ANSWER.beamOut.dur, ease: "none" }, ANSWER.beamOut.at);
    }
  }

  const deck = root.querySelector<HTMLElement>(".qa-deck");
  const rows = [...root.querySelectorAll<HTMLElement>(".qa-opt")];
  const bar = root.querySelector<HTMLElement>(".qa-bar");
  const track = root.querySelector<HTMLElement>(".qa-bar-track");
  const fill = root.querySelector<HTMLElement>(".qa-bar-fill");
  const check = root.querySelector<HTMLElement>(".qa-check");
  if (!deck || rows.length !== 4 || !bar || !fill) return tl;

  const W = root.clientWidth;
  const H = root.clientHeight;
  const D = boxIn(deck, root);
  if (!D.w) return tl;
  const rh = rows[0].offsetHeight;
  const ox = rows.map((r) => r.offsetLeft);
  const top = rows.map((r) => r.offsetTop);
  const u = W / 100; // 1cqw

  // State 01 — the question: an even list, centred, a slight tilt.
  const g1 = 3.2 * u;
  const deck1 = { x: W / 2 - D.cx, y: H * 0.535 - D.cy, rotation: -4 };
  const row1 = (i: number, picked = false) => ({
    x: -ox[i] + (picked ? 3.5 * u : 0),
    y: D.h / 2 - (4 * rh + 3 * g1) / 2 + i * (rh + g1) - top[i],
    scale: 1,
  });
  // State 02 — done: the answers square up into one stack, the pick on top.
  const deck2 = { x: W / 2 - D.cx, y: H * 0.47 - D.cy, rotation: 0 };
  // The pick (B) sits on top; the others show as a deck beneath it, A, C, D in order.
  const depth = [1, 0, 2, 3];
  const row2 = (i: number) => ({
    x: -ox[i] + depth[i] * 0.9 * u,
    y: D.h / 2 - rh / 2 - 1.5 * u + depth[i] * 2.3 * u - top[i],
    scale: 1 - depth[i] * 0.035,
  });
  // The progress bar: centred under the stack in 02; the count's underline in 03 (its CSS place).
  const B = boxIn(bar, root);
  const bar2 = { x: W / 2 - B.cx, y: H * 0.47 + rh / 2 + 9 * u - B.cy, rotation: 0 };

  // Initial: the deck in its question pose, every answer hidden.
  gsap.set(deck, deck1);
  rows.forEach((r, i) => gsap.set(r, { ...row1(i), opacity: 0 }));
  gsap.set(bar, { ...bar2, opacity: 0 });
  gsap.set(fill, { scaleX: 0, transformOrigin: "0% 50%" });
  if (track) gsap.set(track, { opacity: 1 });
  if (check) gsap.set(check, { opacity: 0, scale: 0.6 });

  // Hero: A enters the spotlight's focus; B, C, D take their places under it.
  tl.fromTo(rows[0], { opacity: 0, y: row1(0).y + 10 }, { opacity: 1, y: row1(0).y, duration: ANSWER.first.dur, ease: EASE.arrive }, at(ANSWER.first.at));
  rows.slice(1).forEach((r, j) =>
    tl.fromTo(
      r,
      { opacity: 0, y: row1(j + 1).y + 12 },
      { opacity: 1, y: row1(j + 1).y, duration: ANSWER.rows.dur, ease: EASE.arrive },
      at(ANSWER.rows.at + j * ANSWER.rows.step),
    ),
  );

  // 01 — the pick: B presses, fills yellow, steps out.
  const pk = ANSWER.pick;
  tl.to(rows[1], { scale: 0.97, duration: pk.press, ease: EASE.press }, at(pk.at));
  tl.add(setState("pick"), at(pk.at + pk.press * 0.6));
  tl.to(rows[1], { scale: 1, x: row1(1, true).x, duration: pk.dur, ease: EASE.arrive }, at(pk.at + pk.press));

  // 02 — done: square up into a stack; the bar fills; a small check.
  const dn = ANSWER.done;
  tl.add(setState("done"), at(dn.at));
  tl.to(deck, { ...deck2, duration: dn.dur, ease: EASE.glide }, at(dn.at));
  rows.forEach((r, i) => tl.to(r, { ...row2(i), duration: dn.dur, ease: EASE.glide }, at(dn.at + Math.abs(i - 1) * 0.03)));
  tl.to(bar, { opacity: 1, duration: dn.bar.dur, ease: "none" }, at(dn.bar.at));
  tl.to(fill, { scaleX: 1, duration: dn.bar.fill.dur, ease: EASE.glide }, at(dn.bar.fill.at));
  if (check) tl.to(check, { opacity: 1, scale: 1, duration: dn.check.dur, ease: EASE.arrive }, at(dn.check.at));

  // 03 — the year: the stack fans out into the finished-quiz rails; the bar rises
  // to underline the count; colours and ticks follow data-qa="final" (CSS).
  const fn = ANSWER.final;
  tl.add(setState("final"), at(fn.at));
  tl.to(deck, { x: 0, y: 0, rotation: -7, duration: fn.dur, ease: EASE.glide }, at(fn.at));
  rows.forEach((r, i) => tl.to(r, { x: 0, y: 0, scale: 1, duration: fn.dur, ease: EASE.glide }, at(fn.at + i * fn.step)));
  if (check) tl.to(check, { opacity: 0, scale: 0.8, duration: 0.2, ease: "none" }, at(fn.at - 0.05));
  if (track) tl.to(track, { opacity: 0, duration: 0.3, ease: "none" }, at(fn.under.at));
  tl.to(bar, { x: 0, y: 0, rotation: -4, duration: fn.under.dur, ease: EASE.glide }, at(fn.under.at));

  return tl;
}
