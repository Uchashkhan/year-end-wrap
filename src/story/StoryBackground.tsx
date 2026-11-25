import type { CSSProperties } from "react";
import { BG_DECOR, BG_FRAME, BG_VARIANTS, STAR_PATH, gradientStops, type BgVariant, type DecorId } from "./background";
import "../styles/gentle-atmosphere.css";

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(4)}%`;
const ALL: DecorId[] = ["star", "particle1", "particle2"];

/**
 * Gentle Atmosphere background (Figma 55:38). One element, independent of any
 * foreground: a vertical four-stop gradient plus three decorations.
 *
 * Variant changes interpolate every gradient stop (colour and position) in place (registered
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
  const v = BG_VARIANTS[variant];
  // One colour and one position property per stop (the refined grid, 34): a variant change
  // interpolates each stop in place (gentle-atmosphere.css).
  const g = gradientStops(variant);
  const style = { "--ga-dur": `${transition}s` } as Record<string, string>;
  g.colors.forEach((c, i) => {
    style[`--ga-${i}`] = c;
    style[`--ga-p${i}`] = `${g.at[i]}%`;
  });
  // A variant with its own decoration layer shows it in place of the shared
  // star + particles; the two cross-fade with the colours (both stay mounted).
  const own = v.decorSrc;
  const ownSrcs = [...new Set(Object.values(BG_VARIANTS).flatMap((x) => (x.decorSrc ? [x.decorSrc] : [])))];
  return (
    <div className={`ga ${still ? "ga-still" : ""} ${className}`} data-bg={variant} style={style as CSSProperties} aria-hidden="true">
      {ownSrcs.map((src) => (
        <img key={src} className="ga-decor-layer" src={src} alt="" draggable={false} style={{ opacity: own === src ? 1 : 0 }} />
      ))}
      <div className="ga-shared" style={{ opacity: own ? 0 : 1 }}>
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
    </div>
  );
}
