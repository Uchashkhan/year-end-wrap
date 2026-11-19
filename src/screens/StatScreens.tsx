/**
 * 02 · 03 · 05 · 06 — single-metric story slides.
 * M1 shares one plain layout on purpose; V2 asks each to get its own
 * visualisation in Milestones 3–4 (register, real quiz chart, etc.).
 */
import { COPY } from "../data/copy";
import { BadgePill } from "../components/primitives";
import { CountUp } from "../components/CountUp";
import type { ScreenProps } from "./types";

export function StudyTime({ slide, active }: ScreenProps<"study">) {
  return (
    <div className="slide slide-center">
      <p className="eyebrow">{COPY.study.lead}</p>
      <p className="hero">
        <CountUp to={slide.hours} run={active} />
      </p>
      <p className="unit">{COPY.study.unit}</p>
      {slide.comparisonDays && <p className="support">{COPY.study.comparison(slide.comparisonDays)}</p>}
    </div>
  );
}

export function Attendance({ slide, active }: ScreenProps<"live">) {
  return (
    <div className="slide slide-center">
      <p className="eyebrow">{COPY.live.headline}</p>
      <p className="hero">
        <CountUp to={slide.attended} run={active} />
      </p>
      <p className="unit">{COPY.live.unit}</p>
      {slide.badge ? (
        <div className="badge-row">
          <BadgePill id={slide.badge} />
        </div>
      ) : null}
      <p className="support">{COPY.live.held(slide.held)}</p>
    </div>
  );
}

export function Quiz({ slide, active }: ScreenProps<"quiz">) {
  return (
    <div className="slide slide-center">
      <p className="eyebrow">{COPY.quiz.headline}</p>
      <p className="hero">
        <CountUp to={slide.count} run={active} />
      </p>
      <p className="unit">{COPY.quiz.unit}</p>
      {slide.badge && (
        <div className="badge-row">
          <BadgePill id={slide.badge} />
        </div>
      )}
      {slide.nudge && <p className="support">{COPY.quiz.nudge(slide.nudge.gap, slide.nudge.milestone)}</p>}
    </div>
  );
}

export function Video({ slide, active }: ScreenProps<"video">) {
  return (
    <div className="slide slide-center">
      <p className="eyebrow">{COPY.video.lead}</p>
      <p className="hero">
        <CountUp to={slide.minutes} run={active} />
      </p>
      <p className="unit">{COPY.video.unit}</p>
      {slide.badge && (
        <div className="badge-row">
          <BadgePill id={slide.badge} />
        </div>
      )}
      {slide.hours && <p className="support">{COPY.video.hours(slide.hours)}</p>}
    </div>
  );
}
