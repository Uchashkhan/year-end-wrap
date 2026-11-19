import { COPY } from "../data/copy";
import type { ScreenProps } from "../screens/types";
import { classLine, nameTier } from "./shared";
import "./covers.css";

/**
 * A · Typographic Impact.
 * The year is the architecture of the screen: ২০ and ২৬ stacked at poster
 * scale, each cropped by a different edge so the layout tilts without tilting
 * anything. One magenta overprint slab sits under ২৬. The name is set big and
 * white in the calm lower third, where nothing competes with it.
 */
export function CoverTypographic({ slide }: ScreenProps<"cover">) {
  const cls = classLine(slide);
  return (
    <div className={`slide cxa cx-n-${nameTier(slide.name)}${slide.name ? "" : " cxa-anon"}`}>
      <img className="cxa-logo" src="/assets/brand/shikho-logo-white.png" alt="Shikho" />
      <p className="cxa-head">{COPY.cover.headline}</p>
      <p className="cxa-year" role="img" aria-label={COPY.cover.year}>
        <span className="cxa-y1" aria-hidden="true">
          ২০
        </span>
        <span className="cxa-y2" aria-hidden="true">
          <span className="cxa-slab" />
          <span className="cxa-y2-t">২৬</span>
        </span>
      </p>
      <div className="cxa-id">
        {slide.name && <h1 className="cxa-name">{slide.name}</h1>}
        {cls && <p className="cxa-class">{cls}</p>}
        <p className="cxa-support">{COPY.cover.support}</p>
      </div>
    </div>
  );
}
