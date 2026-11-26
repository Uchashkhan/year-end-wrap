import { useEffect, useRef, useState } from "react";
import { animate as animateValue, useAnimate, usePresence, type AnimationPlaybackControls } from "motion/react";
import { COPY } from "../data/copy";
import { bn } from "../lib/bangla";
import { usePrefs } from "../lib/prefs";
import { sequence, type Step } from "../lib/sequence";
import { AnalogClock, SPIN_EASE } from "../components/AnalogClock";
import { useSkyProgress } from "./studySky/progress";
import { useMotionProfile } from "../motion/profile";
import { coupledCount, createLanding, textIn } from "../motion/primitives";
import { RELATION, TEXT } from "../motion/reference";
import { CountUp } from "../components/CountUp";
import { FLOW, SKY_HANDOFF, useEntry, useNav } from "../story/entry";
import { statSize } from "./statSize";
import type { ScreenProps } from "./types";
import "../styles/study-clock.css";

const OUT = [0.22, 1, 0.36, 1] as const;
/** The number's count: lands well before the clock hands finish decelerating. */
const COUNT = 1.4;
/** Exit to Screen 03: gentle start, then away. */
const MASK_OUT = [0.4, 0, 0.2, 1] as const;

/**
 * 02 Study time — V2 brief (binding) + PRD Screen 2.
 *   hero line  এই বছর তুমি পড়েছ [X] ঘণ্টা           DYNAMIC (total hours, Bangla numerals)
 *   comparison দিনে ৬ ঘণ্টা ধরলে, প্রায় [Y] দিনের সমান। only when meaningful (compose.ts)
 * Hierarchy: the hours, then the comparison. Below min_show the slide is dropped
 * (compose.ts), so there is no low-total state here. PRD's support line
 * ("প্রতিটা ঘণ্টা তোমার নিজের পরিশ্রম।") is not in V2 and is not shown.
 *
 * Composition, over the shared Gentle Atmosphere background (StoryViewer):
 *   upper   the lead "এই বছর তুমি পড়েছ"
 *   centre  the hours (Warning 500, counting up) with ঘণ্টা, then the comparison
 *   bottom  the analog clock, 110 % of the width, only its upper 66cqw visible
 *
 * Entrance (s, from the screen's start t0):
 *   t0        clock rises from below the frame (600 ms, ease-out)
 *   t0+0.1    lead fades up
 *   t0+0.3    the number counts up (1.4 s, ease-out) while the clock hands spin,
 *             then decelerate and land on the real time (3.2 s); then live ticks
 *   t0+1.35   ঘণ্টা, then the comparison
 * From the cover, t0 overlaps the last 200 ms of the four digits' exit.
 * Exit to Screen 03 (forward, full motion; FLOW in story/entry.ts, "clock drops,
 * seat rises"): the lead, number and comparison fade (0–180 ms) while the clock
 * holds; then the whole clock drops straight down below the frame (150–570 ms,
 * accelerating) — no rotation, no fade — as Screen 03's yellow seat rises. The
 * drop is driven by Screen 03's GSAP hero timeline (heroHandoff.ts). The sky stays.
 * Reduced motion / repeat view: the settled frame, final number, clock on time.
 * No buttons (01–08 rule); navigation is the story's tap.
 */
