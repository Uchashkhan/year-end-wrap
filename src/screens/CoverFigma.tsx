import { useEffect, useRef } from "react";
import { useAnimate, usePresence, type AnimationPlaybackControls } from "motion/react";
import { COPY } from "../data/copy";
import { usePrefs } from "../lib/prefs";
import { sequence, type Step } from "../lib/sequence";
import { SKY_HANDOFF, useNav } from "../story/entry";
import { clusterYear } from "./assembleYear";
import type { ScreenProps } from "./types";
import "../styles/cover-figma.css";

/** One long, decelerating curve for everything that settles (no spring, no bounce). */
const SETTLE = [0.16, 1, 0.3, 1] as const;
const OUT = [0.22, 1, 0.36, 1] as const;
const FADE = [0.2, 0, 0.4, 1] as const;

const SINE = [0.37, 0, 0.63, 1] as const;

/**
 * Opening (≈ 1.9 s): ২০২৬ appears as one compact 2 × 2 cluster in the centre,
 * holds, then opens out to the four corners in one movement (a 30 ms stagger,
 * one gentle in-out curve, easing slightly down in size and into its tilt);
 * the bird, the title, the line and the start control arrive in turn as it does.
 */
const OPEN = {
  appear: 0.35, // the cluster fades in
  hold: 0.5, // it rests
  expand: { at: 0.5, dur: 1.0, step: 0.03, ease: [0.6, 0, 0.2, 1] as const },
  cluster: { scale: 1.06, gap: 0.1, lift: 0.01 },
  bird: 0.85,
  title: 1.0,
  support: 1.22,
  cta: 1.42,
  /** The ambient float starts once the digits have landed. */
  ambientAt: 1.6,
} as const;

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
 * Entrance (OPEN, ≈ 1.9 s): the four digits open as one compact, upright 2 × 2
 *   cluster of ২০২৬ in the centre (clusterYear in assembleYear.ts), hold, then
 *   open out together to their approved corners — a very small stagger, one
 *   gentle curve, easing slightly down in size and into their tilt. As they go:
 *   the bird fades and scales in, the headline and year rise through their
 *   masks, the invitation fades up, the start control arrives last.
 * Ambient (after the entrance, loops): each corner digit floats on its own slow
 *   ellipse (±4 / ±2 Figma units); the start arrow stretches long and short.
 * Exit to Screen 02 (owned here via usePresence, ≈ 0.85 s; SKY_HANDOFF): the
 *   digits never regroup. The centre content fades and lifts; each corner digit
 *   moves a short way further out from the centre, past its own edges, and
 *   fades; the background drifts to Study Time's; Screen 02's clock rises and
 *   its headline and number reveal over the last part (StudyClock).
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
    const root = scope.current;
    if (!root) return;
    const moves = clusterYear(root, TILTS, OPEN.cluster);
    const floats = [...root.querySelectorAll<HTMLElement>(".cf-float")];
    const steps: Step[] = [
      [".cf-digits", { opacity: [0, 1] }, { duration: OPEN.appear, ease: OUT, at: 0 }],
      [".cf-logo", { opacity: [0, 1], scale: [0.86, 1] }, { duration: 0.5, ease: SETTLE, at: OPEN.bird }],
      [".cf-bird-light", { opacity: [0, 1] }, { duration: 0.6, ease: OUT, at: OPEN.bird }],
      [".cf-head > span", { y: ["105%", "0%"] }, { duration: 0.6, ease: SETTLE, at: OPEN.title }],
      [".cf-year > span", { y: ["105%", "0%"] }, { duration: 0.6, ease: SETTLE, at: OPEN.title + 0.08 }],
      [".cf-support", { opacity: [0, 1], y: [10, 0] }, { duration: 0.5, ease: OUT, at: OPEN.support }],
      [".cf-cta", { opacity: [0, 1], y: [12, 0] }, { duration: 0.55, ease: OUT, at: OPEN.cta }],
    ];
    entrance.current = sequence(root, animate, steps);
    // The cluster: each digit starts in its cluster slot and opens out to its corner.
    const opens: AnimationPlaybackControls[] = [];
    if (moves)
      floats.forEach((el, i) => {
        const m = moves[i];
        // Hold the cluster pose from the first frame (not just from the delay).
        opens.push(animate(el, { x: m.x, y: m.y, scale: m.scale, rotate: m.rotate }, { duration: 0 }));
        opens.push(
          animate(
            el,
            { x: [m.x, 0], y: [m.y, 0], scale: [m.scale, 1], rotate: [m.rotate, 0] },
            { duration: OPEN.expand.dur, ease: OPEN.expand.ease, delay: OPEN.expand.at + i * OPEN.expand.step },
          ),
        );
      });
    return () => {
      entrance.current?.stop();
      opens.forEach((c) => c.stop());
    };
  }, [still, animate, scope]);

  // ── ambient: the corner digits float, the start arrow stretches (loops; full motion only) ──
  const ambient = useRef<AnimationPlaybackControls[]>([]);
  useEffect(() => {
    const root = scope.current;
    if (still || !root) return;
    const u = root.clientWidth / 412; // Figma units → px
    const loops: AnimationPlaybackControls[] = [];
    // Start only once the opening has landed: an animation queued with a delay
    // still claims the transform at once, which would cancel the cluster pose.
    const start = window.setTimeout(() => {
    // Each digit drifts on its own slow ellipse: ±4u vertical, ±2u horizontal, never in step.
    FLOAT.forEach((f, i) => {
      const el = root.querySelectorAll<HTMLElement>(".cf-float")[i];
      if (!el) return;
      const a = 4 * u * f.dir;
      const b = 2 * u * f.dir;
      // Starts after the opening has landed (the opening owns the same transform until then).
      loops.push(animate(el, { y: [0, -a, 0, a, 0] }, { duration: f.py, delay: f.delay, ease: SINE, repeat: Infinity }));
      loops.push(animate(el, { x: [0, b, 0, -b, 0] }, { duration: f.px, delay: f.delay, ease: SINE, repeat: Infinity }));
    });
    // Start arrow: the shaft grows (×1.5) and the head travels with it, kept centred in the circle; then a rest.
    const shaft = root.querySelector<HTMLElement>(".cf-arrow-shaft");
    const head = root.querySelector<HTMLElement>(".cf-arrow-head");
    if (shaft && head) {
      const g = ARROW.shaftLen * (ARROW.stretch - 1);
      const t = { duration: 1.1, delay: 0.3, ease: SINE, repeat: Infinity, repeatDelay: 0.7 };
      loops.push(animate(shaft, { scaleX: [1, ARROW.stretch, 1], x: [0, g / 2, 0] }, t));
      loops.push(animate(head, { x: [0, -g / 2, 0] }, t));
    }
    }, OPEN.ambientAt * 1000);
    ambient.current = loops;
    return () => {
      clearTimeout(start);
      loops.forEach((c) => c.stop());
    };
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
    const D = H.digitsOut;
    const frame = root.getBoundingClientRect();
    const fcx = frame.left + frame.width / 2;
    const fcy = frame.top + frame.height / 2;
    const anims: AnimationPlaybackControls[] = [];
    // The centre content fades and lifts a little.
    const c = sequence(root, animate, [
      [".cf-stack, .cf-cta", { opacity: 0, y: -H.contentLift }, { duration: H.contentFade, ease: FADE, at: 0 }],
      [".cf-scrim, .cf-bird-light", { opacity: 0 }, { duration: H.contentFade + 0.15, ease: FADE, at: 0 }],
    ]);
    // Each corner digit leaves from where it is: straight out from the frame's
    // centre, just far enough to clear its own edges — never regrouping.
    root.querySelectorAll<HTMLElement>(".cf-float").forEach((el) => {
      const g = el.querySelector<HTMLElement>(".cf-glyph");
      if (!g) return;
      const range = document.createRange();
      range.selectNodeContents(g);
      const r = range.getBoundingClientRect();
      let dx = r.left + r.width / 2 - fcx;
      let dy = r.top + r.height / 2 - fcy;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      // Distance along (dx, dy) until the glyph's box is past the nearer edge it faces.
      const outX = dx < 0 ? (r.right - frame.left) / -dx : (frame.right - r.left) / dx;
      const outY = dy < 0 ? (r.bottom - frame.top) / -dy : (frame.bottom - r.top) / dy;
      const dist = Math.min(outX, outY);
      const m = new DOMMatrix(getComputedStyle(el).transform); // current float offset (ambient drift)
      anims.push(
        animate(el, { x: [m.e, m.e + dx * dist], y: [m.f, m.f + dy * dist], scale: [1, 1.04] }, { duration: D.dur, delay: D.at, ease: D.ease }),
      );
      anims.push(animate(el, { opacity: [1, 0] }, { duration: D.dur - D.fadeAt, delay: D.at + D.fadeAt, ease: FADE }));
    });
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
      {/* A soft darkening behind the central stack (contrast for the bird and type). */}
      <i className="cf-scrim" aria-hidden="true" />
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
          <i className="cf-bird-light" aria-hidden="true" />
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
