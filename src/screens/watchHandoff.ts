import gsap from "gsap";
import { WATCH } from "../story/entry";

/**
 * Screen 05 → 06 and Screen 06's three states ("The Watchline", V3 reference)
 * as ONE Motion sequence.
 * PRD copy only: the heading leads from state 01; text changes only at the reveal.
 *   01 play        the player card in focus (Screen 05's underline becomes its
 *                  playback line)
 *   02 accumulate  the player becomes the first lesson card; two more join; the
 *                  shared watch line anchors them
 *   03 reveal      the cards fold into the playback tiles; the line rises into
 *                  the year's watchline; the minutes reveal
 * Each video is ONE card (VideoCard) that morphs continuously through three
 * looks — player, lesson card, tile — by interpolating its box, radius, tilt,
 * shadow, play control, watched bar, detail layers and tile colour (LOOKS).
 * Its tile look is identical to the real tile, so the final hand-off is
 * invisible. Places come from invisible slot boxes (CSS); state 03 is the
 * resting layout. Screen
 * 05 rests on GSAP-set transforms; they are read once (gsap.getProperty) so
 * Motion takes over without a jump.
 */
export type Seg = [Element, Record<string, unknown>, { at: number; duration: number; ease?: unknown }];

const OUT = [0.22, 1, 0.36, 1] as const;
const ARRIVE = [0.2, 0.8, 0.3, 1] as const;
const GLIDE = [0.55, 0, 0.25, 1] as const;
const FILL = [0.35, 0, 0.2, 1] as const;

type Box = { x: number; y: number; w: number; h: number };
/** A card look: everything that differs between player, lesson card and tile. */
type Look = {
  box: Box;
  rotate: number;
  radius: number;
  opacity: number;
  shadow: string;
  bgA: number; // the card's own gradient
  bgB: number; // the tile colour
  detail: number; // diagram, identity label, controls (player only)
  label: number; // "ভিডিও লেসন"
  play: { size: number; top: string; halo: number; fill: number; ring: number; tri: number };
  bar: { side: number; bottom: number; fill: string; knob: number; opacity: number };
};
const SHADOW = {
  player: "inset 0 0 0 1px rgba(144, 184, 247, 0.42), 0 20px 40px rgba(9, 12, 61, 0.38)",
  card: "inset 0 0 0 1px rgba(157, 182, 255, 0.44), 0 20px 42px rgba(7, 10, 54, 0.43)",
  tile: "inset 0 0 0 1px rgba(183, 206, 255, 0.4), 0 0px 0px rgba(7, 10, 54, 0)",
};
/** Lesson cards (state 02), as in the reference: tilt, opacity, watched part. */
const CARD = [
  { rotate: -8, opacity: 1, played: 0.78 },
  { rotate: 6, opacity: 1, played: 0.58 },
  { rotate: 12, opacity: 0.75, played: 0.89 },
];

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

