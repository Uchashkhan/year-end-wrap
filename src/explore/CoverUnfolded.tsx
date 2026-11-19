import type { CSSProperties } from "react";
import { COPY } from "../data/copy";
import type { ScreenProps } from "../screens/types";
import { classLine, nameTier } from "./shared";
import "./unfolded.css";

/**
 * YOUR YEAR, UNFOLDED — Screen 01, single art-directed cover (M2d, static).
 *
 * One hero object: an accordion-folded magenta sheet with ২০২৬ printed across
 * it. It is still pleated at the lower-left and opens, fold by fold, toward the
 * upper-right, where its last flat panel runs off the edge. Read left→right it
 * is the year being unfolded: the first ২ is creased and foreshortened, the ৬
 * lies flat and full size.
 *
 * Depth comes only from the fold itself — each face is foreshortened (scaleX)
 * and sheared (skewY) so the sheet's edges zig-zag, and faces turned away from
 * the light take the darker DS step of the same colour. No shadows, no blur,
 * no 3D transforms: every face is a flat 2D affine of one printed sheet, so the
 * numerals stay continuous across the creases.
 */

// Flat sheet, in SVG user units. Panels are equal width on the flat sheet (a real accordion).
const P = 100;
const H = 236;
// Opening sequence, folded end → open end: foreshortening per face. 1 = lying flat.
// The first three faces are blank pleats — the part of the sheet not yet opened.
// The last face lies flat and is two panels wide, so no crease cuts the ৬.
const OPEN = [0.16, 0.2, 0.26, 0.42, 0.58, 0.74, 0.88, 1];
const span = (i: number) => (i === OPEN.length - 1 ? 2 * P : P);
const W = P * (OPEN.length + 1);
// Year placement on the flat sheet. Natural advance at 232 is ~551; textLength only opens the
// spacing a hair (never squeezes), so glyphs keep their shapes and never touch.
const YEAR = { x: 306, w: 558, base: 192, size: 232 };

interface Face {
  i: number;
  a: number;
  w: number;
  m: string;
  lit: boolean;
}

/** Flat-sheet x-range → screen: foreshorten by s, shear by the face's depth slope, chain the edges. */
function faces(): { faces: Face[]; width: number } {
  let X = 0;
  let Y = 0;
  const out: Face[] = [];
  OPEN.forEach((s, i) => {
    const a = i * P;
    const w = span(i);
    const dir = i % 2 === 0 ? 1 : -1; // pleats alternate toward / away from the viewer
    const dy = dir * w * Math.sqrt(1 - s * s) * (i < 3 ? 0.4 : 0.55); // depth shows as vertical travel; closed pleats stay compact
    const k = dy / w;
    const e = X - s * a;
    const f = Y - k * a;
    out.push({ i, a, w, m: `matrix(${s} ${k} 0 1 ${e.toFixed(2)} ${f.toFixed(2)})`, lit: dir < 0 || s === 1 });
    X += s * w;
    Y += dy;
  });
  return { faces: out, width: X };
}

const SHEET = faces();
const PAD = 60; // room for the zig-zag above and below the flat sheet
const VH = H + 2 * PAD;

function Sheet({ label }: { label: string }) {
  return (
    <svg
      className="cxu-sheet"
      viewBox={`0 ${-PAD} ${SHEET.width} ${VH}`}
      style={{ "--half": (VH / SHEET.width / 2).toFixed(4) } as CSSProperties}
      role="img"
      aria-label={label}
      preserveAspectRatio="xMinYMid meet"
    >
      <defs>
        {SHEET.faces.map((f) => (
          <clipPath key={f.i} id={`cxu-f${f.i}`} clipPathUnits="userSpaceOnUse">
            {/* 1.2-unit overlap hides hairline seams between faces */}
            <rect x={f.a - 0.6} y={0} width={f.w + 1.2} height={H} />
          </clipPath>
        ))}
      </defs>
      <g className="cxu-tilt">
        {SHEET.faces.map((f) => (
          <g key={f.i} transform={f.m} className={f.lit ? "cxu-lit" : "cxu-turn"}>
            <g clipPath={`url(#cxu-f${f.i})`}>
              <rect className="cxu-paper" x={0} y={0} width={W} height={H} />
              <text className="cxu-ink" x={YEAR.x} y={YEAR.base} fontSize={YEAR.size} textLength={YEAR.w} lengthAdjust="spacing">
                {label}
              </text>
            </g>
          </g>
        ))}
      </g>
    </svg>
  );
}

export function CoverUnfolded({ slide }: ScreenProps<"cover">) {
  const cls = classLine(slide);
  return (
    <div className={`slide cxu cx-n-${nameTier(slide.name)} ${slide.name ? "" : "cxu-anon"}`}>
      <img className="cxu-logo" src="/assets/brand/shikho-logo-white.png" alt="Shikho" />
      <p className="cxu-head">{COPY.cover.headline}</p>
      <Sheet label={COPY.cover.year} />
      <div className="cxu-id">
        {slide.name && <h1 className="cxu-name">{slide.name}</h1>}
        {cls && <p className="cxu-class">{cls}</p>}
        <p className="cxu-support">{COPY.cover.support}</p>
      </div>
    </div>
  );
}
