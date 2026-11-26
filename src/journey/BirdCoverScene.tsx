import type { ReactNode, RefObject } from "react";
import { COPY } from "../data/copy";
import "../styles/journey.css";

/** The years the bird climbs through; ২০২৬ (index 6) is the landing. */
export const YEARS = ["২০২০", "২০২১", "২০২২", "২০২৩", "২০২৪", "২০২৫", "২০২৬"];
export const DIGITS = [
  { id: "tl", ch: "২" },
  { id: "tr", ch: "০" },
  { id: "bl", ch: "২" },
  { id: "br", ch: "৬" },
] as const;
export const MARKER_INK = "#3b2f9e";
export const FINAL_INK = ["#ffffff", "#ffffff", "#e2008d", "#e2008d"];

/** Reference 01's clouds (Figma px, 412 frame), plus recycled copies waiting above the frame. */
export const CLOUDS = [
  { src: "cloud1", x: -42, y: 181, w: 178, h: 73, depth: 1 },
  { src: "cloud2", x: -13, y: 476, w: 120, h: 55, depth: 0.78 },
  { src: "cloud3", x: 358, y: 363, w: 91, h: 40, depth: 0.58 },
  { src: "cloud3", x: 300, y: -140, w: 91, h: 40, depth: 0.62 },
  { src: "cloud1", x: 262, y: -430, w: 178, h: 73, depth: 1.05 },
  { src: "cloud2", x: -40, y: -700, w: 120, h: 55, depth: 0.8 },
] as const;

interface Props {
  root: RefObject<HTMLDivElement | null>;
  className?: string;
  flying: boolean;
  bird: ReactNode;
  rig?: ReactNode;
  air: ReactNode;
  lockCta?: boolean;
  onNext: () => void;
  onSkip: () => void;
}

export function BirdCoverScene({ root, className = "", flying, bird, rig, air, lockCta, onNext, onSkip }: Props) {
  return (
    <div
      ref={root}
      className={`slide bj ${className} ${flying ? "is-flying" : ""}`}
      onKeyDown={lockCta ? (event) => {
        if (event.key === " " && event.target instanceof HTMLButtonElement) event.stopPropagation();
      } : undefined}
    >
      {/* the flight's world (Reference 01) */}
      <div className="bj-sky" aria-hidden="true" />
      <img className="bj-decor" src="/assets/journey/cover-decorations.svg" alt="" aria-hidden="true" />
      {/* the approved cover's contrast for the centre (CoverFigma .cf-scrim) */}
      <i className="bj-scrim" aria-hidden="true" />
      <div className="bj-years" aria-hidden="true">
        {YEARS.map((y, i) => (
          <span key={y} className={`bj-yr bj-yr-${i}`}>
            {i === 6
              ? [...y].map((d, k) => (
                  <span key={k} className="bj-yr-d">
                    {d}
                  </span>
                ))
              : y}
          </span>
        ))}
      </div>

      {/* Reference 02's year digits */}
      <div className="bj-digits" aria-hidden="true">
        {DIGITS.map((d) => (
          <div key={d.id} className={`bj-dg bj-dg-${d.id}`}>
            <div className="bj-dgm">
              <div className="bj-float">
                <span className="bj-glyph">{d.ch}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bj-clouds" aria-hidden="true">
        {CLOUDS.map((c, i) => (
          <span key={i} className="bj-cloud">
            <img src={`/assets/journey/${c.src}.svg`} alt="" />
          </span>
        ))}
        <span className="bj-cloud bj-bank">
          <img src="/assets/journey/bank.svg" alt="" />
        </span>
      </div>
      {air}

      {/* Reference 02's centred stack: the resting bird, the title, the support line */}
      <div className="bj-center">
        {/* the approved cover's faint cool light behind the mascot (CoverFigma .cf-bird-light) */}
        <i className="bj-bird-light" aria-hidden="true" />
        <div className="bj-slot" aria-hidden="true">
          {bird}
        </div>
        <div className="bj-copy">
          <h1 className="bj-title" aria-label={`${COPY.cover.headline} ${COPY.cover.year}`}>
            <span className="bj-mask bj-head" aria-hidden="true">
              <span>{COPY.cover.headline}</span>
            </span>
            <span className="bj-mask bj-year" aria-hidden="true">
              <span>{COPY.cover.year}</span>
            </span>
          </h1>
          <p className="bj-support">{COPY.cover.support}</p>
        </div>
      </div>

      {rig}

      <button type="button" className="bj-cta" disabled={lockCta && flying} data-no-nav onClick={onNext}>
        <span className="bj-cta-label">{COPY.cover.start}</span>
        <span className="bj-cta-btn" aria-hidden="true">
          {/* the approved cover's arrow: shaft and head from the same asset, so the shaft can stretch */}
          <span className="bj-arrow">
            <img className="bj-arrow-shaft" src="/assets/cover/arrow-left.svg" alt="" width={22} height={22} />
            <img className="bj-arrow-head" src="/assets/cover/arrow-left.svg" alt="" width={22} height={22} />
          </span>
        </span>
      </button>

      {flying && <button type="button" className="bj-skip" data-no-nav aria-label="Skip the intro" onClick={onSkip} />}
    </div>
  );
}
