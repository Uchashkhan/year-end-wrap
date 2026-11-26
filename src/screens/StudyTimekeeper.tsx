import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { cubicBezier, useMotionValue, usePresence } from "motion/react";
import gsap from "gsap";
import { COPY } from "../data/copy";
import { bn } from "../lib/bangla";
import { usePrefs } from "../lib/prefs";
import { ClockDial } from "../components/AnalogClock";
import { FLOW, useEntry, useNav } from "../story/entry";
import { DURATION } from "../motion/tokens";
import { gsapEase } from "../motion/ease";
import { devRegister, fromGsap } from "../motion/timeline";
import { statSize } from "./statSize";
import { useSkyProgress } from "./studySky/progress";
import type { ScreenProps } from "./types";
import flyingRaw from "../journey/timekeeper/bird-flying.svg?raw";
import pushingRaw from "../journey/timekeeper/bird-pushing.svg?raw";
import proudRaw from "../journey/timekeeper/bird-proud.svg?raw";
import "../styles/study-clock.css";
import "../styles/timekeeper.css";

/**
 * 02 Study time — Bird-led Storytelling: "The Timekeeper" (version 2 experiment).
 *
 * The same screen as StudyClock (copy, data, clock design, background), with the
 * Shikho bird setting the clock in motion. One GSAP master timeline (s from the
 * tap; M1 Standard storytelling; ≈ 3 s, revised Nov 25 for a continuous
 * character performance), phases overlapping:
 *   0–1.0      arrival and approach — the bird takes over from the Bird Journey
 *              cover's bird (head on head, same size) and flies one continuous
 *              curved path down to the clock as it rises, its body pitching with
 *              the direction of travel; it lands on the hour hand (at 9, a ledge)
 *   1.0–1.63   touchdown, anticipation (it settles back on its feet), then the
 *              push: the lean carries the minute hand 8° with the wing tip
 *   1.35–2.3   the hand runs on under its own momentum onto the real time; the
 *              hours count up with it (1.0 s)
 *   2.02–2.64  release and travel: it straightens, lifts off and arcs onto the rim
 *   2.64–3.0   it settles at 12 o'clock, proud; ঘণ্টা and the comparison arrive
 *   rest       the live clock ticks on; the bird holds still
 * Poses: the approved SVGs exactly as supplied (journey/timekeeper/*.svg), each
 * scaled to one head height and registered on the upper torso (anatomical
 * anchors, not bounding boxes), so a pose change never changes the bird's size or
 * place; every change happens while the bird is moving. In the pushing pose only the
 * body leans (about the feet); the feet stay planted. The supplied wing is part
 * of the body silhouette, so it moves with the body rather than on its own.
 * Reduced motion / repeat view: the final frame; the clock shows the time.
 */

// ── geometry (stage = the clock's square box, 1000 units; bird frame = 1000 units) ──
/** Bird frame units → clock units: the cover bird's size at 390 px (head 51.3 px on a 429 px clock). */
const R = 0.324;
const RIG = 1000 * R; // the rig box (one Figma frame), in clock units

type Pt = { x: number; y: number };
/**
 * The supplied poses, measured in their own SVG units (Figma 1003:653 / 722 / 788):
 * the group's place in the shared 1000-unit frame, its size, and three anatomical
 * landmarks — the head centre, the head's height, and the feet contact (the
 * midpoint between the soles; for the proud pose, between its two feet's outer
 * edges, at the lower sole).
 */
const DEF = {
  flying: { off: { x: 100, y: 144 }, w: 800, h: 712.095, head: { x: 492.6, y: 166.5 }, headH: 332.9, feet: { x: 325, y: 613.5 } },
  pushing: { off: { x: 68.56, y: 161.31 }, w: 862.886, h: 677.695, head: { x: 551.6, y: 169.7 }, headH: 339.5, feet: { x: 338, y: 675 } },
  proud: { off: { x: 210.62, y: 143.77 }, w: 578.504, h: 712, head: { x: 324, y: 169.5 }, headH: 339, feet: { x: 292.6, y: 711 } },
} as const;
type PoseName = keyof typeof DEF;
/**
 * Registration. Every pose is scaled so its head is the pushing head's height
 * (one apparent size), and placed so its upper torso — 35 % of the way from the
 * head centre to the feet — sits on one rig point. Not the SVGs' bounding boxes:
 * the tail and the outstretched wing would move those.
 */
