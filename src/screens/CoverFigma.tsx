import { useEffect, useRef } from "react";
import { useAnimate, usePresence, type AnimationPlaybackControls } from "motion/react";
import { COPY } from "../data/copy";
import { usePrefs } from "../lib/prefs";
import { sequence, type Step } from "../lib/sequence";
import { SKY_HANDOFF, useNav } from "../story/entry";
import { assembleYear } from "./assembleYear";
import type { ScreenProps } from "./types";
import "../styles/cover-figma.css";

/** One long, decelerating curve for everything that settles (no spring, no bounce). */
const SETTLE = [0.16, 1, 0.3, 1] as const;
const OUT = [0.22, 1, 0.36, 1] as const;
const FADE = [0.2, 0, 0.4, 1] as const;

const SINE = [0.37, 0, 0.63, 1] as const;

/** Per-digit float: vertical / horizontal periods (s), phase delay, direction. All different, so they never move together. */
const FLOAT = [
  { py: 6.4, px: 9.1, delay: 0.9, dir: 1 },
  { py: 7.2, px: 8.3, delay: 1.6, dir: -1 },
  { py: 6.8, px: 9.7, delay: 1.2, dir: -1 },
  { py: 7.6, px: 8.8, delay: 2.0, dir: 1 },
] as const;

/** Start arrow (22 px icon): the shaft runs from the head junction (x ≈ 10.4) to the tail cap (x ≈ 19.3). */
const ARROW = { shaftLen: 8.9, stretch: 1.5 } as const;

/** Each glyph's static tilt in the approved design (tl, tr, bl, br); see .cf-glyph rules. */
const TILTS = [-27.25, 27.25, 27.25, -27.25];

/** The four cropped year digits, exactly as the approved Figma frame (node 10:274). */
const DIGITS = [
  { id: "tl", ch: "২" },
  { id: "tr", ch: "০" },
  { id: "bl", ch: "২" },
  { id: "br", ch: "৬" },
] as const;

/**
 * 01 Cover — APPROVED static design (Figma "Android Compact - 1", 10:274).
 * Primary 900 ground; ২০২৬ split into four oversized, rotated, cropped digits —
 * white ২ ০ at the top, magenta ২ ৬ at the bottom — framing a centred stack:
 * logo, headline, year, invitation; below it the start control (label + arrow).
 *
 * Motion: "moving canvas". The four digits are ONE composition (.cf-digits);
 * nothing animates a digit on its own.
 * Entrance (≈1.4 s): the composition is on screen from the first frame, slightly
 *   close (scale 1.08, nudged down) and settles to the approved framing over
 *   900 ms; headline then year rise through a mask, invitation fades up,
 *   the start control arrives last.
 * Ambient (after the entrance, loops): each corner digit floats on its own slow
 *   ellipse (±4 / ±2 Figma units); the start arrow stretches long and short.
 * Exit to Screen 02 (owned here via usePresence, ≈1.65 s; timing in SKY_HANDOFF):
 *   the centre content fades; each of the four original corner digits travels
 *   from where it is to its slot in one centred horizontal row (tl, tr, bl, br
 *   → 1st–4th) — straightening, one size, one baseline, equal gaps, keeping
 *   their weight and colours — hold 200 ms, then the four scale up slightly
 *   (1.12×) and fade as Screen 02 arrives. Geometry: assembleYear.ts. The background
 *   (story level) never moves.
 * Reduced motion / repeat view: the settled frame, no entrance, plain nav.
 */
