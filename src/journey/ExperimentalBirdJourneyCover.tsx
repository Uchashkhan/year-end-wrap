import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePresence } from "motion/react";
import gsap from "gsap";
import { COPY } from "../data/copy";
import { usePrefs } from "../lib/prefs";
import type { ScreenProps } from "../screens/types";
import { BirdPose, BirdRig, EYES, MARKS_AT, REST_BOX, RESTING } from "./BirdCharacter";
import { createFlight, type Cloud } from "./flight";
import "../styles/journey.css";

/** The years the bird climbs through; ২০২৬ (index 6) is the landing. */
export const YEARS = ["২০২০", "২০২১", "২০২২", "২০২৩", "২০২৪", "২০২৫", "২০২৬"];
const DIGITS = [
  { id: "tl", ch: "২" },
  { id: "tr", ch: "০" },
  { id: "bl", ch: "২" },
  { id: "br", ch: "৬" },
] as const;
const MARKER_INK = "#3b2f9e";
/** The approved cover's per-digit float (CoverFigma): periods (s), start delay, direction. */
const FLOAT = [
  { py: 6.4, px: 9.1, delay: 0.9, dir: 1 },
  { py: 7.2, px: 8.3, delay: 1.6, dir: -1 },
  { py: 6.8, px: 9.7, delay: 1.2, dir: -1 },
  { py: 7.6, px: 8.8, delay: 2.0, dir: 1 },
] as const;
const FINAL_INK = ["#ffffff", "#ffffff", "#e2008d", "#e2008d"];

/** Reference 01's clouds (Figma px, 412 frame), plus recycled copies waiting above the frame. */
const CLOUDS = [
  { src: "cloud1", x: -42, y: 181, w: 178, h: 73, depth: 1 },
  { src: "cloud2", x: -13, y: 476, w: 120, h: 55, depth: 0.78 },
  { src: "cloud3", x: 358, y: 363, w: 91, h: 40, depth: 0.58 },
  { src: "cloud3", x: 300, y: -140, w: 91, h: 40, depth: 0.62 },
  { src: "cloud1", x: 262, y: -430, w: 178, h: 73, depth: 1.05 },
  { src: "cloud2", x: -40, y: -700, w: 120, h: 55, depth: 0.8 },
] as const;

/**
 * The journey's timing (s). Overlapping phases, one timeline:
 *   takeoff  0–0.4   already climbing; speeds up
 *   cruise   0.4–2.4 through ২০২০ → ২০২৫ (a little faster mid-way)
 *   arrive   2.4–3.0 ২০২৬ approaches; everything slows together
 *   turn     3.0–3.5 the bird turns to the student, settling into the cover
 *   settle   3.3–3.9 the cover's words and control arrive
 */
export const JOURNEY = {
  flight: 3.0,
  sky: { at: 2.3, dur: 0.95 },
  clouds: { at: 2.4, dur: 0.7 },
  digits: { at: 2.8, dur: 0.72 },
  turn: { at: 3.0, dur: 0.5 },
  /** the wings fold to the body (2.95–3.15), then the aligned pose swap: resting in over 0.12 s, flying out just behind it */
  fold: { at: 2.95, dur: 0.2 },
  cross: { at: 3.12, dur: 0.12 },
  head: { at: 3.3, dur: 0.5 },
  year: { at: 3.38, dur: 0.5 },
  support: { at: 3.48, dur: 0.42 },
  cta: { at: 3.56, dur: 0.38 },
  decor: { at: 3.2, dur: 0.6 },
  end: 3.95,
} as const;

/**
 * The climb's speed profile over the flight (u = 0…1): already moving (0.35),
 * up to cruise by 0.12, a slight surge mid-way, then a long, smooth slow-down
 * to rest (speed ∝ (1 − k)²). Returns the normalised distance E(u) and speed.
 */
function profile() {
  const v = (u: number) => {
    if (u < 0.12) return 0.35 + 0.65 * (u / 0.12) ** 2 * (3 - 2 * (u / 0.12));
    if (u < 0.55) return 1 + 0.14 * Math.sin(((u - 0.12) / 0.43) * Math.PI);
    const k = (u - 0.55) / 0.45;
    return (1 - k) ** 2;
  };
  const N = 600;
  const cum = [0];
  for (let i = 1; i <= N; i++) cum.push(cum[i - 1] + (v((i - 0.5) / N) / N));
  const total = cum[N];
  return {
    E: (u: number) => {
      const x = Math.max(0, Math.min(1, u)) * N;
      const i = Math.floor(x);
      return (cum[i] + (cum[Math.min(N, i + 1)] - cum[i]) * (x - i)) / total;
    },
    speed: (u: number) => v(Math.max(0, Math.min(1, u))) / 1.14,
  };
}

