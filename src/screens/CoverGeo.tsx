import { useEffect } from "react";
import { stagger, useAnimate } from "motion/react";
import { COPY } from "../data/copy";
import { usePrefs } from "../lib/prefs";
import { nameTier } from "../explore/shared";
import { sequence, type Step } from "../lib/sequence";
import type { ScreenProps } from "./types";
import "../styles/wrap-geo.css";

const OUT = [0.22, 1, 0.36, 1] as const; // long, soft settle
const POP = [0.34, 1.56, 0.64, 1] as const; // one small overshoot

/**
 * 01 Cover (M3, PROPOSED) — "your year, rising".
 *
 * Primary 600 ground. A yellow dome (a 1.5×-width circle) rises from the bottom
 * and becomes the stage for the student's own line; a magenta moon sits on its
 * shoulder. ২০২৬ is set large and straight above, in white.
 * The dome and moon are the screen's transformable geometry: on → Study Time
 * the dome swells to fill the frame (it *becomes* the next ground) and the moon
 * travels to its new place. See src/screens/geometry.ts.
 *
 * Sequence (≈1.8 s, purely visual — navigation is live from frame 0):
 *   1 entry       dome rises, moon pops, mark fades
 *   2 hero        headline, then ২০২৬ digit by digit
 *   3 the student name, class, invitation
 * Reduced motion / repeat view: the settled frame, no animation.
 * No buttons (01–08 rule). Edges: no name → no name line; class/group each optional.
 */
export function CoverGeo({ slide }: ScreenProps<"cover">) {
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const cls = [slide.className, slide.group].filter(Boolean).join(" · ");

  useEffect(() => {
    if (still) return;
    const steps: Step[] = [
      [".geo-dome", { y: ["58%", "0%"] }, { duration: 0.95, ease: OUT, at: 0 }],
      [".cv-logo", { opacity: [0, 1] }, { duration: 0.4, at: 0.15 }],
      [".geo-moon", { scale: [0, 1] }, { duration: 0.6, ease: POP, at: 0.42 }],
      [".cv-head", { opacity: [0, 1], y: [14, 0] }, { duration: 0.45, ease: OUT, at: 0.3 }],
      [".cv-d", { opacity: [0, 1], y: ["60%", "0%"] }, { duration: 0.6, ease: OUT, delay: stagger(0.08), at: 0.45 }],
      [".cv-name", { opacity: [0, 1], y: [22, 0] }, { duration: 0.6, ease: OUT, at: 1.0 }],
      [".cv-class", { opacity: [0, 1], y: [8, 0] }, { duration: 0.4, ease: OUT, at: 1.22 }],
      [".cv-support", { opacity: [0, 1], y: [8, 0] }, { duration: 0.45, ease: OUT, at: 1.38 }],
    ];
    const c = sequence(scope.current, animate, steps);
    return () => c?.stop();
  }, [still, animate, scope]);

  return (
    <div
      ref={scope}
      className={`slide cv cv-n-${nameTier(slide.name)} ${slide.name ? "" : "cv-anon"} ${still ? "" : "is-pre"}`}
    >
      <div className="geo geo-dome" aria-hidden="true" />
      <div className="geo geo-moon" aria-hidden="true" />

      <img className="cv-logo" src="/assets/brand/shikho-logo-white.png" alt="Shikho" />
      <div className="cv-top" role="heading" aria-level={slide.name ? 2 : 1}>
        <p className="cv-head">{COPY.cover.headline}</p>
        <p className="cv-year" role="img" aria-label={COPY.cover.year}>
          {[...COPY.cover.year].map((d, i) => (
            <span key={i} className="cv-d" aria-hidden="true">
              {d}
            </span>
          ))}
        </p>
      </div>

      <div className="cv-id">
        {slide.name && <h1 className="cv-name">{slide.name}</h1>}
        {cls && <p className="cv-class">{cls}</p>}
        <p className="cv-support">{COPY.cover.support}</p>
      </div>
    </div>
  );
}
