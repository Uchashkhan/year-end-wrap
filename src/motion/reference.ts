import type { Spring } from "./spring";

/**
 * Reference Motion: the parameters extracted from the reference prototype's
 * C3 Journey direction (commit d6b2e9d, read-only; docs/reference-motion-language.md).
 * One source for the profile's primitives (motion/primitives.ts). Values are the
 * reference's own unless a comment says otherwise.
 */

// ── curves (C3 :root) ──
/** --pop: rises ≈ 9.8 % past its place and settles back. Text and small pops. */
export const POP = [0.34, 1.56, 0.64, 1] as const;
/** --ease: soft out (captions). */
export const SOFT = [0.2, 0.8, 0.2, 1] as const;
/** Cubic in-out (C3 `eio`): counts, travel, zooms. */
export const eio = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** Cubic out (C3 `eo`): short counts, glows, outlines. */
export const eo = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** C3 `kf`: piecewise keyframes, eio between keys. */
export function kf(keys: readonly (readonly [number, number])[], t: number): number {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++)
    if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], eio((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])));
  return keys[keys.length - 1][1];
}

// ── springs (C3 spr(t, ζ, ωn) call sites) ──
export const SPRING = {
  /** Cards and tiles travelling into place (quiz cards: ζ .6 ωn 11; 9.5 % overshoot). */
  travel: { z: 0.6, wn: 11 },
  /** Rotation riding on a travel (quiz cards; 20.5 %). */
  tilt: { z: 0.45, wn: 11 },
  /** Headline lines (cover text; 16.3 %). */
  text: { z: 0.5, wn: 13 },
  /** A support panel rising (badge panel; 9.5 %). */
  panel: { z: 0.6, wn: 12 },
  /** A masked title rising (earned title; 12.6 %). */
  title: { z: 0.55, wn: 13 },
  /** A stamp / medal (23.4 %). */
  stamp: { z: 0.42, wn: 15 },
} as const satisfies Record<string, Spring>;

export const STAGGER_REF = {
  /** Quiz cards. */
  card: 0.16,
  /** Fan, graphemes. */
  fan: 0.06,
  /** Cover text lines. */
  line: 0.12,
} as const;

// ── text (C3 .up / .fade) ──
export const TEXT = {
  /** Kicker / line: from opacity 0, translateY(22px) scale(.96), 900 ms --pop; a line follows its kicker by 0.1 s. */
  up: { dur: 0.9, y: 22, scale: 0.96, ease: POP, after: 0.1 },
  /** Caption: opacity only, 700 ms --ease. */
  fade: { dur: 0.7, ease: SOFT },
} as const;

// ── the hero number (C3 landFx, FX.sparks) ──
export const LAND = {
  /** Number scale: 1 → 1.16 → 0.97 → 1 (eio between keys), s since landing. */
  scale: [
    [0, 1],
    [0.23, 1.16],
    [0.47, 0.97],
    [0.76, 1],
  ] as const,
  /** Glow disc behind the number: scale 0.3 → 1.8 (eo over 1 s), opacity 0 → peak (0.22 s) → 0 (1 s). */
  glow: { scaleFrom: 0.3, scaleTo: 1.8, opacity: [[0, 0], [0.22, 1], [1, 0]] as const, sizeToHeight: 2.2 },
  /**
   * Ours: the glow's peak opacity. The reference's is 1 on a white number; ours is
   * subtle on an already-yellow number (approved Nov 26: "subtle glow", no gold flash).
   */
  glowPeak: 0.5,
  /** The whole landing has played out by then (gold overlay in the reference: 1.2 s). */
  end: 1.2,
  /** One-shot sparks (optional): 7 four-point stars, 2/3 gold, 1/3 white, 0.8 s, radius max(50 px, ½ number width). */
  sparks: { n: 7, life: 0.8, minDist: 50, widthFactor: 0.5 },
} as const;

/** Sequencing relations (cues relative to events, not fixed delays). */
export const RELATION = {
  /** The number lands just after the visual that drives it completes (C3 video: + 0.05 s). */
  landAfterDriver: 0.05,
  /** A caption follows the landing (C3 hours: caption at landing + 0.4 s). */
  captionAfterLand: 0.4,
  /** A support panel follows the landing (C3 video: badge at landing + 0.5 s). */
  panelAfterLand: 0.5,
} as const;
