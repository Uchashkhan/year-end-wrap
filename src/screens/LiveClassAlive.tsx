import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { usePresence } from "motion/react";
import gsap from "gsap";
import { COPY } from "../data/copy";
import { bn } from "../lib/bangla";
import { usePrefs } from "../lib/prefs";
import { FOCUS, useNav } from "../story/entry";
import { BadgePill } from "../components/primitives";
import { createLanding, textIn } from "../motion/primitives";
import { RELATION, TEXT, kf, eio, eo } from "../motion/reference";
import { gsapEase } from "../motion/ease";
import { useMotionProfile } from "../motion/profile";
import { devRegister, fromGsap } from "../motion/timeline";
import { Silhouette } from "./TeacherSpotlight";
import type { ScreenProps } from "./types";
import "../styles/live-class-alive.css";

/**
 * 03 Live classes — "The Classroom Comes Alive" (screen facet live.design = alive).
 *
 * A stylised classroom seen from the back, looking to the front: the teaching
 * screen at the top (as the room's far wall), six rows of chairs in perspective
 * (small and high by the screen, large and low in the foreground). Reference
 * logic, adapted:
 *   - A3 Poster (kit tile 15): the light runs round the room with an eased
 *     timing per seat, and each lit seat blooms with a ring;
 *   - C3 Journey (mountLive): the seats light as a sweep passes them, the count
 *     runs on the same progress, the number lands with the reference's landing.
 * Here the sweep runs from the screen to the front, row by row (a live class's
 * light travels with the perspective), each row from its middle outwards.
 *
 * Attendance: the room has a representative set of seats (SEATS), not one per
 * class. The lit proportion is the attendance ratio (attended ÷ held), and the
 * count is the attended number scaled by the same progress as the seats, so both
 * accelerate and settle together and the final number is exact. Zero attendance:
 * no seat lights; full attendance: every seat does.
 *
 * One GSAP timeline (deterministic, seekable, Motion Inspector) with one paint()
 * for the room and the count. Seconds from the screen's start:
 *   0.00  heading rises (reference text entrance); the room is visible, inactive
 *   0.70  the teaching screen switches on; the LIVE indicator lights (1.10)
 *   1.50  the light starts at the screen and travels down the rows (0.2 s each)
 *         … seats light as it passes; the count follows them
 *   last lit + 0.05  the number lands (reference landing, no gold flash)
 *   landing + 0.10  the rest of the sentence rises; + 0.40 the held total
 *   landing + 0.50  the Front Bencher artwork lands, with the screen impact
 * Reduced motion / repeat view: the settled frame.
 */

// ── the room (hall units; the stage is 390 wide) ──
export const HALL = { w: 390, h: 480 };
export const ROWS = [
  { n: 11, y: 178, s: 0.24 },
  { n: 10, y: 212, s: 0.29 },
  { n: 9, y: 252, s: 0.35 },
  { n: 8, y: 298, s: 0.42 },
  { n: 7, y: 352, s: 0.5 },
  { n: 6, y: 412, s: 0.6 },
] as const;
export const CHAIR = { w: 100, h: 132 } as const;
/** Timing (s). */
export const T = { classOn: 0.7, pulse: 1.5, rowGap: 0.2, seatDur: 0.36, rowSpan: 0.3, inactive: 0.45 } as const;

/** The representative seats: one per position in the room, lit in the order the light reaches them. */
export const SEATS = ROWS.flatMap((r, ri) =>
  Array.from({ length: r.n }, (_, j) => {
    const x = (j + 0.5) * (HALL.w / r.n) - (CHAIR.w * r.s) / 2;
    const centre = Math.abs(j - (r.n - 1) / 2) / r.n; // from the middle outwards
    return { ri, j, x, y: r.y, s: r.s, t0: T.pulse + ri * T.rowGap + centre * 0.22 };
  }),
);
export const SEAT_COUNT = SEATS.length;