export function watchSequence(root: HTMLElement, opts: { from: HTMLElement | null; shift: number }): Seg[] {
  const { from, shift } = opts;
  const at = (t: number) => Math.max(0, t + shift);
  const q = (s: string) => root.querySelector<HTMLElement>(s);
  const qa = (s: string) => [...root.querySelectorAll<HTMLElement>(s)];
  const segs: Seg[] = [];
  const add = (el: Element | null | undefined, kf: Record<string, unknown>, t: number, duration: number, ease: unknown = OUT) => {
    if (el) segs.push([el, kf, { at: t, duration, ease }]);
  };
  const fadeIn = (el: Element | null | undefined, t: number, d = 0.35) => add(el, { opacity: [0, 1], y: [10, 0] }, t, d);

  const cards = [q(".vv-0"), q(".vv-1"), q(".vv-2")];
  const slotP = q(".vw-slot-player");
  const slotU = [q(".vw-slot-u0"), q(".vw-slot-u1"), q(".vw-slot-u2")];
  const tiles = qa(".vw-tile");
  const line = q(".vw-line");
  const lineFill = q(".vw-line-fill");
  const lineKnob = q(".vw-line-knob");
  const lineTrack = q(".vw-line-track");
  if (cards.some((c) => !c) || !slotP || slotU.some((u) => !u) || tiles.length !== 4 || !line || !lineFill || !lineKnob || !lineTrack) return segs;

  const W = root.clientWidth;
  const H = root.clientHeight;
  const u = W / 100; // 1cqw
  const L = boxIn(line, root);
  const FILL_AT = 0.76; // the reference's watched part (CSS)

  // ── the three looks ──
  const playerLook = (box: Box): Look => ({
    box,
    rotate: 0,
    radius: 4.6 * u,
    opacity: 1,
    shadow: SHADOW.player,
    bgA: 1,
    bgB: 0,
    detail: 1,
    label: 0,
    play: { size: 11.8 * u, top: "45%", halo: 1, fill: 1, ring: 0, tri: 5 * u },
    bar: { side: 15, bottom: 37, fill: "39%", knob: 1, opacity: 1 },
  });
  const cardLook = (i: number, box: Box): Look => ({
    box,
    rotate: CARD[i].rotate,
    radius: 4.4 * u,
    opacity: CARD[i].opacity,
    shadow: SHADOW.card,
    bgA: 1,
    bgB: 0,
    detail: 0,
    label: 1,
    play: { size: 9 * u, top: "46%", halo: 0, fill: 0, ring: 1, tri: 4.4 * u },
    bar: { side: 16, bottom: 4.6 * u, fill: `${CARD[i].played * 100}%`, knob: 0, opacity: 1 },
  });
  const tileLook = (box: Box): Look => ({
    box,
    rotate: 0,
    radius: 9,
    opacity: 1,
    shadow: SHADOW.tile,
    bgA: 0,
    bgB: 1,
    detail: 0,
    label: 0,
    play: { size: 5.4 * u, top: "50%", halo: 0, fill: 0, ring: 0, tri: 5.4 * u },
    bar: { side: 16, bottom: 4.6 * u, fill: "100%", knob: 0, opacity: 0 },
  });
  const P = boxIn(slotP!, root);
  const U = slotU.map((s) => boxIn(s!, root));
  const T = tiles.map((t) => boxIn(t, root));
  const looks = [0, 1, 2].map((i) => ({ card: cardLook(i, U[i]), tile: tileLook(T[i]) }));

  /** Interpolate a card from one look to another, every property together. */
  const morph = (el: HTMLElement, a: Look, b: Look, t: number, d: number, ease: unknown = GLIDE) => {
    const c = (s: string) => el.querySelector(s);
    add(
      el,
      {
        left: [a.box.x, b.box.x],
        top: [a.box.y, b.box.y],
        width: [a.box.w, b.box.w],
        height: [a.box.h, b.box.h],
        rotate: [a.rotate, b.rotate],
        borderRadius: [a.radius, b.radius],
        boxShadow: [a.shadow, b.shadow],
        opacity: [a.opacity, b.opacity],
      },
      t,
      d,
      ease,
    );
    add(c(".vv-bg-a"), { opacity: [a.bgA, b.bgA] }, t, d, ease);
    add(c(".vv-bg-b"), { opacity: [a.bgB, b.bgB] }, t, d, ease);
    // Details fade early in the move (they don't scale), so nothing distorts.
    const early = d * 0.45;
    for (const s of [".vv-art", ".vv-id", ".vv-ctrl"]) add(c(s), { opacity: [a.detail, b.detail] }, t, early, "linear");
    add(c(".vv-label"), { opacity: [a.label, b.label] }, a.label > b.label ? t : t + d * 0.55, early, "linear");
    add(c(".vv-play"), { width: [a.play.size, b.play.size], height: [a.play.size, b.play.size], top: [a.play.top, b.play.top] }, t, d, ease);
    add(c(".pp-halo"), { opacity: [a.play.halo, b.play.halo] }, t, d * 0.6, "linear");
    add(c(".pp-fill"), { opacity: [a.play.fill, b.play.fill] }, t, d * 0.6, "linear");
    add(c(".pp-ring"), { opacity: [a.play.ring, b.play.ring] }, t, d, "linear");
    add(c(".pp-tri"), { width: [a.play.tri, b.play.tri], height: [a.play.tri, b.play.tri] }, t, d, ease);
    add(c(".vv-bar"), { left: [a.bar.side, b.bar.side], right: [a.bar.side, b.bar.side], bottom: [a.bar.bottom, b.bar.bottom], opacity: [a.bar.opacity, b.bar.opacity] }, t, d, ease);
    add(c(".vv-fill"), { width: [a.bar.fill, b.bar.fill] }, t, d, ease);
    add(c(".vv-knob"), { opacity: [a.bar.knob, b.bar.knob] }, t, d * 0.5, "linear");
  };
  /** Hold a card in a look (instant), e.g. before it enters. */
  const set = (el: HTMLElement, l: Look, opacity: number) => morph(el, { ...l, opacity }, { ...l, opacity }, 0, 0.001, "linear");

  // ── 05's side: rails drop away; the underline becomes the player's played part ──
  if (from) {
    const deck = from.querySelector<HTMLElement>(".qa-deck");
    const bar = from.querySelector<HTMLElement>(".qa-bar");
    const g = (el: Element, p: string) => Number(gsap.getProperty(el, p)) || 0;
    if (deck) {
      const y0 = g(deck, "y");
      add(
        deck,
        { x: [g(deck, "x"), g(deck, "x")], y: [y0, y0 + H * 0.06], rotate: [g(deck, "rotation"), g(deck, "rotation")], opacity: [1, 0] },
        WATCH.deckOut.at,
        WATCH.deckOut.dur,
        [0.5, 0, 0.75, 0.4],
      );
    }
    if (bar && bar.offsetParent) {
      const pr = (bar.offsetParent as HTMLElement).getBoundingClientRect();
      const barL = pr.left + bar.offsetLeft;
      const barCy = pr.top + bar.offsetTop + bar.offsetHeight / 2;
      const rr = root.getBoundingClientRect();
      const tr = { left: rr.left + P.x + 15, top: rr.top + P.y + P.h - 37 - 4, width: P.w - 30, height: 4 };
      add(
        bar,
        {
          x: [g(bar, "x"), tr.left - barL],
          y: [g(bar, "y"), tr.top + tr.height / 2 - barCy],
          rotate: [g(bar, "rotation"), 0],
          scaleX: [g(bar, "scaleX") || 1, (tr.width * 0.39) / bar.offsetWidth],
          scaleY: [g(bar, "scaleY") || 1, tr.height / bar.offsetHeight],
        },
        WATCH.bar.at,
        WATCH.bar.dur,
        GLIDE,
      );
      add(bar, { opacity: [1, 0] }, WATCH.barFade.at, WATCH.barFade.dur, "linear");
    }
  }

  // The reference's ground fades in over the shared background as 05 leaves.
  add(q(".vw-ground"), { opacity: [0, 1] }, 0, from ? 0.4 : 0.25, "linear");

  // ═════ 01 play ═════
  const [c0, c1, c2] = cards as HTMLElement[];
  const p0 = playerLook(P);
  set(c0, { ...p0, box: { ...P, y: P.y + 18 } }, 0);
  set(c1, { ...looks[1].card, box: { ...U[1], x: U[1].x + 0.3 * W } }, 0);
  set(c2, { ...looks[2].card, box: { ...U[2], x: U[2].x + 0.3 * W } }, 0);
  const s1 = WATCH.s1;
  // The PRD heading "ভিডিও দেখে শিখেছ" leads from the first state and stays.
  add(q(".vw-head > span"), { y: ["140%", "0%"] }, at(s1.head), 0.45);
  morph(c0, { ...p0, box: { ...P, y: P.y + 18 }, opacity: 0 }, p0, at(s1.player.at), s1.player.dur, ARRIVE);

  // ═════ 01 → 02 accumulate ═════
  const t2 = WATCH.to2;
  // The player morphs into the first lesson card (one element, every property).
  morph(c0, p0, looks[0].card, at(t2.player.at), t2.player.dur);
  // Two more lesson cards slide in behind it, from the right.
  [c1, c2].forEach((c, j) => {
    const i = j + 1;
    const l = looks[i].card;
    morph(c, { ...l, box: { ...l.box, x: l.box.x + 0.3 * W }, opacity: 0 }, l, at(t2.units.at + j * t2.units.step), t2.units.dur, ARRIVE);
  });
  // The shared watch line: the year's watchline, shown lower in state 02.
  const lineDy = (73.9 / 100) * H - L.y; // state-02 place (reference: 624 / 844)
  const lineW = L.w;
  add(line, { y: [lineDy, lineDy] }, 0, 0.01, "linear"); // hold its state-02 place from the start
  add(lineTrack, { opacity: [0, 1] }, at(t2.line.at), 0.25, "linear");
  add(lineFill, { opacity: [0, 1] }, at(t2.line.fill.at), 0.1, "linear");
  add(lineKnob, { opacity: [0, 1] }, at(t2.line.fill.at), 0.15, "linear");
  add(lineFill, { scaleX: [0, FILL_AT] }, at(t2.line.fill.at), t2.line.fill.dur, FILL);
  add(lineKnob, { x: [-lineW * FILL_AT, 0] }, at(t2.line.fill.at), t2.line.fill.dur, FILL);

  // ═════ 02 → 03 reveal ═════
  const t3 = WATCH.to3;
  // Each card morphs into its tile; the tile look is identical to the real
  // tile, so the hand-off at the end is invisible.
  cards.forEach((c, i) => {
    const t = at(t3.units.at + i * t3.units.step);
    morph(c as HTMLElement, looks[i].card, looks[i].tile, t, t3.units.dur);
    add(c, { opacity: [1, 0] }, t + t3.units.dur, 0.001, "linear");
    add(tiles[i], { opacity: [0, 1] }, t + t3.units.dur, 0.001, "linear");
  });
  add(tiles[3], { opacity: [0, 1], x: [24, 0] }, at(t3.tile4), 0.35, ARRIVE);
  // The shared line rises to become the year's watchline.
  add(line, { y: [lineDy, 0] }, at(t3.line.at), t3.line.dur, GLIDE);
  fadeIn(q(".vw-cmp"), at(t3.cmp.at), t3.cmp.dur);
  fadeIn(q(".vw-badge"), at(t3.cmp.at + 0.1), t3.cmp.dur);
  // The heading and the minutes rise through their masks.
  const st = t3.stat;
  // The PRD heading has been up since state 01 (below).
  qa(".vw-mask > span").forEach((m, i) => add(m, { y: ["140%", "0%"] }, at(st.at + i * st.step), st.dur));

  return segs;
}
