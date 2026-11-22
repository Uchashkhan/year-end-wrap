/**
 * Digit geometry for the Cover (screens/CoverFigma.tsx): the opening pose of the
 * four corner digits (clusterYear). The old Cover → 02 regroup (assembleYear)
 * was removed on Nov 22: the digits now leave outward from their corners.
 */
export type DigitMove = {
  x: number;
  y: number;
  scale: number;
  rotate: number;
};

const MEASURE_PX = 100;

/**
 * The cover's OPENING pose: ২০২৬ as one compact 2 × 2 cluster in the centre —
 * white ২ ০ on top, magenta ২ ৬ below — upright, one size, each row on one
 * baseline, tight even gaps between ink. Returns, per digit, the .cf-float
 * transform that puts it there from its resting corner; the entrance then
 * animates each float back to identity (its approved corner, tilted).
 * `scale` > 1 makes the cluster slightly larger than the corners, so the digits
 * ease down in size as they move out. Measured from canvas ink
 * metrics + the glyph's live position), with no composition transform.
 */
export function clusterYear(root: HTMLElement, tilts: number[], opts: { scale: number; gap: number; lift: number }): DigitMove[] | null {
  const floats = [...root.querySelectorAll<HTMLElement>(".cf-float")];
  const glyphs = [...root.querySelectorAll<HTMLElement>(".cf-glyph")];
  if (floats.length !== 4 || glyphs.length !== 4) return null;
  // Measure from the resting corners: a previous run (React dev re-runs the
  // effect) may already have moved the digits.
  floats.forEach((f) => (f.style.transform = "none"));
  const frame = root.getBoundingClientRect();
  const cs = getComputedStyle(glyphs[0]);
  const fontPx = parseFloat(cs.fontSize);
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return null;
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${MEASURE_PX}px ${cs.fontFamily}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const met = glyphs.map((g) => {
    const m = ctx.measureText(g.textContent ?? "");
    const inkL = -m.actualBoundingBoxLeft;
    const inkR = m.actualBoundingBoxRight;
    return {
      adv: m.width,
      inkW: inkR - inkL,
      inkC: (inkL + inkR) / 2,
      a: m.actualBoundingBoxAscent,
      d: m.actualBoundingBoxDescent,
      // the text box (what a Range measures) is the font's content area
      boxCy: (m.fontBoundingBoxDescent - m.fontBoundingBoxAscent) / 2,
    };
  });
  const scale = opts.scale;
  const f = (fontPx * scale) / MEASURE_PX; // measure px → screen px at cluster size
  const avgInk = met.reduce((s, m) => s + m.inkW, 0) / 4;
  const gap = opts.gap * avgInk;
  const cx = frame.left + frame.width / 2;
  // Rows: [0,1] on top, [2,3] below; each row centred on its ink, one baseline.
  const rows = [
    [0, 1],
    [2, 3],
  ];
  const inkCx: number[] = [];
  rows.forEach(([a, b]) => {
    const w = met[a].inkW + gap + met[b].inkW;
    inkCx[a] = -w / 2 + met[a].inkW / 2;
    inkCx[b] = w / 2 - met[b].inkW / 2;
  });
  const asc = rows.map((r) => Math.max(...r.map((i) => met[i].a)));
  const desc = rows.map((r) => Math.max(...r.map((i) => met[i].d)));
  // Baselines (measure px): row 2 sits one gap under row 1's ink.
  const b1 = 0;
  const b2 = b1 + desc[0] + gap + asc[1];
  const top = b1 - asc[0];
  const bottom = b2 + desc[1];
  const midY = (top + bottom) / 2;
  const cy = frame.top + frame.height / 2 - opts.lift * frame.height;

  return glyphs.map((g, i) => {
    const row = i < 2 ? 0 : 1;
    const base = row === 0 ? b1 : b2;
    const range = document.createRange();
    range.selectNodeContents(g);
    const p = range.getBoundingClientRect();
    const px = p.left + p.width / 2;
    const py = p.top + p.height / 2;
    // Target text-box centre (screen px).
    const tx = cx + (inkCx[i] - met[i].inkC + met[i].adv / 2) * f;
    const ty = cy + (base + met[i].boxCy - midY) * f;
    const textW = met[i].adv * (fontPx / MEASURE_PX);
    const ox = (textW - g.offsetWidth) / 2;
    const th = (tilts[i] * Math.PI) / 180;
    const curOx = ox * Math.cos(th);
    const curOy = ox * Math.sin(th);
    const endOx = ox * scale;
    const dx = tx - endOx - (px - curOx);
    const dy = ty - (py - curOy);
    return { x: dx, y: dy, scale, rotate: -tilts[i] };
  });
}
