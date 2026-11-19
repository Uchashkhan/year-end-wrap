import type { CSSProperties } from "react";
import { BG_DECOR, BG_FRAME, BG_VARIANTS, STAR_PATH, type BgVariant, type DecorId } from "./background";
import "../styles/gentle-atmosphere.css";

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(4)}%`;
const ALL: DecorId[] = ["star", "particle1", "particle2"];

/**
 * Gentle Atmosphere background (Figma 55:38). One element, independent of any
 * foreground: a vertical four-stop gradient plus three decorations.
 *
 * Variant changes interpolate the four gradient colours in place (registered
 * CSS colour properties), so it can go from any variant to any other, mid-way
 * changes continue from where they are, and nothing remounts — the decorations'
 * twinkle never restarts. `transition` is the colour transition length (s).
 *
 * Responsive: decorations sit at their Figma position as a share of the frame
 * (x of the width, y of the height) and are sized from the width, so the layout
 * holds at any phone size, and inside a smaller container (the home banner).
 *
 * Usage
 *   <StoryBackground variant="ocean-blue" />                     full-bleed layer
 *   <StoryBackground variant="…" decorations={["star"]} />        only some decorations
 *   <StoryBackground variant="…" still />                         no twinkle (reduced motion)
 */
export function StoryBackground({
  variant,
  transition = 0.6,
  still = false,
  decorations = ALL,
  className = "",
}: {
  variant: BgVariant;
  transition?: number;
  still?: boolean;
  decorations?: DecorId[];
  className?: string;
}) {
  const [c0, c1, c2, c3] = BG_VARIANTS[variant].stops;
  const style = { "--ga-0": c0, "--ga-1": c1, "--ga-2": c2, "--ga-3": c3, "--ga-dur": `${transition}s` } as CSSProperties;
  return (
    <div className={`ga ${still ? "ga-still" : ""} ${className}`} data-bg={variant} style={style} aria-hidden="true">
      {decorations.map((id) => {
        const d = BG_DECOR[id];
        const s = {
          left: pct(d.x, BG_FRAME.w),
          top: pct(d.y, BG_FRAME.h),
          "--ga-w": d.w,
          "--ga-hi": d.opacity,
          "--ga-lo": d.twinkle.low,
          "--ga-period": `${d.twinkle.period}s`,
          "--ga-delay": `${-d.twinkle.delay}s`,
        } as CSSProperties;
        return id === "star" ? (
          <svg key={id} className="ga-decor ga-star" viewBox="0 0 12 12" style={s}>
            <path d={STAR_PATH} />
          </svg>
        ) : (
          <span key={id} className="ga-decor ga-particle" style={s} />
        );
      })}
    </div>
  );
}
