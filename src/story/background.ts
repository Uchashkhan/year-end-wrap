import type { Slide } from "../data/compose";
import type { Entry } from "./entry";
import { bgDuration } from "../motion/handovers";

/**
 * "Gentle Atmosphere" — the Wrap 2026 background system.
 * Source of truth: Figma th2CA9ugtc2BZixN4UBH3Z, section 55:38 (frames 55:39,
 * 55:43, 55:47, 55:51; reference frame 412 × 852). Every value below is read
 * from those frames; nothing is approximated from screenshots.
 *
 * Each variant is one vertical linear gradient (180°): the four masters now
 * use the refined 34-stop gradients (Figma 137:51, below). All four frames carry
 * the identical decoration layer (unchanged: 137:54 etc. = 55:41 / 55:45 / 55:49 /
 * 55:53): one soft four-point star and two particles.
 */
export type BgVariant = "signature-blue" | "ocean-blue" | "soft-violet" | "periwinkle" | "warm-violet" | CoverBg;
/** Cover-only test variants (Nov 2026): darker grounds for bird + type contrast. */
export type CoverBg = "cover-indigo" | "cover-soft";

/**
 * The refined gradients (Figma 137:51, "Gentle Atmosphere — Refined Gradients",
 * Nov 2026): the same four variants with a smooth, gradual highlight instead of
 * the earlier band. Each is one vertical linear gradient (180°) with 34 stops at
 * these positions (%) — every 3.125 %, plus 35 %. Read from the frames' Base
 * Gradient layers (137:53, 137:60, 137:67, 137:74); not approximated.
 */
export const GA_GRID = [
  0, 3.125, 6.25, 9.375, 12.5, 15.625, 18.75, 21.875, 25, 28.125, 31.25, 34.375, 35, 37.5, 40.625, 43.75, 46.875, 50, 53.125,
  56.25, 59.375, 62.5, 65.625, 68.75, 71.875, 75, 78.125, 81.25, 84.375, 87.5, 90.625, 93.75, 96.875, 100,
] as const;
/** Stops the background layer draws (and transitions) — the refined grid's length. */
export const GA_STOP_COUNT = GA_GRID.length;
/** The earlier four-stop positions, still used by the variants that were not refined. */
export const BG_STOPS = [0, 35, 75, 100] as const;

export interface BgVariantDef {
  name: string;
  figma: string;
  /** Stop colours, top → bottom. */
  stops: readonly string[];
  /** Stop positions (%), one per colour. */
  at: readonly number[];
  /** Own decoration layer (the frame's exported SVG), in place of the shared star + particles. */
  decorSrc?: string;
}

