import { useEffect, useState, type CSSProperties } from "react";
import { stagger, useAnimate } from "motion/react";
import { COPY } from "../data/copy";
import { bn } from "../lib/bangla";
import { usePrefs } from "../lib/prefs";
import { sequence, type Step } from "../lib/sequence";
import { CountUp } from "../components/CountUp";
import type { ScreenProps } from "./types";
import "../styles/wrap-geo.css";

const OUT = [0.22, 1, 0.36, 1] as const;
const POP = [0.34, 1.56, 0.64, 1] as const;

/** Display size steps down with digit count, so 4-digit totals still fit one line. */
function numSize(hours: number) {
  const n = bn(hours).length;
  return n <= 2 ? "min(58cqw, 29cqh)" : n === 3 ? "min(44cqw, 22cqh)" : "min(34cqw, 17cqh)";
}

/** One dot per 6-hour day. Column count keeps large totals inside the lower half. */
// Never 7 columns (reads as a calendar of weeks). Columns grow with the total so even a
// very heavy year (≈ 300 days) fits the dome without clipping a single dot.
function grid(days: number) {
  const cols = days <= 40 ? 8 : days <= 100 ? 10 : days <= 180 ? 15 : 20;
  const gap = { 8: "2.6cqw", 10: "2cqw", 15: "1.4cqw", 20: "1cqw" }[cols];
  return { cols, gap, gw: cols === 8 ? "86%" : "100%" };
}

/**
 * 02 Study Time (M3 — ARCHIVED, `?study=geo`; the default is now StudyClock). V2 copy, unchanged:
 *   hero line  এই বছর তুমি পড়েছ [X] ঘণ্টা            (DYNAMIC)
 *   comparison দিনে ৬ ঘণ্টা ধরলে, প্রায় [Y] দিনের সমান।  (only when meaningful)
 *
 * The cover's yellow dome has become the ground; its magenta moon has moved
 * top-right and the hours number overprints it. The only other geometry is
 * data: one navy dot per 6-hour day — exactly the comparison's [Y], drawn only
 * when V2 shows the comparison. Without it (Limited) the number stands alone
 * and the blue dome returns low to hold the page.
 *
 * Sequence: lead → count-up (hero) → unit → comparison → days fill in.
 * Reduced motion / repeat view: final values, no count.
 */
export function StudyGeo({ slide }: ScreenProps<"study">) {
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const [counting, setCounting] = useState(still);
  const days = slide.comparisonDays;
  const g = days ? grid(days) : null;
  const t0 = 0.12;

  useEffect(() => {
    if (still) return;
    const moon: Step = [".geo-moon", { scale: [0, 1] }, { duration: 0.6, ease: POP, at: t0 + 0.1 }];
    const steps: Step[] = [
      moon,
      [".geo-dome", { y: ["70%", "0%"] }, { duration: 0.8, ease: OUT, at: t0 + 0.2 }],
      [".st-lead", { opacity: [0, 1], y: [12, 0] }, { duration: 0.45, ease: OUT, at: t0 }],
      [".st-big", { opacity: [0, 1] }, { duration: 0.01, at: t0 + 0.12 }], // no half-opacity navy (reads brown on yellow)
      [".st-unit", { opacity: [0, 1], x: [-10, 0] }, { duration: 0.4, ease: OUT, at: t0 + 1.05 }],
      [".st-cmp", { opacity: [0, 1], y: [10, 0] }, { duration: 0.45, ease: OUT, at: t0 + 1.2 }],
      [".st-dot", { scale: [0, 1] }, { duration: 0.42, ease: POP, delay: stagger(Math.min(0.03, 1.1 / (days || 1))), at: t0 + 1.3 }],
    ];
    const c = sequence(scope.current, animate, steps);
    const t = window.setTimeout(() => setCounting(true), (t0 + 0.15) * 1000);
    return () => {
      c?.stop();
      clearTimeout(t);
    };
    // entry is fixed for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, animate, scope]);

  return (
    <div ref={scope} className={`slide st ${days ? "" : "st-plain"} ${still ? "" : "is-pre"}`}>
      <div className="geo geo-dome" aria-hidden="true" />
      <div className="geo geo-moon" aria-hidden="true" />

      {/* One heading, read as one sentence; the counting digits are hidden from screen readers. */}
      <h1 className="st-hero" aria-label={`${COPY.study.lead} ${bn(slide.hours)} ${COPY.study.unit}`}>
        <span className="st-lead" aria-hidden="true">
          {COPY.study.lead}
        </span>
        <span className="st-num" aria-hidden="true" style={{ "--st-size": numSize(slide.hours) } as CSSProperties}>
          <span className="st-big">
            <CountUp to={slide.hours} run={counting} duration={1.2} />
          </span>
          <span className="st-unit">{COPY.study.unit}</span>
        </span>
      </h1>

      {days && g && (
        <div className="st-days">
          <p className="st-cmp">{COPY.study.comparison(days)}</p>
          <div className="st-grid" style={{ "--cols": g.cols, "--gap": g.gap, "--gw": g.gw } as CSSProperties} aria-hidden="true">
            {Array.from({ length: days }, (_, i) => (
              <span key={i} className="st-dot" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