/** The lit set for an attendance: the ratio of seats, chosen at a seeded spread (not by position). */
export function litPlan(attended: number, held: number) {
  const ratio = held > 0 ? Math.min(1, Math.max(0, attended / held)) : 0;
  const litCount = Math.round(ratio * SEAT_COUNT);
  const r = rng(9);
  const order = Array.from({ length: SEAT_COUNT }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const k = Math.floor(r() * (i + 1));
    [order[i], order[k]] = [order[k], order[i]];
  }
  const lit = order.slice(0, litCount).map((i) => SEATS[i]);
  const last = lit.length ? Math.max(...lit.map((s) => s.t0)) : T.pulse;
  const landAt = last + T.seatDur + 0.05;
  return { lit, litSet: new Set(lit.map((s) => SEATS.indexOf(s))), landAt, span: last + T.seatDur };
}

function rng(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** A chair, front view (the existing chair geometry, one shape for muted and lit). */
function Chair({ id }: { id: string }) {
  return (
    <g id={id}>
      <rect x="16" y="0" width="68" height="68" rx="16" />
      <rect x="8" y="73" width="84" height="21" rx="10.5" />
      <rect x="17" y="91" width="9" height="41" rx="3" />
      <rect x="74" y="91" width="9" height="41" rx="3" />
    </g>
  );
}

/** The hero numeral steps down with its length, so the statement keeps its room. */
function numberSize(n: number): string {
  return bn(n).length <= 2 ? "min(28cqw, 13.5cqh)" : "min(22cqw, 11cqh)";
}

export function LiveClassAlive({ slide }: ScreenProps<"live">) {
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const { profile, sparks } = useMotionProfile();
  const nav = useNav();
  const root = useRef<HTMLDivElement>(null);
  const [isPresent, safeToRemove] = usePresence();
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const landRef = useRef<{ dispose: () => void } | null>(null);
  const wasLeaving = useRef(false);
  // bumped when a screen that was leaving is called back: the entrance runs again from the start
  const [entryN, setEntryN] = useState(0);
  const uid = useMemo(() => `la${Math.random().toString(36).slice(2, 8)}`, []);
  const plan = useMemo(() => litPlan(slide.attended, slide.held), [slide.attended, slide.held]);
  const L = COPY.liveClass;
  const finalNumber = bn(slide.attended);

  // the room's final picture, the count's final value
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = <E extends Element = HTMLElement>(s: string) => el.querySelector(s) as E;
    const seatEls = [...el.querySelectorAll<SVGGElement>("[data-seat]")];
    const litEls = [...el.querySelectorAll<SVGGElement>("[data-lit]")];
    const rings = [...el.querySelectorAll<SVGCircleElement>("[data-ring]")];
    const screenOn = q(".la-screen-off");
    const live = q(".la-live");
    const band = q(".la-band");
    const num = q(".la-t");
    const hero = q(".la-num");
    const tv = q(".la-tv");

    // the number keeps its final width while it counts (no jitter)
    num.textContent = finalNumber;
    num.style.minWidth = `${num.offsetWidth}px`;

    const seatTime = plan.lit.map((s) => s.t0);
    const litTotal = plan.lit.length;
    const litIndex = new Map(plan.lit.map((s, k) => [SEATS.indexOf(s), k]));
    const landAt = plan.landAt;
    const landing = hero ? createLanding(hero, { origin: "50% 75%", sparks: sparks && profile === "reference", canvasHost: el, seed: 61, fit: el }) : null;
    landRef.current = landing;
    let lastText = "";
    const value = (t: number) => {
      if (litTotal === 0) return t >= landAt ? slide.attended : 0;
      let done = 0;
      for (const x of seatTime) if (x <= t) done++;
      return done >= litTotal ? slide.attended : Math.round((slide.attended * done) / litTotal);
    };

    // one paint: seats, rings, band, screen, LIVE and the count — all from the clock t
    const paint = (t: number) => {
      SEATS.forEach((seat, i) => {
        const el = seatEls[i];
        const k = litIndex.get(i);
        const lit = k !== undefined;
        // the chair: muted until its moment, then it swells and settles
        const a = lit ? (t - seat.t0) / T.seatDur : -1;
        const sc = a <= 0 ? 1 : kf([[0, 0.3], [0.5, 1.25], [1, 1]], clamp(a));
        const cx = seat.x + (CHAIR.w * seat.s) / 2;
        const cy = seat.y + (CHAIR.h * seat.s) / 2;
        el.setAttribute("transform", `translate(${cx.toFixed(2)} ${cy.toFixed(2)}) scale(${r3(sc)}) translate(${(-cx).toFixed(2)} ${(-cy).toFixed(2)})`);
        if (lit) litEls[i]?.setAttribute("opacity", String(r3(clamp(a * 3))));
        // the ring: one bloom per lit seat, as the light passes
        const ring = rings[i];
        if (ring && lit) {
          const u = (t - seat.t0) / 0.55;
          ring.setAttribute("r", String(r3(lerp(seat.s * 40, seat.s * 92, eo(clamp(u))))));
          ring.setAttribute("opacity", String(r3(u > 0 && u < 1 ? 0.7 * (1 - u) : 0)));
        }
      });
      // the travelling light, from the screen down to the front row
      const span = T.rowGap * (ROWS.length - 1) + T.rowSpan;
      const p = clamp((t - T.pulse) / span);
      const yA = ROWS[0].y - 14;
      const yB = ROWS[ROWS.length - 1].y + 70;
      band.setAttribute("cy", String(r3(lerp(yA, yB, eio(p)))));
      band.setAttribute("opacity", String(r3(clamp((t - T.pulse) / 0.15) * (1 - clamp((t - (T.pulse + span - 0.25)) / 0.25)) * 0.9)));
      // the screen switches on with a short flicker; LIVE lights after it
      const on = t < T.classOn ? 0 : t < T.classOn + 0.45 ? kf([[0, 0], [0.45, 1]], (t - T.classOn) / 0.45) : 1;
      screenOn.setAttribute("opacity", String(r3(1 - on)));
      live.style.opacity = String(r3(clamp((t - (T.classOn + 0.4)) / 0.2)));
      // the count, from the lit seats
      const s = bn(value(t));
      if (s !== lastText) num.textContent = lastText = s;
      landing?.paint(t - landAt);
    };
    if (still) {
      // reduced motion / repeat view: the settled picture at once (the sequence is not played)
      paint(landAt + 1.6);
      landing?.paint(99);
      return () => landing?.dispose();
    }

    // rest: the whole entrance is one timeline; text is GSAP as well (deterministic)
    const clock = { t: 0 };
    const tl = gsap.timeline({ paused: false });
    tlRef.current = tl;
    const head = el.querySelectorAll<HTMLElement>(".la-up");
    head.forEach((h, i) => {
      const k = textIn(i === 0 ? "kicker" : "line");
      tl.fromTo(h, { opacity: 0, y: TEXT.up.y, scale: TEXT.up.scale }, { opacity: 1, y: 0, scale: 1, duration: k.options.duration, ease: gsapEase("refPop") }, i * 0.1);
    });
    tl.fromTo(tv, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: gsapEase("settle") }, 0.1);
    tl.to(clock, { t: landAt + 1.6, duration: landAt + 1.6, ease: "none", onUpdate: () => paint(clock.t) }, 0);
    const caption = el.querySelector<HTMLElement>(".la-held");
    const sentence = el.querySelector<HTMLElement>(".la-tail");
    if (sentence) tl.fromTo(sentence, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, ease: gsapEase("settle") }, landAt + RELATION.captionAfterLand - 0.3);
    if (caption) tl.fromTo(caption, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: gsapEase("refSoft") }, landAt + RELATION.captionAfterLand);
    // the landing itself: a proxy clock, painted with the rest
    paint(0);
    // dev: the Motion Inspector reads the timeline
    const unregister = devRegister("03 Live · classroom (GSAP)", fromGsap(tl));
    return () => {
      unregister();
      tl.kill();
      landing?.dispose();
      landRef.current = null;
      tlRef.current = null;
    };
    // the entrance is fixed for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, plan, slide.attended, finalNumber, entryN]);

  // leaving: 03 → 04 ("focus") keeps the room for a moment; anything else goes at once. Revived while leaving:
  // the settled frame.
  useLayoutEffect(() => {
    const el = root.current;
    if (isPresent) {
      if (wasLeaving.current) {
        wasLeaving.current = false;
        setEntryN((n) => n + 1);
      }
      return;
    }
    wasLeaving.current = true;
    tlRef.current?.kill();
    if (nav.kind !== "focus" || !el) {
      safeToRemove?.();
      return;
    }
    const c = gsap.to(el.querySelectorAll(".la-top"), { opacity: 0, y: -8, duration: FOCUS.textOut, ease: "power2.out" });
    const t = window.setTimeout(() => safeToRemove?.(), FOCUS.out * 1000);
    return () => {
      c.kill();
      clearTimeout(t);
    };
    // nav is read at the moment the screen starts leaving
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  const seatSvg = SEATS;
  const chairId = `${uid}-chair`;
  const lightArea = { w: HALL.w, h: HALL.h };
  const badgeLand = plan.landAt + RELATION.panelAfterLand;

  return (
    <div ref={root} className={`slide la ${still ? "la-still" : ""}`} style={{ "--la-num": numberSize(slide.attended) } as CSSProperties}>
      <div className="la-top">
        <p className="la-sr">
          {L.headline.join(" ")}। {L.statement(slide.attended)}। {slide.held > 0 ? COPY.live.held(slide.held) : ""}
        </p>
        <h1 className="la-head la-up" aria-hidden="true">
          {L.headline.join(" ")}
        </h1>
        <div className="la-stat" aria-hidden="true">
          <div className="la-num">
            <span className="la-t">{still ? finalNumber : bn(0)}</span>
          </div>
          <p className="la-tail" style={{ opacity: still ? 1 : 0 }}>
            {L.unitTop} {L.unitBottom} {L.tail}
          </p>
          {slide.held > 0 && (
            <p className="la-held" style={{ opacity: still ? 1 : 0 }}>
              {COPY.live.held(slide.held)}
            </p>
          )}
        </div>
      </div>

      <div className="la-room" aria-hidden="true">
        <div className="la-tv">
          <div className="la-tv-frame">
            <div className="la-tv-screen">
              <div className="la-tv-figure">
                <Silhouette />
              </div>
              <span className="la-live" style={{ opacity: still ? 1 : 0 }}>
                <i />
                LIVE
              </span>
            </div>
          </div>
          <div className="la-tv-stand" />
          <svg className="la-tv-off" viewBox="0 0 390 160" preserveAspectRatio="none">
            <rect className="la-screen-off" x="0" y="0" width="390" height="160" fill="#0b1452" opacity={still ? 0 : 1} />
          </svg>
        </div>
        <svg className="la-hall" viewBox={`0 0 ${lightArea.w} ${lightArea.h}`}>
          <defs>
            <Chair id={chairId} />
            <radialGradient id={`${uid}-band`}>
              <stop offset="0" stopColor="#ffd466" stopOpacity="0.55" />
              <stop offset="0.6" stopColor="#ffd466" stopOpacity="0.14" />
              <stop offset="1" stopColor="#ffd466" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse className="la-band" data-band="" cx={lightArea.w / 2} cy={ROWS[0].y} rx={lightArea.w * 0.62} ry="46" fill={`url(#${uid}-band)`} opacity="0" />
          {seatSvg.map((s, i) => (
            <g key={i} data-seat="" transform="">
              <use href={`#${chairId}`} transform={`translate(${s.x.toFixed(2)} ${s.y}) scale(${s.s})`} className="la-chair-muted" />
              <use href={`#${chairId}`} transform={`translate(${s.x.toFixed(2)} ${s.y}) scale(${s.s})`} className="la-chair-lit" data-lit="" opacity="0" />
              <circle data-ring="" cx={s.x + (CHAIR.w * s.s) / 2} cy={s.y + (CHAIR.h * s.s) / 2} r={s.s * 40} fill="none" stroke="#ffe39a" strokeWidth="2" opacity="0" />
            </g>
          ))}
        </svg>
      </div>

      <div className="la-badge">{slide.badge ? <BadgePill id={slide.badge} landAt={badgeLand} /> : null}</div>
    </div>
  );
}