export const BG_VARIANTS: Record<BgVariant, BgVariantDef> = {
  "signature-blue": {
    name: "Signature Blue",
    figma: "137:53",
    at: GA_GRID,
    stops: [
      "#191b80", "#1b1f85", "#1d238a", "#1f268f", "#202a94", "#222d99", "#24319e", "#2635a3", "#2839a8", "#2a3dad", "#2d41b2", "#2f46b7",
      "#3047b8", "#334bbc", "#3752c1", "#3d5ac7", "#4362cd", "#4a6bd3", "#5175d9", "#587ddf", "#5f86e4", "#658de9", "#6a94ec", "#6e99ef",
      "#719cf1", "#729df2", "#709bf0", "#6b94ec", "#648ae5", "#5b7fdd", "#5171d3", "#4764ca", "#3d57c1", "#354cb9",
    ],
  },
  "ocean-blue": {
    name: "Ocean Blue",
    figma: "137:60",
    at: GA_GRID,
    stops: [
      "#15458e", "#174994", "#184e9a", "#1952a1", "#1b56a7", "#1c5aae", "#1d5eb4", "#1f63ba", "#2067c0", "#226cc5", "#2471ca", "#2676ce",
      "#2777cf", "#2a7cd2", "#2f83d5", "#378bd9", "#3f94dc", "#499de0", "#53a6e3", "#5dafe6", "#67b8e8", "#70bfeb", "#78c6ec", "#7ecbee",
      "#82ceef", "#83cfef", "#80cced", "#79c3e8", "#6db7e0", "#5fa7d6", "#5096cc", "#4084c1", "#3173b6", "#2464ad",
    ],
  },
  "soft-violet": {
    name: "Soft Violet",
    figma: "137:67",
    at: GA_GRID,
    stops: [
      "#36258d", "#3a2993", "#3d2d99", "#41309f", "#4434a5", "#4838ac", "#4b3bb2", "#4f3fb8", "#5343bd", "#5747c2", "#5b4cc7", "#5f50cb",
      "#6051cc", "#6455cf", "#6a5bd3", "#7162d6", "#7969da", "#8171de", "#8979e1", "#9080e4", "#9887e7", "#9e8ee9", "#a493eb", "#a897ed",
      "#ab9aee", "#ac9bee", "#aa99ec", "#a392e8", "#9a89e1", "#8e7ed9", "#8271d0", "#7464c7", "#6858bf", "#5d4db7",
    ],
  },
  periwinkle: {
    name: "Periwinkle",
    figma: "137:74",
    at: GA_GRID,
    stops: [
      "#292d99", "#2c319d", "#2f34a2", "#3238a6", "#353bab", "#383fb0", "#3a43b4", "#3d46b9", "#414abd", "#444ec1", "#4752c5", "#4b57c9",
      "#4c58ca", "#505ccd", "#5563d1", "#5c6ad6", "#6373da", "#6b7bde", "#7284e3", "#7a8de7", "#8195ea", "#889ced", "#8da2f0", "#91a7f2",
      "#94aaf4", "#95abf4", "#93a9f3", "#8da2ef", "#8399e9", "#788ee1", "#6c81d9", "#5f74d1", "#5368c9", "#485dc2",
    ],
  },
  // "B — Warm Violet" (Figma 103:731, 412 × 852): 180°, key colours #432684 0 %,
  // #7652bc 28 %, #b69bd8 49 %, #53318c 86 % (held to the foot). Its decorations
  // (103:733: a 10 px peripheral star at 375,248 and one 4 px tonal particle at
  // 26,470) are that frame's own, exported unchanged.
  // Not in the refined Figma set (137:51), so given the same refinement (Nov 2026):
  // the same key colours and positions, with the in-between stops following the
  // curve measured from the four refined gradients: linear up to the first key,
  // eased in and out into the highlight, and leaving the highlight flat before it
  // falls (no sharp turn, so no band). Derived, not read from Figma.
  "warm-violet": {
    name: "Warm Violet",
    figma: "103:731 (refinement derived from 137:51)",
    stops: [
      "#432684", "#482a89", "#4c2e8e", "#513293", "#553598", "#5a3a9d", "#5e3da2", "#6341a7", "#6745ac", "#6c49b1", "#704db6", "#7652bc",
      "#7a56be", "#7f5cc0", "#8563c2", "#8b6ac5", "#9272c8", "#9879cb", "#9f81ce", "#a588d1", "#ab8ed3", "#af93d5", "#b397d7", "#b59ad8",
      "#b69bd8", "#b398d6", "#ab8fd0", "#9f83c7", "#9173bb", "#8162af", "#7050a3", "#614097", "#53318c", "#53318c",
    ],
    at: [
      0, 2.5, 5.0, 7.5, 10.0, 12.5, 15.0, 17.5, 20.0, 22.5, 25.0, 28,
      29.312, 30.953, 32.594, 34.234, 35.875, 37.516, 39.156, 40.797, 42.438, 44.078, 45.719, 47.359,
      49, 53.625, 58.25, 62.875, 67.5, 72.125, 76.75, 81.375, 86, 100,
    ],
    decorSrc: "/assets/backgrounds/warm-violet-decorations.svg",
  },
  // Cover tests (brief, not Figma): three colours given (top → bottom); the
  // third holds from the 75 % stop to the foot.
  "cover-indigo": { name: "Cover · Deep Indigo", figma: "brief", stops: ["#101553", "#202a91", "#364cbe", "#364cbe"], at: BG_STOPS },
  "cover-soft": { name: "Cover · Soft Blue", figma: "brief", stops: ["#171c68", "#344ab8", "#769cec", "#769cec"], at: BG_STOPS },
};

/**
 * Any variant as exactly GA_STOP_COUNT stops, so every variant is drawn — and
 * transitions — on the same registered properties. A variant already on the
 * refined grid is returned as is. A shorter one is resampled onto the grid with
 * its own stop positions swapped in for the nearest grid positions, so all its
 * corners are kept and every colour between is the same linear (sRGB) blend the
 * browser would draw: it renders exactly as its own few stops did.
 */