const TORSO = 0.35;
const anchorOf = (p: PoseName): Pt => {
  const d = DEF[p];
  return { x: d.head.x + TORSO * (d.feet.x - d.head.x), y: d.head.y + TORSO * (d.feet.y - d.head.y) };
};
const scaleOf = (p: PoseName) => DEF.pushing.headH / DEF[p].headH;
const Q: Pt = { x: DEF.pushing.off.x + anchorOf("pushing").x, y: DEF.pushing.off.y + anchorOf("pushing").y };
/** Each pose's box in the rig (frame units). */
const LAYOUT = Object.fromEntries(
  (Object.keys(DEF) as PoseName[]).map((p) => {
    const d = DEF[p];
    const k = scaleOf(p);
    const a = anchorOf(p);
    return [p, { x: Q.x - a.x * k, y: Q.y - a.y * k, w: d.w * k, h: d.h * k, k }];
  }),
) as Record<PoseName, { x: number; y: number; w: number; h: number; k: number }>;
/** A pose's landmark, in rig frame units. */
const inRig = (p: PoseName, g: Pt): Pt => ({ x: LAYOUT[p].x + g.x * LAYOUT[p].k, y: LAYOUT[p].y + g.y * LAYOUT[p].k });
/** The rig's top-left (clock units) that puts a pose's landmark on a stage point. */
const rigAt = (p: PoseName, g: Pt, stage: Pt): Pt => {
  const r = inRig(p, g);
  return { x: stage.x - r.x * R, y: stage.y - r.y * R };
};
/** Where the bird stands (clock units; the clock's centre is 500, 500; its rim's top is y 0). */
const PLACE = {
  // on the hour hand at 9 o'clock, 110 units left of the hub: the wing tip meets the minute hand's
  // edge at r 158, so the hand runs clear of the bird's body up to the tip
  push: rigAt("pushing", DEF.pushing.feet, { x: 390, y: 486 }),
  // at 12 o'clock exactly: the feet contact on the clock's vertical axis (and the hours' above it),
  // the soles 1.5 units into the rim's top so they rest on it (no gap, no sinking)
  proud: rigAt("proud", DEF.proud.feet, { x: 500, y: 1.5 }),
};
/** The rig turns (pitch in flight) about the registration point. */
const ORIGIN = `${Q.x / 10}% ${Q.y / 10}%`;
/** Pushing pose: feet (and the front leg) stay planted; everything else is the body. Path indices in the SVG. */
const PUSH_FEET = [16, 24, 25, 26, 27];
const PUSH_PIVOT = "338 675"; // the feet, in the pushing SVG's units
const MINUTE_START = 25.3; // the hand's left edge under the wing tip (21.7° + its half-width at r 158)
const HOUR_START = 270; // the ledge
const SECOND_START = 150; // out of the bird's way

// ── timing (s from the tap): ≈ 4.5–4.8 s (revised Nov 25: physics-inspired) ──
export const TIMEKEEPER = {
  clock: { at: 0.05, dur: DURATION.settle },
  lead: { at: 0.15, dur: 0.5 },
  /** Approach and braking: one curved flight from the cover's bird to the hour-hand ledge, slowing to a stop. */
  approach: { at: 0, dur: 0.78, cut: 0.72 },
  touch: { at: 0.74, dur: 0.24 },
  /** Anticipation: a small gather back, then the wing meets the hand (contact at 1.0). */
  gather: { at: 0.8, dur: 0.14, deg: -4 },
  contact: 1.0,
  /** Contact → release: the hand resists, then gains speed; the bird's lean follows the hand (solved per frame). */
  release: 1.7,
  /** Follow-through: a damped spring (ωn, ζ) from the release lean and a share of the lunge's speed. */
  follow: { wn: 13, zeta: 0.62, carry: 0.3, dur: 0.6 },
  /** Lift into a hover beside the clock to watch; the hour hand is free once the bird is off it. */
  lift: { at: 2.02, dur: 0.5 },
  bob: { amp: 7, period: 0.9 },
  number: { at: 1.0, dur: DURATION.base },
  /** After the clock has settled: the return flight onto the rim, and the landing. */
  returnDelay: 0.08,
  flight: 0.85,
  perchAt: 0.86, // of the flight: flying → proud, descending onto the rim
  settle: 0.3,
} as const;

/**
 * The minute hand as a body with friction (physics-inspired, closed form):
 *   stuck     static friction holds it while the bird presses (it does not move)
 *   gives way the push overcomes it: the hand accelerates steadily (and the bird,
 *             its wing on the hand, lunges with it) until it has turned `push`°,
 *             more than the wing can follow — the release, at full speed
 *   coasts    free, slowed by drag and friction together (ω' = −b·ω − μ), so it
 *             loses speed quickly at first, then more gently, and comes to rest
 * Angle and angular velocity are continuous throughout; it comes to rest exactly
 * on the real minute. A bigger turn gets a harder push (a faster release) and a
 * longer coast (1.6–2.8 s), never a fling.
 */
const FRICTION_MIX = 3; // ωr / (μ/b): how much of the slowing is friction rather than drag
function solveHand(D: number, window: number) {
  const coast = (D2: number) => Math.max(1.6, Math.min(2.8, 1.7 + 0.003 * D2));
  const k = 1 - Math.log(1 + FRICTION_MIX) / FRICTION_MIX; // coast distance = k · ωr / b
  let push = 22;
  let D2 = D - push;
  let T = coast(D2);
  let wr = (D2 * Math.log(1 + FRICTION_MIX)) / (k * T);
  let gap = (2 * push) / wr; // how long the hand takes to give way (constant acceleration)
  if (gap > window) {
    // a small turn: an easy push, the hand gives at once and moves less with the wing
    push = Math.max(6, (wr * window) / 2);
    D2 = D - push;
    T = coast(D2);
    wr = (D2 * Math.log(1 + FRICTION_MIX)) / (k * T);
    gap = Math.min(window, (2 * push) / wr);
  }
  const b = Math.log(1 + FRICTION_MIX) / T;
  const r = wr / FRICTION_MIX; // μ / b
  return { push, D2, T, wr, gap, b, r };
}