export function CoverFigma({ actions }: ScreenProps<"cover">) {
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const nav = useNav();
  const [isPresent, safeToRemove] = usePresence();
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const entrance = useRef<AnimationPlaybackControls | undefined>(undefined);

  // ── entrance ──
  useEffect(() => {
    if (still) return;
    const steps: Step[] = [
      [".cf-digits", { scale: [1.08, 1], y: ["2%", "0%"] }, { duration: 0.9, ease: SETTLE, at: 0 }],
      [".cf-logo", { opacity: [0, 1] }, { duration: 0.45, ease: OUT, at: 0.2 }],
      [".cf-head > span", { y: ["105%", "0%"] }, { duration: 0.6, ease: SETTLE, at: 0.22 }],
      [".cf-year > span", { y: ["105%", "0%"] }, { duration: 0.6, ease: SETTLE, at: 0.32 }],
      [".cf-support", { opacity: [0, 1], y: [10, 0] }, { duration: 0.5, ease: OUT, at: 0.6 }],
      [".cf-cta", { opacity: [0, 1], y: [12, 0] }, { duration: 0.55, ease: OUT, at: 0.85 }],
    ];
    entrance.current = sequence(scope.current, animate, steps);
    return () => entrance.current?.stop();
  }, [still, animate, scope]);

  // ── ambient: the corner digits float, the start arrow stretches (loops; full motion only) ──
  const ambient = useRef<AnimationPlaybackControls[]>([]);
  useEffect(() => {
    const root = scope.current;
    if (still || !root) return;
    const u = root.clientWidth / 412; // Figma units → px
    const loops: AnimationPlaybackControls[] = [];
    // Each digit drifts on its own slow ellipse: ±4u vertical, ±2u horizontal, never in step.
    FLOAT.forEach((f, i) => {
      const el = root.querySelectorAll<HTMLElement>(".cf-float")[i];
      if (!el) return;
      const a = 4 * u * f.dir;
      const b = 2 * u * f.dir;
      loops.push(animate(el, { y: [0, -a, 0, a, 0] }, { duration: f.py, delay: f.delay, ease: SINE, repeat: Infinity }));
      loops.push(animate(el, { x: [0, b, 0, -b, 0] }, { duration: f.px, delay: f.delay, ease: SINE, repeat: Infinity }));
    });
    // Start arrow: the shaft grows (×1.5) and the head travels with it, kept centred in the circle; then a rest.
    const shaft = root.querySelector<HTMLElement>(".cf-arrow-shaft");
    const head = root.querySelector<HTMLElement>(".cf-arrow-head");
    if (shaft && head) {
      const g = ARROW.shaftLen * (ARROW.stretch - 1);
      const t = { duration: 1.1, delay: 1.6, ease: SINE, repeat: Infinity, repeatDelay: 0.7 };
      loops.push(animate(shaft, { scaleX: [1, ARROW.stretch, 1], x: [0, g / 2, 0] }, t));
      loops.push(animate(head, { x: [0, -g / 2, 0] }, t));
    }
    ambient.current = loops;
    return () => loops.forEach((c) => c.stop());
  }, [still, animate, scope]);

  // ── exit: hand-over to Screen 02 over the shared sky ──
  useEffect(() => {
    if (isPresent) return;
    if (nav.kind !== "sky" || !scope.current) {
      safeToRemove?.();
      return;
    }
    entrance.current?.stop();
    ambient.current.forEach((c) => c.stop());
    const root = scope.current;
    const H = SKY_HANDOFF;
    // The four digits are drawn together into one year; the background (story level) never moves.
    root.classList.add("is-assembling");
    const moves = assembleYear(root, TILTS);
    const anims: AnimationPlaybackControls[] = [];
    const steps: Step[] = [
      // Ease-out: the content starts clearing on the first frame.
      [".cf-stack, .cf-cta", { opacity: 0, y: -8 }, { duration: H.contentFade, ease: FADE, at: 0 }],
      // The row rests, then the four digits scale up slightly and fade together
      // (about the frame centre = the row's centre).
      [".cf-digits", { scale: H.exitScale, opacity: 0 }, { duration: H.exitDur, ease: H.ease, at: H.exitAt }],
    ];
    const c = sequence(root, animate, steps);
    if (moves) {
      root.querySelectorAll<HTMLElement>(".cf-float").forEach((el, i) => {
        anims.push(animate(el, { ...moves[i] }, { duration: H.converge.dur, delay: H.converge.at, ease: H.ease }));
      });
    }
    const t = window.setTimeout(() => safeToRemove?.(), H.coverOut * 1000);
    return () => {
      c?.stop();
      anims.forEach((x) => x.stop());
      clearTimeout(t);
    };
    // nav is read at the moment the cover starts leaving
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  return (
    <div ref={scope} className={`slide cf ${still ? "" : "is-pre"}`}>
      <div className="cf-digits" aria-hidden="true">
        {DIGITS.map((d) => (
          <div key={d.id} className={`cf-dg cf-dg-${d.id}`}>
            <div className="cf-float">
              <span className="cf-glyph">{d.ch}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="cf-center">
        <div className="cf-stack">
          <img className="cf-logo" src="/assets/brand/shikho-logo-cover.svg" alt="Shikho" width={62} height={41} />
          <div className="cf-copy">
            <h1 className="cf-title" aria-label={`${COPY.cover.headline} ${COPY.cover.year}`}>
              <span className="cf-mask cf-head" aria-hidden="true">
                <span>{COPY.cover.headline}</span>
              </span>
              <span className="cf-mask cf-year" aria-hidden="true">
                <span>{COPY.cover.year}</span>
              </span>
            </h1>
            <p className="cf-support">{COPY.cover.support}</p>
          </div>
        </div>
      </div>

      {/* Figma 20:579: label + circular arrow. A real control: it advances like a tap. */}
      <button type="button" className="cf-cta" data-no-nav onClick={() => actions.next()}>
        <span className="cf-cta-label">{COPY.cover.start}</span>
        <span className="cf-cta-btn" aria-hidden="true">
          {/* Figma's ArrowLeft, rotated 180° as designed. Drawn twice from the same asset, clipped:
              the shaft half stretches, the head half travels — the head is never distorted. */}
          <span className="cf-arrow">
            <img className="cf-arrow-shaft" src="/assets/cover/arrow-left.svg" alt="" width={22} height={22} />
            <img className="cf-arrow-head" src="/assets/cover/arrow-left.svg" alt="" width={22} height={22} />
          </span>
        </span>
      </button>

    </div>
  );
}