export function gradientStops(variant: BgVariant): { colors: string[]; at: number[] } {
  const v = BG_VARIANTS[variant];
  if (v.stops.length === GA_STOP_COUNT) return { colors: [...v.stops], at: [...v.at] };
  const at: number[] = [...GA_GRID];
  const taken = new Set<number>();
  for (const p of v.at) {
    let best = -1;
    for (let i = 0; i < at.length; i++) if (!taken.has(i) && (best < 0 || Math.abs(GA_GRID[i] - p) < Math.abs(GA_GRID[best] - p))) best = i;
    at[best] = p;
    taken.add(best);
  }
  at.sort((x, y) => x - y);
  const rgb = v.stops.map((h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16)));
  const colors = at.map((p) => {
    if (p <= v.at[0]) return rgb[0];
    if (p >= v.at[v.at.length - 1]) return rgb[rgb.length - 1];
    let j = 0;
    while (p > v.at[j + 1]) j++;
    const k = (p - v.at[j]) / (v.at[j + 1] - v.at[j]);
    return rgb[j].map((c, n) => c + (rgb[j + 1][n] - c) * k);
  });
  return { colors: colors.map((c) => `rgb(${c.map((x) => +x.toFixed(3)).join(" ")})`), at };
}

/**
 * Which cover test is live: Deep Indigo (preferred, default) or Soft Blue via
 * `?coverbg=soft`. Read once at load; the review board shows both side by side.
 */
export const COVER_BG: CoverBg =
  typeof location !== "undefined" && new URLSearchParams(location.search).get("coverbg") === "soft" ? "cover-soft" : "cover-indigo";

/**
 * Decorations, in reference-frame units (412 × 852), all white.
 * `opacity` is the Figma value; `twinkle` is a very small opacity breath around
 * it (no movement, no scale) with its own period and phase. Each can be turned
 * off on its own via StoryBackground's `decorations` prop.
 */
export type DecorId = "star" | "particle1" | "particle2";
export const BG_FRAME = { w: 412, h: 852 } as const;
export const BG_DECOR: Record<DecorId, { x: number; y: number; w: number; h: number; opacity: number; twinkle: { low: number; period: number; delay: number } }> = {
  // 55:55 "Soft four-point star", opacity 0.28
  star: { x: 363, y: 196, w: 12, h: 12, opacity: 0.28, twinkle: { low: 0.16, period: 4.6, delay: 0 } },
  // 55:57 "Particle 01", r 2, opacity 0.18
  particle1: { x: 29, y: 485, w: 4, h: 4, opacity: 0.18, twinkle: { low: 0.1, period: 5.4, delay: 1.3 } },
  // 55:58 "Particle 02", r 3, opacity 0.14
  particle2: { x: 378, y: 720, w: 6, h: 6, opacity: 0.14, twinkle: { low: 0.08, period: 6.2, delay: 2.4 } },
};
/** The star's path, verbatim from 55:55 (in its 12 × 12 box, origin 363, 196). */
export const STAR_PATH = "M6 0C6 4 8 6 12 6C8 6 6 8 6 12C6 8 4 6 0 6C4 6 6 4 6 0Z";

/**
 * Which background each screen sits on. Change a screen's background here only;
 * screen components never pick their own. `banner` is the 00 Home entry banner.
 */
export const SCREEN_BACKGROUND: Record<Slide["id"] | "banner", BgVariant> = {
  banner: "signature-blue", // 00 Home banner
  cover: COVER_BG, // 01 — under test: Deep Indigo (default) / Soft Blue (?coverbg=soft)
  study: "ocean-blue", // 02
  live: "signature-blue", // 03
  teacher: "soft-violet", // 04 (P0 only if data is launch-ready)
  quiz: "ocean-blue", // 05
  video: "signature-blue", // 06
  subject: "soft-violet", // 07
  peakDay: "ocean-blue", // 08
  learnerType: "warm-violet", // 09 (Figma 103:731)
  marksheet: "periwinkle", // 10
  close: "signature-blue", // 11
  freshCover: "periwinkle", // Fresh Start
  freshClose: "periwinkle", // Fresh Start
};

/**
 * Background colour transition length (s), keyed by how the story moved — not by
 * which screens, so it works between any two screens the eligibility logic
 * produces. It runs alongside the screen transition and stays secondary to it.
 */
export function bgTransition(kind: Entry["kind"], reduced: boolean) {
  // Per hand-over kind (motion/handovers.ts): drifts under each hand-over; ordinary steps 0.6 s,
  // a little longer than the page turn, so it reads as atmosphere; reduced motion 0.3 s.
  return bgDuration(kind, reduced);
}
