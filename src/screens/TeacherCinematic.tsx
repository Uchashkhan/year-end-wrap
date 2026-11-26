import { useLayoutEffect, useMemo, useRef } from "react";
import { usePresence } from "motion/react";
import gsap from "gsap";
import { COPY } from "../data/copy";
import { usePrefs } from "../lib/prefs";
import { graphemes } from "../lib/graphemes";
import { gsapEase } from "../motion/ease";
import { SPRING, TEXT } from "../motion/reference";
import { spr } from "../motion/spring";
import { FOCUS, useEntry } from "../story/entry";
import { focusTimeline } from "./focusHandoff";
import { Silhouette } from "./TeacherSpotlight";
import type { ScreenProps } from "./types";
import "../styles/teacher-cinematic.css";

/**
 * 04 Teacher — "Cinematic Spotlight" (screen facet teacher.design = cinematic).
 * Same copy (PRD: framing "যাঁর ক্লাসে সবচেয়ে বেশি ছিলে" · the teacher's name),
 * same portrait assets and fallbacks, the same Soft Violet background underneath;
 * the light becomes the storyteller.
 *
 * Light, built from soft layers (no hard edges): a warm source glow at the top
 * edge; a volumetric beam — an outer haze cone and a brighter core, each a
 * feathered SVG cone (Gaussian blur, wider horizontally) — with a landing pool
 * that travels with it; a warm backlight behind the teacher; a dim veil over the
 * room that lifts into a vignette; restrained rim light on the portrait.
 *
 * One GSAP timeline, one paint function (deterministic; seeks in the Motion
 * Inspector). In s from the screen's start (from Screen 03 the room starts with
 * 03's own fade, FOCUS):
 *   1 anticipation  0      → the room dims; the framing heading rises at the top
 *                           (Reference text); the teacher appears only as a dark
 *                           silhouette (the same illustration, masked by its own
 *                           alpha) and holds ≈ 0.9 s
 *                   1.95   → the light comes
 *   2 search        2.0    → the beam opens on the left and sweeps across
 *                           (accelerating, decelerating, EASE.glide), passing the
 *                           teacher, to the right
 *   3 discovery     2.95   → it swings back and settles on the teacher (Reference
 *                           panel spring); the teacher's light is computed every
 *                           frame from the beam's angle — lit as the beam reaches
 *                           them — and the portrait rises into place on the
 *                           travel spring; the veil lifts to a vignette. The
 *                           silhouette opens where the light lands (a glimpse as
 *                           the beam passes, then completely, 3.0–4.3)
 *   4 recognition   4.1    → the name lands grapheme by grapheme (C3's drop and
 *                           squash, 60 % of its squash: appreciation, not a jolt)
 *   5 settle        ≈ 5.0  → the beam breathes very slightly (ambient)
 * Reduced motion / repeat view: the settled frame.
 */
const T = {
  dim: { at: 0, dur: 0.7 },
  framing: 0.15,
  /** the silhouette comes up after Screen 03's seat has sunk away (FOCUS.seatOut), so the two never overlap */
  conceal: { at: 0.55, dur: 0.5 },
  /** … and holds, dark, ≈ 0.9 s (mystery) before the light starts its search */
  beamOn: { at: 1.95, dur: 0.35 },
  sweep: { at: 2.0, dur: 0.95, from: -24, to: 16 },
  /** the swing back onto the teacher: Reference panel spring (ζ .6, ωn 12) */
  settle: { dur: 0.9 },
  lift: { dur: 0.8 },
  /** the light opens the silhouette completely once it has found the teacher */
  reveal: { after: 0.05, dur: 1.3 },
  /** the name only once the teacher's identity is visible (the reveal ≈ 90 % done) */
  name: { after: 1.15, step: 0.06 },
  breath: 5.0,
} as const;
/** The opening in the silhouette (where the light falls on the portrait), as shares of the portrait's width. */
const HOLE = { glimpse: 0.3, full: 1.9, feather: 0.34 } as const;
/** The teacher is lit when the beam is within this many degrees of them (fully within LIT_IN). */
const LIT_OUT = 16;
const LIT_IN = 2.5;