/**
 * EXPERIMENT — 01 Cover, "Bird Journey" (dev-only; the approved cover is
 * CoverFigma and is untouched). Reference 01 (flight) → Reference 02 (cover).
 * Copy: the approved cover's (COPY.cover). Tap during the journey to skip to
 * the cover. Reduced motion / repeat view: the final cover, static.
 */
export function ExperimentalBirdJourneyCover({ actions }: ScreenProps<"cover">) {
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const root = useRef<HTMLDivElement>(null);
  const [flying, setFlying] = useState(!still);
  const [isPresent, safeToRemove] = usePresence();
  const ctl = useRef<{ stop: () => void; finish: () => void } | null>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el || still) return;
    const q = <T extends Element = HTMLElement>(s: string) => el.querySelector(s) as T;
    const qa = <T extends Element = HTMLElement>(s: string) => [...el.querySelectorAll(s)] as T[];
    const W = el.clientWidth;
    const H = el.clientHeight;
    const f = W / 412;
    const J = JOURNEY;
    const rig = q(".bj-rig");
    const fly = q(".bj-fly");
    const rest = q(".bj-rest");
    const center = q(".bj-center");

    // ── where the bird ends: the resting pose exactly over the stack's bird slot ──
    const slotX = W / 2 - 0.5 - RESTING.w / 2;
    const slotY = H / 2 - 37.12 - center.offsetHeight / 2;
    const S1 = RESTING.w / REST_BOX.w;
    const end = { x: slotX - REST_BOX.x * S1, y: slotY - REST_BOX.y * S1, scale: S1 };
    // in flight: Reference 01's place — centred, at Figma size
    const cruise = { x: W / 2 - (200.173 / 2) * f, y: H * 0.5 - 83.5 * f, scale: f };
    gsap.set(rig, cruise);

    // ── clouds ──
    const clouds: Cloud[] = qa<HTMLElement>(".bj-cloud:not(.bj-bank)").map((c, i) => {
      const d = CLOUDS[i];
      c.style.width = `${d.w * f}px`;
      c.style.height = `${d.h * f}px`;
      return { el: c, x: d.x * f, y: d.y * f, w: d.w * f, h: d.h * f, depth: d.depth, recycle: true };
    });
    const bank = q(".bj-bank");
    bank.style.width = `${572 * f}px`;
    bank.style.height = `${83 * f}px`;
    clouds.push({ el: bank, x: W / 2 - 286 * f, y: H - 83 * f, w: 572 * f, h: 83 * f, depth: 1.3, recycle: false });

    const flight = createFlight({ rig, trails: q<SVGSVGElement>(".bj-air"), clouds, frame: () => ({ W, H, f }), state: { speed: 0.35, trail: 0.4, beats: 0.6, amp: 24 } });

    // ── the years: one track; ২০২৬ lands at the bird's own height — the bird
    // arrives in front of it, and its digits then burst outward to the corners
    // (away from the bird, never across it) ──
    const markers = qa<HTMLElement>(".bj-yr");
    const sp = 0.4 * H;
    const landC = cruise.y + 83.5 * f;
    const c0 = (-0.12 * H - landC) / sp;
    const place = (c: number) =>
      markers.forEach((m, i) => {
        const cy = landC + (c - i) * sp;
        const w = m.offsetWidth;
        const x = i === 6 ? (W - w) / 2 : i % 2 === 0 ? 20 * f : W - w - 20 * f;
        m.style.transform = `translate3d(${x.toFixed(1)}px, ${(cy - m.offsetHeight / 2).toFixed(1)}px, 0)`;
      });
    place(c0);

    const P = profile();
    const clock = { u: 0 };
    const tl = gsap.timeline({ onComplete: () => finish() });
    tl.to(
      clock,
      {
        u: 1,
        duration: J.flight,
        ease: "none",
        onUpdate: () => {
          const u = clock.u;
          place(c0 + (6 - c0) * P.E(u));
          const s = P.speed(u);
          flight.state.speed = s;
          flight.state.trail = Math.min(1, s * 1.1);
          flight.state.beats = Math.min(1, s * 1.2);
          // lean: forward while speeding up, back while braking, then upright
          const brake = u > 0.55 ? Math.sin(Math.min(1, (u - 0.55) / 0.4) * Math.PI) : 0;
          flight.state.pitch = (u < 0.15 ? -2.5 * (1 - u / 0.15) : 0) + 3.2 * brake;
          flight.state.amp = 13 + 11 * Math.min(1, s * 1.15);
        },
      },
      0,
    );
    // the years already passed fade as ২০২৬ arrives (only ২০২৬ stays to become the cover)
    tl.to(markers.slice(0, 6), { opacity: 0, duration: 0.45, ease: "sine.in" }, J.sky.at + 0.15);
    // the sky turns to the cover's violet, the clouds thin out
    tl.to(q(".bj-sky"), { opacity: 0, duration: J.sky.dur, ease: "sine.inOut" }, J.sky.at);
    tl.to(q(".bj-clouds"), { opacity: 0, duration: J.clouds.dur, ease: "sine.in" }, J.clouds.at);

    // ২০২৬: its four digits leave the marker for the cover's corners (a continuous move)
    const marker = markers[6];
    const spans = qa<HTMLElement>(".bj-yr-6 .bj-yr-d");
    const moves = qa<HTMLElement>(".bj-dgm");
    tl.call(
      () => {
        const mt = new DOMMatrix(getComputedStyle(marker).transform);
        DIGITS.forEach((_, i) => {
          const sEl = spans[i];
          const box = moves[i].parentElement as HTMLElement; // .bj-dg (static Figma box)
          const fromX = mt.e + sEl.offsetLeft + sEl.offsetWidth / 2;
          const fromY = mt.f + sEl.offsetTop + sEl.offsetHeight / 2;
          const toX = box.offsetLeft + box.offsetWidth / 2;
          const toY = box.offsetTop; // the box is centred on its top (translateY(-50%))
          const rot = i === 0 || i === 3 ? 27.25 : -27.25; // undo the glyph's own tilt at the start
          gsap.set(box, { opacity: 1 });
          gsap.fromTo(
            moves[i],
            { x: fromX - toX, y: fromY - toY, scale: 112 / 300, rotation: rot, color: MARKER_INK },
            { x: 0, y: 0, scale: 1, rotation: 0, color: FINAL_INK[i], duration: J.digits.dur, ease: "power3.inOut" },
          );
        });
        gsap.set(marker, { opacity: 0 });
      },
      undefined,
      J.digits.at,
    );

    // the bird slows, turns to the student, and settles into the cover's place
    tl.to(flight.state, { trail: 0, beats: 0, duration: 0.3, ease: "sine.out", overwrite: false }, J.turn.at - 0.15);
    tl.to(flight.state, { amp: 0, pitch: 0, duration: 0.25, ease: "sine.inOut" }, J.turn.at);
    tl.to(rig, { ...end, duration: J.turn.dur, ease: "power2.inOut" }, J.turn.at);
    tl.to(flight.state, { fold: 1, duration: J.fold.dur, ease: "sine.inOut" }, J.fold.at);
    tl.to(rest, { opacity: 1, duration: J.cross.dur, ease: "none" }, J.cross.at);
    tl.to(fly, { opacity: 0, duration: J.cross.dur, ease: "none" }, J.cross.at + 0.05);

    // the cover settles: decorations, title (rising in its masks), support, start
    tl.to(q(".bj-decor"), { opacity: 1, duration: J.decor.dur, ease: "sine.out" }, J.decor.at);
    tl.to(q(".bj-head > span"), { y: 0, duration: J.head.dur, ease: "expo.out" }, J.head.at);
    tl.to(q(".bj-year > span"), { y: 0, duration: J.year.dur, ease: "expo.out" }, J.year.at);
    tl.to(q(".bj-support"), { opacity: 1, duration: J.support.dur, ease: "sine.out" }, J.support.at);
    tl.to(q(".bj-cta"), { opacity: 1, duration: J.cta.dur, ease: "sine.out" }, J.cta.at);
    tl.set({}, {}, J.end);

    let done = false;
    function finish() {
      if (done) return;
      done = true;
      tl.kill();
      flight.stop();
      gsap.killTweensOf(moves);
      // the resting frame is CSS: clear what the journey set, then leave flight mode
      [...moves, ...markers, ...qa(".bj-dg"), q(".bj-decor"), q(".bj-head > span"), q(".bj-year > span"), q(".bj-support"), q(".bj-cta")].forEach((n) => gsap.set(n, { clearProps: "all" }));
      setFlying(false);
    }
    ctl.current = { stop: () => { tl.kill(); flight.stop(); }, finish };
    // the bird's own flags would flash at 0 before the first tick
    gsap.set([fly], { opacity: 1 });
    return () => {
      tl.kill();
      flight.stop();
    };
  }, [still]);

  // ── ambient, once the cover has settled (full motion only; loops) ──
  //   digits  each corner digit floats on its own slow ellipse — the approved
  //           cover's values (±4 / ±2 Figma units, periods 6.4–9.7 s, never in step)
  //   arrow   the start arrow's shaft stretches and the head travels with it
  //   bird    blinks every few seconds (sometimes twice), and now and then a
  //           sudden little hop: anticipation, spring, land, settle — the
  //           excitement ticks pop as it leaves the ground
  useEffect(() => {
    const el = root.current;
    if (still || flying || !el) return;
    const u = el.clientWidth / 412;
    const ctx = gsap.context(() => {
      el.querySelectorAll<HTMLElement>(".bj-float").forEach((n, i) => {
        const f = FLOAT[i];
        const a = 4 * u * f.dir;
        const b = 2 * u * f.dir;
        gsap.to(n, { keyframes: { y: [0, -a, 0, a, 0], easeEach: "sine.inOut" }, duration: f.py, delay: f.delay, repeat: -1, ease: "none" });
        gsap.to(n, { keyframes: { x: [0, b, 0, -b, 0], easeEach: "sine.inOut" }, duration: f.px, delay: f.delay, repeat: -1, ease: "none" });
      });
      const shaft = el.querySelector(".bj-arrow-shaft");
      const head = el.querySelector(".bj-arrow-head");
      if (shaft && head) {
        const g = 8.9 * 0.5;
        gsap.to(shaft, { keyframes: { scaleX: [1, 1.5, 1], x: [0, g / 2, 0], easeEach: "sine.inOut" }, duration: 1.1, delay: 0.3, repeat: -1, repeatDelay: 0.7, ease: "none" });
        gsap.to(head, { keyframes: { x: [0, -g / 2, 0], easeEach: "sine.inOut" }, duration: 1.1, delay: 0.3, repeat: -1, repeatDelay: 0.7, ease: "none" });
      }
    }, el);

    // the bird: two independent, randomly spaced idle behaviours
    const bird = el.querySelector<SVGSVGElement>(".bj-slot svg");
    const eyes = [...el.querySelectorAll<SVGGElement>(".bj-slot .bl-eyeL, .bj-slot .bl-eyeR")];
    const marks = el.querySelector<SVGGElement>(".bj-slot .bl-marks");
    const timers: gsap.core.Tween[] = [];
    const later = (s: number, fn: () => void) => timers.push(gsap.delayedCall(s, fn));
    const blink = () => {
      const t = gsap.timeline();
      eyes.forEach((e, i) => {
        const [cx, cy] = i === 0 ? EYES.eyeL : EYES.eyeR;
        gsap.set(e, { svgOrigin: `${cx} ${cy}` });
      });
      const once = (at: number) => t.to(eyes, { scaleY: 0.08, duration: 0.07, ease: "power2.in" }, at).to(eyes, { scaleY: 1, duration: 0.11, ease: "power2.out" }, at + 0.09);
      once(0);
      if (Math.random() < 0.28) once(0.26); // sometimes a double blink
      later(2.2 + Math.random() * 2.6, blink);
    };
    const hop = () => {
      if (!bird) return;
      const t = gsap.timeline({ defaults: { overwrite: "auto" } });
      t.set(bird, { transformOrigin: "50% 100%" })
        .to(bird, { scaleY: 0.92, scaleX: 1.05, y: 1.5, duration: 0.11, ease: "sine.inOut" })
        .to(bird, { y: -15, scaleY: 1.05, scaleX: 0.97, duration: 0.19, ease: "power2.out" })
        .to(bird, { y: 0, scaleY: 1, scaleX: 1, duration: 0.17, ease: "power2.in" })
        .to(bird, { scaleY: 0.94, scaleX: 1.04, duration: 0.06, ease: "sine.out" })
        .to(bird, { scaleY: 1, scaleX: 1, duration: 0.16, ease: "sine.out" });
      if (marks) {
        gsap.set(marks, { svgOrigin: `${MARKS_AT[0]} ${MARKS_AT[1]}` });
        t.fromTo(marks, { scale: 1 }, { keyframes: { scale: [1, 1.3, 1], easeEach: "sine.out" }, duration: 0.42, ease: "none" }, 0.12);
      }
      later(4.2 + Math.random() * 3.2, hop);
    };
    later(0.9, blink);
    later(1.6, hop);
    return () => {
      ctx.revert();
      timers.forEach((x) => x.kill());
      gsap.killTweensOf([bird, ...eyes, marks].filter(Boolean));
      if (bird) gsap.set(bird, { clearProps: "transform" });
      eyes.forEach((e) => gsap.set(e, { clearProps: "transform" }));
      if (marks) gsap.set(marks, { clearProps: "transform" });
    };
  }, [still, flying]);

  // Leaving: stop; removal is immediate. Revived before removal: the final cover.
  const wasLeaving = useRef(false);
  useEffect(() => {
    if (isPresent) {
      if (wasLeaving.current) {
        wasLeaving.current = false;
        ctl.current?.finish();
      }
      return;
    }
    wasLeaving.current = true;
    ctl.current?.stop();
    safeToRemove?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  return (
    <div ref={root} className={`slide bj ${flying ? "is-flying" : ""}`}>
      {/* the flight's world (Reference 01) */}
      <div className="bj-sky" aria-hidden="true" />
      <img className="bj-decor" src="/assets/journey/cover-decorations.svg" alt="" aria-hidden="true" />
      <div className="bj-years" aria-hidden="true">
        {YEARS.map((y, i) => (
          <span key={y} className={`bj-yr bj-yr-${i}`}>
            {i === 6
              ? [...y].map((d, k) => (
                  <span key={k} className="bj-yr-d">
                    {d}
                  </span>
                ))
              : y}
          </span>
        ))}
      </div>

      {/* Reference 02's year digits */}
      <div className="bj-digits" aria-hidden="true">
        {DIGITS.map((d) => (
          <div key={d.id} className={`bj-dg bj-dg-${d.id}`}>
            <div className="bj-dgm">
              <div className="bj-float">
                <span className="bj-glyph">{d.ch}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bj-clouds" aria-hidden="true">
        {CLOUDS.map((c, i) => (
          <span key={i} className="bj-cloud">
            <img src={`/assets/journey/${c.src}.svg`} alt="" />
          </span>
        ))}
        <span className="bj-cloud bj-bank">
          <img src="/assets/journey/bank.svg" alt="" />
        </span>
      </div>
      <svg className="bj-air" aria-hidden="true">
        <path />
        <path />
        <path />
      </svg>

      {/* Reference 02's centred stack: the resting bird, the title, the support line */}
      <div className="bj-center">
        <div className="bj-slot" aria-hidden="true">
          <BirdPose pose={RESTING} name="resting" />
        </div>
        <div className="bj-copy">
          <h1 className="bj-title" aria-label={`${COPY.cover.headline} ${COPY.cover.year}`}>
            <span className="bj-mask bj-head" aria-hidden="true">
              <span>{COPY.cover.headline}</span>
            </span>
            <span className="bj-mask bj-year" aria-hidden="true">
              <span>{COPY.cover.year}</span>
            </span>
          </h1>
          <p className="bj-support">{COPY.cover.support}</p>
        </div>
      </div>

      <BirdRig />

      <button type="button" className="bj-cta" data-no-nav onClick={() => actions.next()}>
        <span className="bj-cta-label">{COPY.cover.start}</span>
        <span className="bj-cta-btn" aria-hidden="true">
          {/* the approved cover's arrow: shaft and head from the same asset, so the shaft can stretch */}
          <span className="bj-arrow">
            <img className="bj-arrow-shaft" src="/assets/cover/arrow-left.svg" alt="" width={22} height={22} />
            <img className="bj-arrow-head" src="/assets/cover/arrow-left.svg" alt="" width={22} height={22} />
          </span>
        </span>
      </button>

      {flying && <button type="button" className="bj-skip" data-no-nav aria-label="Skip the intro" onClick={() => ctl.current?.finish()} />}
    </div>
  );
}
