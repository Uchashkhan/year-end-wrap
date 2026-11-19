/**
 * Shared geometry for 01 Cover → 02 Study Time (M3, PROPOSED).
 *
 * One small set of flat primitives — a dome (circle rising from the bottom) and
 * a moon (a smaller circle) — is used by both screens, so the cover can hand its
 * shapes to Study Time instead of cutting away. Every value is a fraction of the
 * story frame (W = width, H = height). CSS uses the same numbers in cqw/cqh, and
 * the transition code uses them in px, so the two always line up.
 */
export const GEO = {
  /** Yellow dome on the cover: a 1.5W circle, centred, top edge at 52% of the height. */
  dome: { d: 1.5, top: 0.52 },
  /** Magenta moon on the cover: rests on the dome's shoulder, the year overprints it. */
  moonCover: { d: 0.46, left: 0.62, topH: 0.52, topW: -0.44 },
  /** The same moon on Study Time: larger, top-right, the number overlaps it. */
  moonStudy: { d: 0.52, left: 0.62, topH: 0.13, topW: 0 },
} as const;

export interface Frame {
  W: number;
  H: number;
}

/** Dome circle in px: centre and radius. The cover→study wipe starts exactly here. */
export function domeCircle({ W, H }: Frame) {
  const r = (GEO.dome.d * W) / 2;
  return { cx: W / 2, cy: GEO.dome.top * H + r, r };
}

/** Radius that covers the whole frame from the dome centre. */
export function coverRadius(f: Frame) {
  const { cx, cy } = domeCircle(f);
  return Math.ceil(Math.max(Math.hypot(cx, cy), Math.hypot(f.W - cx, cy)) + 2);
}

type Moon = { d: number; left: number; topH: number; topW: number };
export function moonBox(m: Moon, { W, H }: Frame) {
  return { size: m.d * W, x: m.left * W, y: m.topH * H + m.topW * W };
}