const clamp = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (e0: number, e1: number, x: number) => {
  const u = clamp((x - e0) / (e1 - e0));
  return u * u * (3 - 2 * u);
};

export function TeacherCinematic({ slide }: ScreenProps<"teacher">) {
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const fromLive = useEntry().kind === "focus";
  // From 03 the room starts dimming with 03's fade (FOCUS.dim.at); entered any other way, at once.
  const shift = fromLive ? FOCUS.dim.at : 0;
  const root = useRef<HTMLDivElement>(null);
  const [isPresent, safeToRemove] = usePresence();
  const stopRef = useRef<() => void>(() => {});
  const portrait = slide.portraitUrl || null;
  const photo = !portrait && slide.photoUrl && !slide.photoUrl.startsWith("mock://") ? slide.photoUrl : null;
  const parts = useMemo(() => graphemes(slide.name), [slide.name]);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = <E extends Element = HTMLElement>(s: string) => el.querySelector(s) as E;
    const dim = q(".cs-dim");
    const vig = q(".cs-vig");
    const source = q(".cs-source");
    const beam = q(".cs-beam");
    const glow = q(".cs-glow");
    const fig = q(".cs-figure");
    const art = q(".cs-art");
    const framing = q(".cs-framing");
    const grs = [...el.querySelectorAll<HTMLElement>(".cs-gr")];

    // the scene's state; paint() turns it into styles
    const sil = el.querySelector<HTMLElement>(".cs-sil");
    // geometry for the light's landing point on the portrait (layout boxes; transforms excluded)
    const fr = fig.getBoundingClientRect();
    const sr = el.getBoundingClientRect();
    const pivot = { x: sr.width / 2, y: -0.03 * sr.height };
    const box = { left: fr.left - sr.left, top: fr.top - sr.top, w: fr.width, h: fr.height };
    const landY = box.top + box.h * 0.34; // head and shoulders
    const S = { dim: 0, conceal: 0, beam: 0, angle: T.sweep.from, settleT: -1, foundT: -1, lift: 0, reveal: 0, nameT: -1, gain: 1 };
    let swingFrom: number = T.sweep.to;
    const paint = () => {
      // the beam's angle: the sweep, then the spring back onto the teacher
      const angle = S.settleT < 0 ? S.angle : lerp(swingFrom, 0, spr(S.settleT, SPRING.panel.z, SPRING.panel.wn));
      const lit = smooth(LIT_OUT, LIT_IN, Math.abs(angle)) * S.beam;
      const found = S.foundT < 0 ? 0 : spr(S.foundT, SPRING.travel.z, SPRING.travel.wn);
      dim.style.opacity = (S.dim * (1 - 0.55 * S.lift)).toFixed(3);
      vig.style.opacity = (S.dim * S.lift).toFixed(3);
      beam.style.opacity = (S.beam * S.gain).toFixed(3);
      beam.style.transform = `rotate(${angle.toFixed(2)}deg)`;
      source.style.opacity = (S.beam * (0.75 + 0.25 * S.gain)).toFixed(3);
      glow.style.opacity = (lit * S.gain).toFixed(3);
      // the teacher: a dark, low shape until the light reaches them
      fig.style.opacity = Math.max(S.conceal, clamp(found * 1.2)).toFixed(3);
      // the silhouette opens where the light lands: a glimpse while the beam passes, then completely once it has
      // found the teacher (a wide feathered radial opening, never a visible edge)
      if (sil) {
        const x = pivot.x + Math.tan((angle * Math.PI) / 180) * (landY - pivot.y) - box.left;
        const y = landY - box.top;
        const open = Math.max(lit * HOLE.glimpse, S.reveal * HOLE.full);
        const r = open * box.w;
        const f = HOLE.feather * box.w;
        const hole = `radial-gradient(circle at ${x.toFixed(1)}px ${y.toFixed(1)}px, transparent ${r.toFixed(1)}px, #000 ${(r + f).toFixed(1)}px)`;
        sil.style.setProperty("--cs-hole", hole);
        sil.style.opacity = S.reveal >= 1 ? "0" : "1";
      }
      fig.style.transform = `translate3d(0, ${(18 * (1 - found)).toFixed(2)}px, 0) scale(${(0.97 + 0.03 * found).toFixed(4)})`;
      const bright = 0.3 + 0.7 * lit;
      const sat = 0.55 + 0.45 * lit;
      art.style.filter = `brightness(${bright.toFixed(3)}) saturate(${sat.toFixed(3)}) drop-shadow(0 -2px 7px rgba(255, 214, 150, ${(0.5 * lit).toFixed(3)}))`;
      // the name: C3's grapheme drop and squash (squash at 60 %)
      grs.forEach((g, i) => {
        const a = S.nameT - i * T.name.step;
        if (a <= 0) {
          g.style.opacity = "0";
          g.style.transform = "translate3d(0, -40px, 0) scale(0.7, 1.7)";
          return;
        }
        let y = 0;
        let sx = 1;
        let sy = 1;
        if (a < 0.16) {
          const k = Math.pow(a / 0.16, 3);
          y = lerp(-40, 0, k);
          sx = lerp(0.7, 0.92, k);
          sy = lerp(1.7, 1.12, k);
        } else {
          const b = a - 0.16;
          const d = Math.exp(-5.5 * b) * Math.cos(b * 22);
          sy = 1 - 0.18 * d;
          sx = 1 + 0.13 * d;
        }
        g.style.opacity = clamp(a / 0.08).toFixed(3);
        g.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
      });
    };

    if (still) {
      Object.assign(S, { dim: 1, beam: 1, angle: 0, settleT: 9, foundT: 9, lift: 1, reveal: 1, nameT: 9, conceal: 1 });
      paint();
      gsap.set(framing, { opacity: 1 });
      return;
    }

    // Screen 03's side of the hand-over (its rows and seat), unchanged; 04's light is ours
    const from = fromLive ? el.closest(".story")?.querySelector<HTMLElement>(".slide.fr") ?? null : null;
    const hand = from ? focusTimeline(el, { from, shift: 0 }) : null;

    const at = (t: number) => t + shift;
    const tl = gsap.timeline({ onUpdate: paint });
    tl.set(S, { dim: 0 }, 0);
    // 1 anticipation
    tl.to(S, { dim: 1, duration: T.dim.dur, ease: gsapEase("dawn") }, at(T.dim.at));
    tl.fromTo(
      framing,
      { opacity: 0, y: TEXT.up.y, scale: TEXT.up.scale },
      { opacity: 1, y: 0, scale: 1, duration: TEXT.up.dur, ease: gsapEase("refPop") },
      at(T.framing),
    );
    tl.to(S, { conceal: 1, duration: T.conceal.dur, ease: gsapEase("settle") }, at(T.conceal.at));
    // 2 search: the beam opens on the left and sweeps across, accelerating then decelerating
    tl.to(S, { beam: 1, duration: T.beamOn.dur, ease: "power1.out" }, at(T.beamOn.at));
    tl.fromTo(S, { angle: T.sweep.from }, { angle: T.sweep.to, duration: T.sweep.dur, ease: gsapEase("glide") }, at(T.sweep.at));
    // 3 discovery: it swings back onto the teacher; they rise into the light; the room lifts
    const findAt = at(T.sweep.at + T.sweep.dur);
    tl.call(() => (swingFrom = S.angle), undefined, findAt);
    tl.fromTo(S, { settleT: 0 }, { settleT: T.settle.dur, duration: T.settle.dur, ease: "none", immediateRender: false }, findAt);
    tl.fromTo(S, { foundT: 0 }, { foundT: 1.2, duration: 1.2, ease: "none", immediateRender: false }, findAt + 0.12);
    tl.to(S, { lift: 1, duration: T.lift.dur, ease: gsapEase("settle") }, findAt + 0.1);
    // the light opens the silhouette completely: the colours and details of the portrait come up under it
    tl.to(S, { reveal: 1, duration: T.reveal.dur, ease: gsapEase("glide") }, findAt + T.reveal.after);
    // 4 recognition: the name lands, grapheme by grapheme — only once the teacher can be seen
    const nameDur = (parts.length - 1) * T.name.step + 1.0;
    tl.fromTo(S, { nameT: 0 }, { nameT: nameDur, duration: nameDur, ease: "none", immediateRender: false }, findAt + T.name.after);
    // 5 settle: only the light breathes, very slightly
    let breath: gsap.core.Tween | null = null;
    tl.call(() => {
      breath = gsap.to(S, { gain: 0.93, duration: 3.2, ease: "sine.inOut", yoyo: true, repeat: -1, onUpdate: paint });
    }, undefined, at(T.breath));
    paint();

    stopRef.current = () => {
      hand?.kill();
      tl.progress(1, true).kill();
      breath?.kill();
      S.gain = 1;
      paint();
    };
    return () => {
      hand?.kill();
      tl.kill();
      breath?.kill();
    };
    // the entrance is fixed for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still]);

  // leaving: everything comes to rest at once, then the screen goes (standard hand-over)
  useLayoutEffect(() => {
    if (isPresent) return;
    stopRef.current();
    safeToRemove?.();
  }, [isPresent, safeToRemove]);

  return (
    <div ref={root} className={`slide cs ${still ? "" : "is-pre"}`}>
      <div className="cs-dim" aria-hidden="true" />
      <div className="cs-source" aria-hidden="true" />
      <div className="cs-beam" aria-hidden="true">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="cs-haze" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffe8c4" stopOpacity="0.36" />
              <stop offset="0.55" stopColor="#ffdcae" stopOpacity="0.17" />
              <stop offset="1" stopColor="#ffd59c" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="cs-core" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff2da" stopOpacity="0.5" />
              <stop offset="0.6" stopColor="#ffe3b8" stopOpacity="0.24" />
              <stop offset="1" stopColor="#ffdba6" stopOpacity="0.04" />
            </linearGradient>
            <radialGradient id="cs-land" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#ffe2b0" stopOpacity="0.24" />
              <stop offset="1" stopColor="#ffe2b0" stopOpacity="0" />
            </radialGradient>
            <filter id="cs-feather" x="-60%" y="-10%" width="220%" height="120%">
              <feGaussianBlur stdDeviation="5 1.6" />
            </filter>
            <filter id="cs-feather-core" x="-60%" y="-10%" width="220%" height="120%">
              <feGaussianBlur stdDeviation="2.6 1" />
            </filter>
          </defs>
          <polygon points="46,0 54,0 100,100 0,100" fill="url(#cs-haze)" filter="url(#cs-feather)" />
          <polygon points="48.6,0 51.4,0 72,100 28,100" fill="url(#cs-core)" filter="url(#cs-feather-core)" />
          <ellipse cx="50" cy="94" rx="46" ry="14" fill="url(#cs-land)" filter="url(#cs-feather)" />
        </svg>
      </div>
      <div className="cs-glow" aria-hidden="true" />
      <div className={`cs-figure ${photo ? "cs-figure-photo" : portrait ? "cs-figure-portrait" : ""}`} aria-hidden="true">
        <div className="cs-art">
          {portrait ? <img className="cs-portrait" src={portrait} alt="" decoding="async" /> : photo ? <img className="cs-photo" src={photo} alt="" /> : <Silhouette />}
        </div>
        {/* the silhouette: the same illustration, cut from its own transparency, in the room's dark purple */}
        {portrait || photo ? (
          <div className="cs-sil" style={{ "--cs-sil-src": `url("${portrait ?? photo}")` } as React.CSSProperties} />
        ) : (
          <div className="cs-sil cs-sil-svg">
            <Silhouette />
          </div>
        )}
      </div>
      <div className="cs-vig" aria-hidden="true" />

      <p className="cs-framing">{COPY.teacher.framing}</p>
      <div className="cs-copy">
        <h1 className="cs-name" aria-label={slide.name}>
          {parts.map((g, i) => (
            <span key={i} className="cs-gr" aria-hidden="true">
              {g}
            </span>
          ))}
        </h1>
      </div>
    </div>
  );
}