/** A point on a cubic Bézier and its tangent. */
const bez = (p: Pt[], u: number): Pt => {
  const v = 1 - u;
  const a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
  return { x: a * p[0].x + b * p[1].x + c * p[2].x + d * p[3].x, y: a * p[0].y + b * p[1].y + c * p[2].y + d * p[3].y };
};

const NS = "http://www.w3.org/2000/svg";

/**
 * Eyes, for gaze (flying and pushing poses). Path indices in the supplied SVGs.
 * The far eye's pupil is its own path; the near eye's pupil is one shape with its
 * eyebrow, so it is split without editing it: a copy cut to an ellipse round the
 * pupil moves, and the original keeps everything else (the brow) with that
 * ellipse masked out. Each moving pupil (with its highlights) is clipped to its
 * own eye white, so it can never leave the eye.
 */
interface EyeDef {
  white: number;
  pupil: number;
  highlights: number[];
  /** The pupil's ellipse within a brow+pupil shape (SVG units), measured from the shape. */
  fused?: { cx: number; cy: number; rx: number; ry: number };
}
interface FaceDef {
  eyes: EyeDef[];
  /** The near eye's centre (SVG units): where the gaze is measured from. */
  eye: Pt;
  /** Head and face paths [first, last] (contiguous), plus any later head paths; turned for a head tilt about `neck`. */
  head?: { from: number; to: number; extra: number[]; neck: Pt };
}
const FACE: Partial<Record<PoseName, FaceDef>> = {
  flying: {
    eyes: [
      { white: 2, pupil: 3, highlights: [4, 5] },
      { white: 13, pupil: 14, highlights: [15], fused: { cx: 525.5, cy: 171, rx: 24, ry: 25 } },
    ],
    eye: { x: 503, y: 176 },
    head: { from: 1, to: 15, extra: [31], neck: { x: 480, y: 300 } },
  },
  pushing: {
    eyes: [
      { white: 8, pupil: 9, highlights: [10] },
      { white: 12, pupil: 13, highlights: [14], fused: { cx: 602.5, cy: 207.5, rx: 26, ry: 26 } },
    ],
    eye: { x: 574, y: 205 },
  },
};
/**
 * How far a pupil may travel from rest (SVG units). The whites leave 27–40 units below each pupil;
 * sideways a little less (the far eye is narrow, drawn turned), so the horizontal reach is damped.
 */
const GAZE_MAX = 15;
const GAZE_X = 0.8;

/** The supplied SVG, unchanged in drawing: sized by its box; optionally the feet split from the body, and the eyes rigged. */
function poseSvg(raw: string, name: string, feet?: number[], face?: FaceDef) {
  const doc = new DOMParser().parseFromString(raw, "image/svg+xml");
  const svg = doc.documentElement;
  ["style", "width", "height", "preserveAspectRatio", "overflow"].forEach((a) => svg.removeAttribute(a));
  svg.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
  const g = svg.querySelector("g")!;
  const paths = [...g.querySelectorAll(":scope > path")];
  const el = (tag: string, attrs: Record<string, string>) => {
    const e = doc.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  };
  if (face) {
    const defs = el("defs", {});
    svg.insertBefore(defs, svg.firstChild);
    face.eyes.forEach((E, n) => {
      const id = `tk-${name}-e${n}`;
      const clip = el("clipPath", { id: `${id}-white` });
      clip.appendChild(el("path", { d: paths[E.white].getAttribute("d")! }));
      defs.appendChild(clip);
      const eyeG = el("g", { "clip-path": `url(#${id}-white)` });
      const move = el("g", { class: "tk-pupil" });
      eyeG.appendChild(move);
      const pupil = paths[E.pupil];
      if (E.fused) {
        const f = E.fused;
        const sel = el("clipPath", { id: `${id}-sel` });
        sel.appendChild(el("ellipse", { cx: String(f.cx), cy: String(f.cy), rx: String(f.rx), ry: String(f.ry) }));
        const mask = el("mask", { id: `${id}-brow`, maskUnits: "userSpaceOnUse", x: "-100", y: "-100", width: "1200", height: "1200" });
        mask.appendChild(el("rect", { x: "-100", y: "-100", width: "1200", height: "1200", fill: "#fff" }));
        mask.appendChild(el("ellipse", { cx: String(f.cx), cy: String(f.cy), rx: String(f.rx), ry: String(f.ry), fill: "#000" }));
        defs.append(sel, mask);
        const copy = pupil.cloneNode(true) as Element;
        copy.setAttribute("clip-path", `url(#${id}-sel)`);
        move.appendChild(copy);
        pupil.setAttribute("mask", `url(#${id}-brow)`); // the brow stays; the pupil moves
        pupil.after(eyeG);
      } else {
        pupil.before(eyeG);
        move.appendChild(pupil);
      }
      E.highlights.forEach((h) => move.appendChild(paths[h]));
    });
    if (face.head) {
      // the head and face as one group (in drawing order), plus later head pieces in their own group
      const H = face.head;
      const start = paths[H.from];
      const stop = paths[H.to + 1] ?? null;
      const head = el("g", { class: "tk-head" });
      start.before(head);
      let n: ChildNode | null = head.nextSibling;
      while (n && n !== stop) {
        const next: ChildNode | null = n.nextSibling;
        head.appendChild(n);
        n = next;
      }
      H.extra.forEach((i) => {
        const x = el("g", { class: "tk-head" });
        paths[i].before(x);
        x.appendChild(paths[i]);
      });
    }
  }
  if (feet) {
    const body = el("g", { class: "tk-body" });
    const ft = el("g", { class: "tk-feet" });
    const feetEls = new Set(feet.map((i) => paths[i]));
    [...g.childNodes].forEach((c) => (feetEls.has(c as Element) ? ft : body).appendChild(c));
    g.append(body, ft);
  }
  return new XMLSerializer().serializeToString(svg);
}

