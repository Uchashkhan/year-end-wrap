import type { Slide } from "../data/compose";
import { ANSWER, WATCH, FLOW, FOCUS, SKY_HANDOFF, type Entry } from "./entry";

/**
 * "Gentle Atmosphere" — the Wrap 2026 background system.
 * Source of truth: Figma th2CA9ugtc2BZixN4UBH3Z, section 55:38 (frames 55:39,
 * 55:43, 55:47, 55:51; reference frame 412 × 852). Every value below is read
 * from those frames; nothing is approximated from screenshots.
 *
 * Each variant is one vertical linear gradient (180°) with four stops at
 * 0 / 35 / 75 / 100 %. All four frames carry the identical decoration layer
 * (55:41 / 55:45 / 55:49 / 55:53): one soft four-point star and two particles.
 */
export type BgVariant = "signature-blue" | "ocean-blue" | "soft-violet" | "periwinkle" | CoverBg;
/** Cover-only test variants (Nov 2026): darker grounds for bird + type contrast. */
export type CoverBg = "cover-indigo" | "cover-soft";

/** Stop positions (%), shared by every variant. */
export const BG_STOPS = [0, 35, 75, 100] as const;

export const BG_VARIANTS: Record<BgVariant, { name: string; figma: string; stops: [string, string, string, string] }> = {
  "signature-blue": { name: "Signature Blue", figma: "55:40", stops: ["#191b80", "#3047b8", "#729df2", "#354cb9"] },
  "ocean-blue": { name: "Ocean Blue", figma: "55:44", stops: ["#15458e", "#2777cf", "#83cfef", "#2464ad"] },
  "soft-violet": { name: "Soft Violet", figma: "55:48", stops: ["#36258d", "#6051cc", "#ac9bee", "#5d4db7"] },
  periwinkle: { name: "Periwinkle", figma: "55:52", stops: ["#292d99", "#4c58ca", "#95abf4", "#485dc2"] },
  // Cover tests (brief, not Figma): three colours given (top → bottom); the
  // third holds from the 75 % stop to the foot.
  "cover-indigo": { name: "Cover · Deep Indigo", figma: "brief", stops: ["#101553", "#202a91", "#364cbe", "#364cbe"] },
  "cover-soft": { name: "Cover · Soft Blue", figma: "brief", stops: ["#171c68", "#344ab8", "#769cec", "#769cec"] },
};

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
  learnerType: "soft-violet", // 09
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
  if (reduced) return 0.3;
  if (kind === "sky") return SKY_HANDOFF.bgDur; // drifts under the whole hand-over
  if (kind === "flow") return FLOW.out; // with the clock's drop
  if (kind === "focus") return FOCUS.beam.at + FOCUS.beam.dur; // under the room dimming and the beam opening
  if (kind === "answer") return ANSWER.out;
  if (kind === "watch") return WATCH.out;
  if (kind === "takeover") return 0.8; // under the field's pass // blue → signature blue while the underline hands over // violet → blue while the spotlight hands over
  return 0.6; // ordinary steps: a little longer than the page turn, so it reads as atmosphere
}
