import { COPY } from "../data/copy";
import type { ScreenProps } from "../screens/types";
import { nameTier } from "./shared";
import "./covers.css";

/**
 * C · Editorial Celebration.
 * A magazine cover with the student as the cover star: their name is the
 * headline, set huge in Primary 900 on a light ground, with the Shikho logo as
 * the masthead and real negative space between them. The lower part is flat
 * colour blocks, each holding exactly one thing: magenta = শিখোতে তোমার ২০২৬,
 * yellow = the invitation line, blue = class and group. Blocks run edge to
 * edge; their seams are the only lines on the page.
 */
export function CoverEditorial({ slide }: ScreenProps<"cover">) {
  return (
    <div className={`slide cxc cx-n-${nameTier(slide.name)} ${slide.name ? "" : "cxc-anon"}`}>
      <div className="cxc-top">
        <img className="cxc-mast" src="/assets/brand/shikho-logo.svg" alt="Shikho" />
        {slide.name && <h1 className="cxc-name">{slide.name}</h1>}
      </div>
      <div className="cxc-blocks">
        <div className="cxc-b cxc-year">
          <p className="cxc-head">{COPY.cover.headline}</p>
          <p className="cxc-y">{COPY.cover.year}</p>
        </div>
        <div className="cxc-b cxc-say">
          <p>{COPY.cover.support}</p>
        </div>
        {/* Class and group each on their own line; no class data → the yellow block spans. */}
        {(slide.className || slide.group) && (
          <div className="cxc-b cxc-cls">
            {slide.className && <span>{slide.className}</span>}
            {slide.group && <span>{slide.group}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