const mod = (a: number, m: number) => ((a % m) + m) % m;

/** Prepared once, when the module loads, so nothing is parsed on the tap into the screen. */
const SVGS =
  typeof DOMParser !== "undefined"
    ? { flying: poseSvg(flyingRaw, "fly", undefined, FACE.flying), pushing: poseSvg(pushingRaw, "push", PUSH_FEET, FACE.pushing), proud: poseSvg(proudRaw, "proud") }
    : { flying: "", pushing: "", proud: "" };

export function StudyTimekeeper({ slide }: ScreenProps<"study">) {
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const fromCover = useEntry().kind === "sky";
  const nav = useNav();
  const days = slide.comparisonDays;
  const root = useRef<HTMLDivElement>(null);
  const [isPresent, safeToRemove] = usePresence();
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const sec = useMotionValue(0);
  const min = useMotionValue(0);
  const hour = useMotionValue(0);
  const svgs = SVGS;
  const sky = useSkyProgress();

  // ── the live clock (after the entrance, and in the still frame) ──
  const ticks = useRef(0);
  const startTicks = () => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const base = midnight.getTime();
    const tick = () => {
      const s = Math.floor((Date.now() + 15 - base) / 1000);
      const target = s * 6;
      if (still || Math.abs(target - sec.get()) > 12) sec.set(target);
      else animateTo(sec, target);
      min.set(s * 0.1);
      hour.set(s / 120);
      ticks.current = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    tick();
  };
  // a second-hand tick: the existing clock's 160 ms step
  const tickEase = useMemo(() => cubicBezier(0.25, 0.9, 0.3, 1), []);
  function animateTo(mv: typeof sec, to: number) {
    const from = mv.get();
    const p = { t: 0 };
    gsap.to(p, { t: 1, duration: 0.16, ease: "none", onUpdate: () => mv.set(from + (to - from) * tickEase(p.t)) });
  }

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = <T extends Element = HTMLElement>(s: string) => el.querySelector(s) as T;
    const rig = q(".tk-rig");
    const fly = q(".tk-fly");
    const push = q(".tk-push");
    const proud = q(".tk-proud");
    const body = q<SVGGElement>(".tk-push .tk-body");
    const bob = q(".tk-bob");
    const clockBox = q(".sc-clock");
    const at = (p: { x: number; y: number }) => ({ xPercent: (p.x / RIG) * 100, yPercent: (p.y / RIG) * 100 });

    const T = TIMEKEEPER;
    const Tp = T.release - T.contact;
    // the real time the clock lands on (solved twice: the landing time depends on the free run's length)
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const base = midnight.getTime();
    const plan = (endAt: number) => {
      const landS = Math.floor((Date.now() + endAt * 1000 - base) / 1000);
      const target = { s: landS * 6, m: landS * 0.1, h: landS / 120 };
      let D = mod(target.m - MINUTE_START, 360);
      if (D < 40) D += 360; // always a real turn of the hand
      return { target, D, hand: solveHand(D, Tp - 0.05) };
    };
    let P = plan(T.release + 1.8);
    P = plan(T.release + P.hand.T);
    const { target, D, hand } = P;
    const handsEnd = T.release + hand.T;

    const counter = q(".tk-count");
    const final = () => {
      gsap.set(rig, { ...at(PLACE.proud), scale: 1, rotation: 0, opacity: 1, transformOrigin: ORIGIN });
      gsap.set(bob, { yPercent: 0, rotation: 0 });
      gsap.set([fly, push], { opacity: 0 });
      gsap.set(proud, { opacity: 1, scaleY: 1 });
      gsap.set(clockBox, { yPercent: 0 });
      gsap.set(el.querySelectorAll(".sc-lead, .sc-num, .sc-unit, .sc-cmp"), { opacity: 1, y: 0 });
      counter.textContent = bn(slide.hours);
      sky?.set(1);
      el.classList.remove("is-pre");
    };
    if (still) {
      final();
      startTicks();
      return () => clearTimeout(ticks.current);
    }

    // ── start state ──
    el.classList.remove("is-pre");
    const m0 = target.m - D;
    const s0 = target.s - (mod(target.s - SECOND_START, 360) + 720);
    const h0 = target.h - mod(target.h - HOUR_START, 360);
    min.set(m0);
    sec.set(s0);
    hour.set(h0);
    counter.textContent = bn(0);
    gsap.set(clockBox, { yPercent: 80 });
    gsap.set(el.querySelectorAll(".sc-lead, .sc-num, .sc-unit, .sc-cmp"), { opacity: 0 });
    gsap.set(el.querySelector(".sc-lead"), { y: 12 });
    gsap.set(el.querySelector(".sc-num"), { y: 16 });
    gsap.set(el.querySelector(".sc-unit"), { y: 8 });
    gsap.set(el.querySelector(".sc-cmp"), { y: 10 });
    gsap.set([push, proud], { opacity: 0 });
    gsap.set(fly, { opacity: 1 });
    gsap.set(bob, { yPercent: 0, rotation: 0, transformOrigin: ORIGIN });
    gsap.set(body, { rotation: 0, svgOrigin: PUSH_PIVOT });
    // squashes are about each pose's own feet contact
    gsap.set(proud, { transformOrigin: `${(DEF.proud.feet.x / DEF.proud.w) * 100}% ${(DEF.proud.feet.y / DEF.proud.h) * 100}%` });
    gsap.set(push, { transformOrigin: `${(DEF.pushing.feet.x / DEF.pushing.w) * 100}% ${(DEF.pushing.feet.y / DEF.pushing.h) * 100}%`, scaleY: 1 });

    // where the flight starts: the cover's bird, head on head (or, entered any other way, high above the clock)
    const stage = q(".tk-stage").getBoundingClientRect();
    const k = stage.width / 1000; // px per clock unit
    const coverSlot = fromCover ? el.closest(".story")?.querySelector<HTMLElement>(".bj-slot") ?? null : null;
    let startHead: Pt = { x: 420, y: -820 };
    let startScale = 1;
    const flyHeadW = 369.2 * LAYOUT.flying.k * R * k; // px
    if (coverSlot) {
      const heads = [...coverSlot.querySelectorAll("path")]
        .filter((p) => /feb802/i.test(p.getAttribute("fill") ?? ""))
        .map((p) => p.getBoundingClientRect())
        .sort((a, b) => b.width * b.height - a.width * a.height);
      const r = heads[0] ?? coverSlot.getBoundingClientRect();
      startHead = { x: (r.left + r.width / 2 - stage.left) / k, y: (r.top + r.height / 2 - stage.top) / k };
      // the cover's bird is a fixed size; ours follows the clock: start at the cover's size
      startScale = r.width / flyHeadW;
    }
    const start = rigAt("flying", DEF.flying.head, startHead);
    gsap.set(rig, { ...at(start), scale: startScale, transformOrigin: ORIGIN, rotation: 0, opacity: coverSlot ? 0 : 1 });

    const tl = gsap.timeline({ onComplete: () => startTicks() });
    tlRef.current = tl;
    const settle = gsapEase("settle");
    const arrive = gsapEase("arrive");

    /**
     * The rig along a cubic Bézier (clock units): position from an easing of the
     * path parameter; pitch from the direction of travel (nose down falling, up
     * climbing, scaled by speed so it levels as it slows) plus an optional braking
     * flare (nose up while decelerating into a landing).
     */
    const path = (pts: Pt[], t0: number, dur: number, ease: (x: number) => number, maxPitch: number, flare = 0) => {
      const len = Math.hypot(pts[3].x - pts[0].x, pts[3].y - pts[0].y);
      const ref = (1.6 * len) / dur;
      const pr = { t: 0 };
      tl.to(
        pr,
        {
          t: 1,
          duration: dur,
          ease: "none",
          onUpdate: () => {
            const u = ease(pr.t);
            const p = bez(pts, u);
            const dt = 0.01;
            const a = bez(pts, ease(Math.max(0, pr.t - dt)));
            const b = bez(pts, ease(Math.min(1, pr.t + dt)));
            const vx = (b.x - a.x) / (2 * dt * dur);
            const vy = (b.y - a.y) / (2 * dt * dur);
            const v = Math.hypot(vx, vy);
            const dir = v > 1e-3 ? maxPitch * (vy / v) * Math.min(1, v / ref) : 0;
            const brake = flare ? -flare * Math.sin(Math.PI * Math.max(0, Math.min(1, (pr.t - 0.5) / 0.5))) : 0;
            gsap.set(rig, { ...at(p), rotation: dir + brake });
          },
        },
        t0,
      );
    };
    /** Gentle start, long deceleration (approach and return). */
    const brakeEase = cubicBezier(0.32, 0.12, 0.18, 1);

    // ── the clock's motion: one angle function for the minute hand; the others are geared to it ──
    const F: Pt = { x: 390, y: 486 }; // the pushing pose's feet (the lean pivot), clock units
    const W0: Pt = { x: 558.5, y: 353.1 }; // its wing tip at rest
    const giveAt = T.release - hand.gap;
    const minuteAt = (t: number) => {
      if (t <= giveAt) return m0; // stuck
      if (t <= T.release) {
        const u = t - giveAt; // giving way: constant acceleration up to the release speed
        return m0 + 0.5 * (hand.wr / hand.gap) * u * u;
      }
      const c = Math.min(hand.T, t - T.release); // coasting under drag and friction, to rest
      return m0 + hand.push + ((hand.wr + hand.r) * (1 - Math.exp(-hand.b * c)) - hand.r * hand.b * c) / hand.b;
    };
    /** The lean that puts the wing tip on the minute hand's leading edge, for the hand at θ (deg). */
    const leanFor = (theta: number) => {
      const th = (theta * Math.PI) / 180;
      const nx = -Math.cos(th), ny = -Math.sin(th); // the hand's left normal
      const f = (phi: number) => {
        const c = Math.cos(phi), s2 = Math.sin(phi);
        const wx = F.x + c * (W0.x - F.x) - s2 * (W0.y - F.y);
        const wy = F.y + s2 * (W0.x - F.x) + c * (W0.y - F.y);
        return (wx - 500) * nx + (wy - 500) * ny - 10; // 10 = the hand's half-width
      };
      let lo = -0.2, hi = 0.8;
      for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        if (f(mid) > 0) lo = mid;
        else hi = mid;
      }
      return ((lo + hi) / 2) * (180 / Math.PI);
    };
    const leanAtContact = leanFor(m0 % 360);
    const liftDone = T.lift.at + 0.12; // the bird is off the hour hand
    const mLift = minuteAt(liftDone);
    const mEnd = target.m;
    const sD = target.s - s0;
    const hD = target.h - h0;
    const clockProxy = { t: 0 };
    let leanNow = 0;
    tl.to(
      clockProxy,
      {
        t: handsEnd,
        duration: handsEnd,
        ease: "none",
        onUpdate: () => {
          const t = clockProxy.t;
          const m = minuteAt(t);
          min.set(m);
          const prog = (m - m0) / D; // the mechanism's progress, 0 → 1
          sec.set(s0 + sD * prog);
          // the hour hand stays put while the bird stands on it; then it follows the minute hand in
          hour.set(t <= liftDone ? h0 : h0 + hD * Math.pow((m - mLift) / (mEnd - mLift), 1.25));
          // the hours count with the clock; a background effect follows the same progress
          counter.textContent = bn(Math.round(slide.hours * Math.min(1, Math.max(0, prog))));
          sky?.set(prog);
          // in contact, the bird's lean is the hand's: the wing tip stays on the hand's edge
          if (t > T.contact && t <= T.release) {
            leanNow = leanFor(m % 360) - leanAtContact;
            gsap.set(body, { rotation: leanNow, svgOrigin: PUSH_PIVOT });
          }
        },
      },
      0,
    );

    // ── A — approach and braking: the clock rises; one curved flight from the cover's bird down to the ledge ──
    tl.to(clockBox, { yPercent: 0, duration: T.clock.dur, ease: settle }, T.clock.at);
    if (coverSlot) {
      // the cover's bird becomes this one at take-off: a cut on the head, same size, same place
      tl.set(rig, { opacity: 1 }, 0);
      tl.set(coverSlot, { opacity: 0 }, 0);
    }
    const A = T.approach;
    const P0 = start;
    const P3 = PLACE.push;
    // out and down, then in from the upper left: it brakes (nose up) into the last stretch and touches down at rest
    path([P0, { x: P0.x - 90, y: P0.y + 170 }, { x: P3.x - 110, y: P3.y - 120 }, P3], A.at, A.dur, brakeEase, 14, 10);
    tl.to(rig, { scale: 1, duration: A.dur * 0.7, ease: "sine.inOut" }, A.at);
    tl.to(el.querySelector(".sc-lead"), { opacity: 1, y: 0, duration: T.lead.dur, ease: settle }, T.lead.at);

    // ── B — touchdown (flying → pushing in the last of the braking), weight onto the feet ──
    tl.set(fly, { opacity: 0 }, A.cut);
    tl.set(push, { opacity: 1 }, A.cut);
    tl.to(push, { scaleY: 0.95, duration: T.touch.dur * 0.4, ease: "sine.out" }, T.touch.at);
    tl.to(push, { scaleY: 1, duration: T.touch.dur * 0.6, ease: settle }, T.touch.at + T.touch.dur * 0.4);
    // anticipation: a small gather back, then forward until the wing meets the hand
    tl.to(body, { rotation: T.gather.deg, svgOrigin: PUSH_PIVOT, duration: T.gather.dur, ease: "sine.out" }, T.gather.at);
    tl.to(body, { rotation: 0, svgOrigin: PUSH_PIVOT, duration: T.contact - (T.gather.at + T.gather.dur), ease: "sine.inOut" }, T.gather.at + T.gather.dur);
    tl.to(el.querySelector(".sc-num"), { opacity: 1, y: 0, duration: T.number.dur, ease: settle }, T.number.at);

    // ── C — the push is driven by the hand (above). Effort while the hand resists: the bird presses down into
    // its legs (about its feet), and straightens as the hand gives and runs; then it follows through ──
    tl.to(push, { scaleY: 0.965, duration: T.release - T.contact - 0.15, ease: "sine.inOut" }, T.contact);
    tl.to(push, { scaleY: 1, duration: 0.3, ease: settle }, T.release - 0.15);
    // follow-through: a damped spring from the lean, and part of the lunge's speed, at the release back to upright
    // (no jump in angle or speed: the body carries on a little, sways back, settles)
    const leanAtRelease = leanFor(minuteAt(T.release) % 360) - leanAtContact;
    const leanRate = ((leanFor(minuteAt(T.release) % 360) - leanFor(minuteAt(T.release - 0.01) % 360)) / 0.01) * T.follow.carry;
    const wn = T.follow.wn;
    const z = T.follow.zeta;
    const wd = wn * Math.sqrt(1 - z * z);
    const Bc = (leanRate + z * wn * leanAtRelease) / wd;
    const FT = { t: 0 };
    tl.to(
      FT,
      {
        t: T.follow.dur,
        duration: T.follow.dur,
        ease: "none",
        onUpdate: () => {
          const t = FT.t;
          const phi = Math.exp(-z * wn * t) * (leanAtRelease * Math.cos(wd * t) + Bc * Math.sin(wd * t));
          gsap.set(body, { rotation: t >= T.follow.dur ? 0 : phi, svgOrigin: PUSH_PIVOT });
        },
      },
      T.release,
    );

    // ── D — it lifts off the hand into a hover beside the clock, and watches it run down ──
    const Lf = T.lift;
    const HOVER = rigAt("flying", DEF.flying.head, { x: 270, y: -120 });
    tl.set(push, { opacity: 0 }, Lf.at + 0.06);
    tl.set(fly, { opacity: 1 }, Lf.at + 0.06);
    const liftEase = cubicBezier(0.4, 0, 0.2, 1);
    path([PLACE.push, { x: PLACE.push.x - 10, y: PLACE.push.y - 170 }, { x: HOVER.x + 40, y: HOVER.y + 90 }, HOVER], Lf.at, Lf.dur, (x) => liftEase(x), 9, 6);
    // hovering: a slow rise and fall, alive but quiet (not counted in the settle: it ends before the return)
    const hoverFrom = Lf.at + Lf.dur;
    const retAt = Math.max(hoverFrom + 0.3, handsEnd + T.returnDelay);
    const hoverDur = retAt - hoverFrom;
    const bobs = Math.max(1, Math.round(hoverDur / T.bob.period));
    const B = { t: 0 };
    tl.to(
      B,
      {
        t: 1,
        duration: hoverDur,
        ease: "none",
        onUpdate: () => {
          const ph = Math.sin(B.t * bobs * Math.PI * 2);
          const env = Math.sin(Math.PI * B.t); // eases in and out of the hover
          gsap.set(bob, { yPercent: ((T.bob.amp * ph * env) / RIG) * 100, rotation: 1.5 * Math.cos(B.t * bobs * Math.PI * 2) * env });
        },
      },
      hoverFrom,
    );

    // ── E — the clock has settled: the return flight onto the rim, the landing, proud ──
    const proudCut = retAt + T.flight * T.perchAt;
    path([HOVER, { x: HOVER.x + 60, y: HOVER.y - 110 }, { x: PLACE.proud.x - 70, y: PLACE.proud.y - 120 }, PLACE.proud], retAt, T.flight, brakeEase, 9, 6);
    tl.set(fly, { opacity: 0 }, proudCut);
    tl.set(proud, { opacity: 1 }, proudCut);
    const landAt = retAt + T.flight;
    tl.to(proud, { scaleY: 0.97, duration: T.settle * 0.35, ease: "sine.out" }, landAt - 0.02);
    tl.to(proud, { scaleY: 1, duration: T.settle * 0.65, ease: settle }, landAt - 0.02 + T.settle * 0.35);
    // ── gaze: from the release the bird watches the hand it set going (pupils, and in flight a slight head
    // tilt); as the clock comes to rest it looks over to its perch at 12 o'clock, and flies there ──
    const pupils = [...fly.querySelectorAll<SVGGElement>(".tk-pupil"), ...push.querySelectorAll<SVGGElement>(".tk-pupil")];
    const heads = [...fly.querySelectorAll<SVGGElement>(".tk-head")];
    const neck = FACE.flying!.head!.neck;
    const gaze = { x: 0, y: 0, tilt: 0 };
    const num = (x: unknown) => Number(x) || 0;
    const eyeAt = (pose: "flying" | "pushing"): Pt => {
      const L = LAYOUT[pose];
      const e = FACE[pose]!.eye;
      return {
        x: (num(gsap.getProperty(rig, "xPercent")) / 100) * RIG + (L.x + e.x * L.k) * R,
        y: ((num(gsap.getProperty(rig, "yPercent")) + num(gsap.getProperty(bob, "yPercent"))) / 100) * RIG + (L.y + e.y * L.k) * R,
      };
    };
    const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
    const G = { t: T.release };
    let lastT = T.release;
    tl.to(
      G,
      {
        t: proudCut,
        duration: proudCut - T.release,
        ease: "none",
        onUpdate: () => {
          const t = G.t;
          const dt = Math.max(0, t - lastT);
          lastT = t;
          const pose = t < Lf.at + 0.06 ? "pushing" : "flying";
          const eye = eyeAt(pose);
          // what it looks at: the minute hand's tip while the clock runs, then its perch on the rim
          const th = (minuteAt(Math.min(t, handsEnd)) * Math.PI) / 180;
          const w = smooth((t - (handsEnd - 0.3)) / 0.35);
          const tx = (500 + 380 * Math.sin(th)) * (1 - w) + 500 * w;
          const ty = (500 - 380 * Math.cos(th)) * (1 - w) + 0 * w;
          let dx = tx - eye.x;
          let dy = ty - eye.y;
          const d = Math.hypot(dx, dy) || 1;
          dx /= d;
          dy /= d;
          // into the bird's own frame (its pitch and hover tilt, and when pushing its lean): the eyes turn, not the bird
          const turn = (-(num(gsap.getProperty(rig, "rotation")) + num(gsap.getProperty(bob, "rotation")) + (pose === "pushing" ? num(gsap.getProperty(body, "rotation")) : 0)) * Math.PI) / 180;
          const lx = dx * Math.cos(turn) - dy * Math.sin(turn);
          const ly = dx * Math.sin(turn) + dy * Math.cos(turn);
          const k = 1 - Math.exp(-dt / 0.12);
          gaze.x += (lx * GAZE_MAX * GAZE_X - gaze.x) * k;
          gaze.y += (ly * GAZE_MAX - gaze.y) * k;
          // a slight nod toward what it watches (flying pose: its head is a separate group)
          gaze.tilt += ((pose === "flying" ? Math.max(-1, Math.min(5, ly * 6)) : 0) - gaze.tilt) * k;
          const tr = `translate(${gaze.x.toFixed(2)} ${gaze.y.toFixed(2)})`;
          pupils.forEach((p) => p.setAttribute("transform", tr));
          heads.forEach((h) => h.setAttribute("transform", `rotate(${gaze.tilt.toFixed(2)} ${neck.x} ${neck.y})`));
        },
      },
      T.release,
    );
    tl.to(el.querySelector(".sc-unit"), { opacity: 1, y: 0, duration: 0.4, ease: arrive }, handsEnd - 0.15);
    if (days) tl.to(el.querySelector(".sc-cmp"), { opacity: 1, y: 0, duration: DURATION.base, ease: settle }, handsEnd);
    tl.set({}, {}, landAt + T.settle);

    const unregister = devRegister("02 Timekeeper · master (GSAP)", fromGsap(tl));
    return () => {
      unregister();
      tl.kill();
      clearTimeout(ticks.current);
      if (coverSlot?.isConnected) gsap.set(coverSlot, { clearProps: "opacity" });
    };
    // the entry is fixed for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still]);

  // ── leaving: to 03 the text clears and the bird drops with the clock (03 drops the clock) ──
  const wasLeaving = useRef(false);
  useEffect(() => {
    const el = root.current;
    if (isPresent) {
      if (wasLeaving.current) {
        wasLeaving.current = false;
        tlRef.current?.progress(1);
      }
      return;
    }
    wasLeaving.current = true;
    tlRef.current?.progress(1);
    if (nav.kind !== "flow" || !el) {
      safeToRemove?.();
      return;
    }
    const text = el.querySelectorAll(".sc-lead, .sc-stat, .sc-cmp");
    const a = gsap.to(text, { opacity: 0, duration: FLOW.textOut, ease: gsapEase("exit") });
    // the bird stays on the clock as it drops (03's hero timeline drops .sc-clock by 64 % of its height)
    const stage = el.querySelector<HTMLElement>(".tk-stage");
    const b = stage ? gsap.to(stage, { y: stage.clientWidth * 0.64, duration: FLOW.clock.dur, delay: FLOW.clock.at, ease: gsap.parseEase("wrap-drop") ? "wrap-drop" : gsapEase("drop") }) : null;
    const t = window.setTimeout(() => safeToRemove?.(), FLOW.out * 1000);
    return () => {
      a.kill();
      b?.kill();
      clearTimeout(t);
    };
    // nav is read at the moment the screen starts leaving
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  return (
    <div ref={root} className={`slide sc tk ${days ? "" : "sc-plain"} ${still ? "" : "is-pre"}`}>
      <div className="sc-copy">
        <h1 className="sc-hero" aria-label={`${COPY.study.lead} ${bn(slide.hours)} ${COPY.study.unit}`}>
          <span className="sc-lead" aria-hidden="true">
            {COPY.study.lead}
          </span>
          <span className="sc-stat" aria-hidden="true">
            <span className="sc-num" style={statSize(slide.hours)}>
              {/* counts with the clock's own motion (set by the timeline), width reserved with the final value */}
              <span className="countup">
                <span className="countup-ghost" aria-hidden="true">
                  {bn(slide.hours)}
                </span>
                <span className="countup-live tk-count">{bn(still ? slide.hours : 0)}</span>
              </span>
            </span>
            <span className="sc-unit">{COPY.study.unit}</span>
          </span>
        </h1>
        {days && <p className="sc-cmp">{COPY.study.comparison(days)}</p>}
      </div>
      <div className="sc-clock">
        <ClockDial sec={sec} min={min} hour={hour} />
      </div>
      {/* the bird, over the clock's resting place (not inside it: the clock rises; the bird flies its own path) */}
      <div className="tk-stage" aria-hidden="true">
        <div className="tk-rig">
          <div className="tk-bob">
          {(["flying", "pushing", "proud"] as const).map((k) => {
            const p = LAYOUT[k];
            return (
              <div
                key={k}
                className={`tk-pose tk-${k === "flying" ? "fly" : k === "pushing" ? "push" : "proud"}`}
                style={{ left: `${p.x / 10}%`, top: `${p.y / 10}%`, width: `${p.w / 10}%`, height: `${p.h / 10}%` }}
                dangerouslySetInnerHTML={{ __html: svgs[k] }}
              />
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}