export function StudyClock({ slide }: ScreenProps<"study">) {
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const fromCover = useEntry().kind === "sky";
  const t0 = fromCover ? SKY_HANDOFF.revealAt : 0.05;
  const countAt = t0 + 0.3;
  const [counting, setCounting] = useState(still);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const days = slide.comparisonDays;
  const nav = useNav();
  const [isPresent, safeToRemove] = usePresence();
  const entrance = useRef<AnimationPlaybackControls | undefined>(undefined);
  const sky = useSkyProgress();
  // Reference Motion (dev profile): the count is the clock's spin; the number lands when the hands land
  const { profile, sparks } = useMotionProfile();
  const reference = profile === "reference" && !still;
  const spinTo = useRef<((p: number) => void) | undefined>(undefined);

  // the passage of time for a background effect (study.sky): the hands' spin, 0 → 1 (none when no effect listens)
  useEffect(() => {
    if (!sky) return;
    if (still) {
      sky.set(1);
      return;
    }
    const c = animateValue(0, 1, { duration: 3.2, delay: countAt, ease: SPIN_EASE, onUpdate: (v) => sky.set(v) });
    return () => c.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sky, still]);

  useEffect(() => {
    if (still || !reference) return;
    const root = scope.current;
    if (!root) return;
    const SPIN = 3.2;
    const land = countAt + SPIN + RELATION.landAfterDriver;
    const lead = textIn("kicker");
    const unit = textIn("line");
    const cap = textIn("caption");
    const steps: Step[] = [
      [".sc-clock", { y: ["80%", "0%"] }, { duration: 0.6, ease: OUT, at: t0 }],
      [".sc-lead", lead.keyframes, { ...lead.options, at: t0 + 0.1 }],
      [".sc-num", { opacity: [0, 1], y: [16, 0] }, { duration: 0.45, ease: OUT, at: countAt }],
      [".sc-unit", unit.keyframes, { ...unit.options, at: countAt + TEXT.up.after }],
      [".sc-cmp", cap.keyframes, { ...cap.options, at: land + RELATION.captionAfterLand }],
    ];
    const c = sequence(root, animate, steps);
    entrance.current = c;
    spinTo.current = coupledCount(root.querySelector<HTMLElement>(".sc-num .countup-live"), slide.hours);
    const hero = root.querySelector<HTMLElement>(".sc-num");
    const landing = hero ? createLanding(hero, { origin: "50% 75%", sparks, canvasHost: root, seed: 31, fit: root }) : null;
    const l = landing ? animateValue(0, 1.2, { delay: land, duration: 1.2, ease: "linear", onUpdate: (a) => landing.paint(a) }) : null;
    return () => {
      c?.stop();
      l?.stop();
      landing?.dispose();
      spinTo.current = undefined;
    };
    // entry is fixed for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, reference, animate, scope]);

  useEffect(() => {
    if (still || reference) return;
    const steps: Step[] = [
      [".sc-clock", { y: ["80%", "0%"] }, { duration: 0.6, ease: OUT, at: t0 }],
      [".sc-lead", { opacity: [0, 1], y: [12, 0] }, { duration: 0.5, ease: OUT, at: t0 + 0.1 }],
      [".sc-num", { opacity: [0, 1], y: [16, 0] }, { duration: 0.45, ease: OUT, at: countAt }],
      [".sc-unit", { opacity: [0, 1], y: [8, 0] }, { duration: 0.4, ease: OUT, at: countAt + COUNT * 0.75 }],
      [".sc-cmp", { opacity: [0, 1], y: [10, 0] }, { duration: 0.45, ease: OUT, at: countAt + COUNT * 0.75 + 0.15 }],
    ];
    const c = sequence(scope.current, animate, steps);
    entrance.current = c;
    const t = window.setTimeout(() => setCounting(true), countAt * 1000);
    return () => {
      c?.stop();
      clearTimeout(t);
    };
    // entry is fixed for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, reference, animate, scope]);

  // ── exit to Screen 03 ──
  useEffect(() => {
    if (isPresent) return;
    if (nav.kind !== "flow" || !scope.current) {
      safeToRemove?.();
      return;
    }
    entrance.current?.stop();
    const fade = { opacity: 0 };
    const steps: Step[] = [
      // A: content clears; the clock holds still.
      [".sc-lead, .sc-stat, .sc-cmp", fade, { duration: FLOW.textOut, ease: MASK_OUT, at: 0 }],
      // B (the clock's drop) is not animated here: it belongs to Screen 03's GSAP
      // hero timeline (heroHandoff.ts), so clock, seat and rows share one clock.
    ];
    const c = sequence(scope.current, animate, steps);
    const t = window.setTimeout(() => safeToRemove?.(), FLOW.out * 1000);
    return () => {
      c?.stop();
      clearTimeout(t);
    };
    // nav is read at the moment Screen 02 starts leaving
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  return (
    <div ref={scope} className={`slide sc ${days ? "" : "sc-plain"} ${still ? "" : "is-pre"}`}>
      <div className="sc-copy">
        {/* One heading, read as one sentence; the counting digits are hidden from screen readers. */}
        <h1 className="sc-hero" aria-label={`${COPY.study.lead} ${bn(slide.hours)} ${COPY.study.unit}`}>
          <span className="sc-lead" aria-hidden="true">
            {COPY.study.lead}
          </span>
          <span className="sc-stat" aria-hidden="true">
            <span className="sc-num" style={statSize(slide.hours)}>
              <CountUp to={slide.hours} run={counting} duration={COUNT} driven={reference} />
            </span>
            <span className="sc-unit">{COPY.study.unit}</span>
          </span>
        </h1>
        {days && <p className="sc-cmp">{COPY.study.comparison(days)}</p>}
      </div>
      <div className="sc-clock">
        <AnalogClock still={still} delay={countAt} spin={3.2} onSpin={reference ? (p) => spinTo.current?.(p) : undefined} />
      </div>
    </div>
  );
}
