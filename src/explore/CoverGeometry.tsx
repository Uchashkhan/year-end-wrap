import { COPY } from "../data/copy";
import type { ScreenProps } from "../screens/types";
import { classLine, nameTier } from "./shared";
import "./covers.css";

const DIGITS = ["২", "০", "২", "৬"] as const;

/**
 * B · Playful Geometry.
 * The year is built as a 2×2 set of brand-coloured shapes, one digit each.
 * Rhythm: the two leaves (blue, teal) point into the centre, the two circles
 * (yellow, magenta) sit on the other diagonal. Depth is a flat, hard offset in
 * each colour's own darker step, like stacked paper cut-outs. Nothing is
 * rotated, blurred or rendered "3D".
 */
export function CoverGeometry({ slide }: ScreenProps<"cover">) {
  const cls = classLine(slide);
  return (
    <div className={`slide cxb cx-n-${nameTier(slide.name)}${slide.name ? "" : " cxb-anon"}`}>
      {/* One logo rule across directions: white wordmark on dark grounds, colour logo on light. */}
      <img className="cxb-logo" src="/assets/brand/shikho-logo-white.png" alt="Shikho" />
      <p className="cxb-head">{COPY.cover.headline}</p>
      <div className="cxb-grid" role="img" aria-label={COPY.cover.year}>
        {DIGITS.map((d, i) => (
          <span key={i} className={`cxb-t cxb-t${i + 1}`} aria-hidden="true">
            <span className="cxb-d">{d}</span>
          </span>
        ))}
      </div>
      <div className="cxb-id">
        {slide.name && <h1 className="cxb-name">{slide.name}</h1>}
        {cls && <p className="cxb-class">{cls}</p>}
      </div>
      <p className="cxb-support">{COPY.cover.support}</p>
    </div>
  );
}
