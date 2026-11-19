/**
 * Geometry for Cover → Screen 02: where each of the four ORIGINAL corner digits
 * must travel so they stand side by side in one straight horizontal row
 * (tl ২ → 1st, tr ০ → 2nd, bl ২ → 3rd, br ৬ → 4th). Nothing is re-typeset: the
 * row is laid out from the digits themselves.
 *
 * Measured from the live DOM at the moment of navigation:
 *  - source: each glyph's actual rendered centre (a Range over its text, so
 *    float offsets, the composition's transform and the 27.25° tilt are all
 *    included);
 *  - row: every digit ends at the SAME font size (one scale) and the same line
 *    box centre, so all four share one baseline. Spacing is set between the
 *    digits' visible ink (canvas text metrics), with one equal gap, so they read
 *    as four separate objects in a row, never kerned into a word and never
 *    overlapping. The row spans ROW of the frame width, centred.
 * The animated layer is .cf-float (it wraps the glyph, which keeps its CSS
 * tilt). Its own rotate = −tilt straightens the glyph; scale = target size /
 * current size. Scale/rotate pivot on the float box centre, which is not the
 * text centre for the ৬ (left-set in a fixed 207-unit Figma box), so the
 * translation is corrected by that offset and every digit lands exactly.
 */
export type DigitMove = {
  x: number;
  y: number;
  scale: number;
  rotate: number;
};

/** Row width (outer ink edges) as a share of the frame width. */
const ROW = 0.8;
/** Gap between neighbouring digits' ink, as a share of the average ink width. */
const GAP = 0.32;
const MEASURE_PX = 100;

export function assembleYear(root: HTMLElement, tilts: number[]): DigitMove[] | null {
  const floats = [...root.querySelectorAll<HTMLElement>(".cf-float")];
  const glyphs = [...root.querySelectorAll<HTMLElement>(".cf-glyph")];
  const container = root.querySelector<HTMLElement>(".cf-digits");
  if (floats.length !== 4 || glyphs.length !== 4 || !container) return null;

  const frame = root.getBoundingClientRect();
  const k = new DOMMatrix(getComputedStyle(container).transform).a || 1; // composition scale (1 once settled)
  const cs = getComputedStyle(glyphs[0]);
  const fontPx = parseFloat(cs.fontSize);

  // Each digit's advance and visible ink, in its own face and weight.
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return null;
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${MEASURE_PX}px ${cs.fontFamily}`;
  ctx.textAlign = "left";
  const met = glyphs.map((g) => {
    const m = ctx.measureText(g.textContent ?? "");
    const inkL = -m.actualBoundingBoxLeft;
    const inkR = m.actualBoundingBoxRight;
    return { adv: m.width, inkW: inkR - inkL, inkC: (inkL + inkR) / 2 };
  });
  const avgInk = met.reduce((a, d) => a + d.inkW, 0) / 4;
  const gap = GAP * avgInk;
  const rowM = met.reduce((a, d) => a + d.inkW, 0) + 3 * gap; // measure px
  const r = (ROW * frame.width) / rowM; // measure px → target px
  const scale = (MEASURE_PX * r) / fontPx;
  const cx = frame.left + frame.width / 2;
  const cy = frame.top + frame.height / 2;

  // Ink-box centres along the row (measure px, from the row's left ink edge).
  let run = 0;
  const inkCentres = met.map((d) => {
    const c = run + d.inkW / 2;
    run += d.inkW + gap;
    return c;
  });

  return glyphs.map((g, i) => {
    // Where the text is now (screen px).
    const range = document.createRange();
    range.selectNodeContents(g);
    const p = range.getBoundingClientRect();
    const px = p.left + p.width / 2;
    const py = p.top + p.height / 2;
    // Where the text box centre must end (screen px): ink centre in the row,
    // shifted by the ink's offset inside the glyph's advance box.
    const boxC = inkCentres[i] - met[i].inkC + met[i].adv / 2;
    const tx = cx + (boxC - rowM / 2) * r;
    const ty = cy; // one line-box centre for all four = one baseline
    // Text centre offset from the pivot, in the glyph's unrotated frame (px).
    const textW = met[i].adv * (fontPx / MEASURE_PX);
    const ox = (textW - g.offsetWidth) / 2; // text is left-set in its box; ~0 when the box hugs the text
    const th = (tilts[i] * Math.PI) / 180;
    // Current offset as rendered (rotated by the tilt, scaled by the composition).
    const curOx = ox * Math.cos(th) * k;
    const curOy = ox * Math.sin(th) * k;
    // After the move the offset is upright and scaled: s·o.
    const endOx = ox * scale * k;
    const dx = tx - endOx - (px - curOx);
    const dy = ty - (py - curOy);
    const cur = new DOMMatrix(getComputedStyle(floats[i]).transform);
    return { x: cur.e + dx / k, y: cur.f + dy / k, scale, rotate: -tilts[i] };
  });
}
