import { useEffect, type CSSProperties } from "react";
import { useAnimate } from "motion/react";
import "../styles/night-sky.css";

/**
 * The shared night sky (Screens 01–02) — rendered ONCE at story level by
 * StoryViewer, behind the slides, so the hand-over from the Cover to Screen 02
 * keeps one continuous background (the twinkles never restart).
 * `bright` adds Screen 02's slightly stronger centre glow (cross-faded).
 *
 * Originally the cover's night sky — Figma 20:514 "Shikho · Year-end background" layers
 * (20:515 glow, 20:516 curves / stars / particles, 20:541 grain), placed in the
 * same 1/392-width units as the digits. Layers in the upper half are pinned to
 * the top edge and layers in the lower half to the bottom edge (like the digit
 * pairs), so their relation to the type holds at 390 × 844 and 360 × 800.
 *
 * Only the stars and particles move, and only in place: no drift, no rotation.
 *   stars      opacity 35 → 100 % of their designed value, scale 0.85 → 1.0;
 *              one cycle in three is a "glint" (full value, scale 1.1)
 *   particles  opacity 40 → 80 % of their designed value, no scale
 * Periods are all different (stars 2.5–4.5 s, particles 4–6 s) and phase-offset,
 * on an ease-in-out sine curve, so nothing ever pulses in step.
 * `still` (reduced motion / repeat view) renders the static Figma frame.
 * Loops start imperatively: the story's AnimatePresence initial={false}
 * suppresses declarative `animate` on descendants.
 */

type Anchor = "top" | "bottom";
interface Layer {
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  at: Anchor;
}

/** Figma frame coordinates (392 × 897). */
const CURVES: Layer[] = [
  { src: "sweep-upper-right", x: 220, y: -45, w: 230, h: 309, at: "top" },
  { src: "paths-upper", x: -62, y: 2, w: 497.265, h: 256.439, at: "top" },
  { src: "ribbon-lower", x: -40, y: 563, w: 475, h: 283, at: "bottom" },
  { src: "paths-lower", x: -40, y: 563, w: 475.502, h: 283.431, at: "bottom" },
];

/** period (s) per cycle, phase delay (s), and which of 3 cycles glints. */
const STARS: (Layer & { period: number; delay: number; glint: 0 | 1 | 2 })[] = [
  { src: "star-1", x: 34, y: 162, w: 12, h: 12, at: "top", period: 3.1, delay: 0.4, glint: 1 },
  { src: "star-2", x: 347, y: 293, w: 8, h: 8, at: "top", period: 4.3, delay: 1.5, glint: 2 },
  { src: "star-3", x: 59, y: 689, w: 10, h: 10, at: "bottom", period: 2.6, delay: 0.9, glint: 0 },
];

const DOTS: (Layer & { period: number; delay: number })[] = [
  { src: "dot-1", x: 30.75, y: 303.75, w: 2.5, h: 2.5, at: "top", period: 4.6, delay: 0.3 },
  { src: "dot-2", x: 357.7, y: 197.7, w: 2.6, h: 2.6, at: "top", period: 5.7, delay: 1.9 },
  { src: "dot-3", x: 366.85, y: 352.85, w: 2.3, h: 2.3, at: "top", period: 4.1, delay: 1.2 },
  { src: "dot-4", x: 25.9, y: 599.9, w: 2.2, h: 2.2, at: "bottom", period: 5.2, delay: 2.6 },
  { src: "dot-5", x: 349.6, y: 733.6, w: 2.8, h: 2.8, at: "bottom", period: 4.8, delay: 0.7 },
  { src: "dot-6", x: 43, y: 764, w: 2, h: 2, at: "bottom", period: 6.0, delay: 3.1 },
  { src: "dot-7", x: 323, y: 800, w: 2, h: 2, at: "bottom", period: 4.4, delay: 2.2 },
];

/** ease-in-out sine */
const SINE = [0.37, 0, 0.63, 1] as const;

const place = (l: Layer): CSSProperties =>
  ({ "--x": l.x, "--y": l.y, "--w": l.w, "--h": l.h } as CSSProperties);
const src = (name: string) => `/assets/cover/${name}.svg`;

/** Three cycles per loop: bright → dim, twice plainly, once with a glint. Starts and ends bright, so the loop is seamless. */
function starKeys(glint: 0 | 1 | 2) {
  const peak = (i: number) => (i === glint ? { o: 1, s: 1.1 } : { o: 0.85, s: 1 });
  const o: number[] = [];
  const s: number[] = [];
  for (let i = 0; i < 3; i++) {
    const p = peak(i);
    o.push(p.o, 0.35);
    s.push(p.s, 0.85);
  }
  const first = peak(0);
  o.push(first.o);
  s.push(first.s);
  return { opacity: o, scale: s };
}

export function NightSky({ still, bright }: { still: boolean; bright: boolean }) {
  const [scope, animate] = useAnimate<HTMLDivElement>();

  useEffect(() => {
    if (still || !scope.current) return;
    const q = (name: string) => scope.current!.querySelector<HTMLElement>(`[data-l="${name}"]`);
    const loops = [
      ...STARS.map((l) => {
        const el = q(l.src);
        return el && animate(el, starKeys(l.glint), { duration: l.period * 3, delay: l.delay, ease: SINE, repeat: Infinity });
      }),
      ...DOTS.map((l) => {
        const el = q(l.src);
        return el && animate(el, { opacity: [0.8, 0.4, 0.8] }, { duration: l.period, delay: l.delay, ease: SINE, repeat: Infinity });
      }),
    ];
    return () => loops.forEach((c) => c?.stop());
  }, [still, animate, scope]);

  const img = (l: Layer, cls = "") => (
    <img key={l.src} data-l={l.src} className={`cf-layer cf-at-${l.at} ${cls}`} style={place(l)} src={src(l.src)} alt="" />
  );

  return (
    <div ref={scope} className={`cf-sky ${still ? "" : "is-live"}`} aria-hidden="true">
      <div className="cf-glow" />
      <div className={`cf-glow cf-glow-bright ${bright ? "is-on" : ""}`} />
      {CURVES.map((l) => img(l))}
      {STARS.map((l) => img(l, "cf-star"))}
      {DOTS.map((l) => img(l, "cf-dot"))}
      <div className="cf-grain" />
    </div>
  );
}
