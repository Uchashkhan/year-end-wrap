import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useAnimate, usePresence } from "motion/react";
import { COPY } from "../data/copy";
import { bn } from "../lib/bangla";
import { usePrefs } from "../lib/prefs";
import { sequence, type Step } from "../lib/sequence";
import { CountUp } from "../components/CountUp";
import { BadgePill } from "../components/primitives";
import { ANSWER, WATCH, useEntry, useNav } from "../story/entry";
import { quizTimeline } from "./quizHandoff";
import type { ScreenProps } from "./types";
import "../styles/quiz-recap.css";

const OUT = [0.22, 1, 0.36, 1] as const;
const LETTERS = ["A", "B", "C", "D"] as const;

/** The count steps down with digit count so number + unit keep one row at 360 px. */
function numSize(n: number): CSSProperties {
  const len = bn(n).length;
  return { "--qa-num": len <= 2 ? "min(38cqw, 19cqh)" : len === 3 ? "min(30cqw, 15cqh)" : "min(23cqw, 12cqh)" } as CSSProperties;
}

const Check = ({ className }: { className: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 12.5l4 4L18 8" />
  </svg>
);

/**
 * 05 Quiz — "The Answer Parade — One Last Question" (Nov 2026 brief + prototype).
 * Copy (PRD, exact): headline "কুইজে কেমন কাটল তোমার বছর?"; statement
 * "এই বছর [X]টি কুইজ শেষ করেছ" (X = completed quizzes, Bengali numerals);
 * optional "আর [n]টা হলেই [মাইলফলক]" only when compose.ts finds a real,
 * qualifying milestone gap; the V2 badge pill only when earned. No accuracy,
 * scores or rankings. The prototype's extra lines (selection note, "কুইজ শেষ!",
 * sub-line) are not PRD copy and are not used.
 *
 * One set of elements tells the story in three states:
 *   01 quiz   one multiple-choice question: four answer rows A–D (letter chip,
 *             answer-text lines), slightly tilted; B is picked (yellow) — a
 *             choice, never marked right or wrong
 *   02 done   the four answers square up into one stack; the quiz's progress
 *             bar fills; a small check: quiz finished
 *   03 year   the stack fans out into four finished-quiz rails at the foot, each
 *             ticked done; the progress bar becomes the count's underline; the
 *             count (yellow) is the focal point
 * Final layout is CSS; earlier states are transforms (quizHandoff.ts). Text sits
 * only on the dark top two-fifths of Ocean Blue; the rails take the light band.
 * From Screen 04 the teacher sinks away and answer A enters the narrowing
 * spotlight before the others join. Reduced motion / repeat view: state 03, still.
 */
export function QuizRecap({ slide }: ScreenProps<"quiz">) {
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const fromTeacher = useEntry().kind === "answer";
  const shift = fromTeacher ? 0 : -ANSWER.first.at;
  const at = (t: number) => Math.max(0, t + shift);
  const [counting, setCounting] = useState(still);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const [isPresent, safeToRemove] = usePresence();
  const tlRef = useRef<ReturnType<typeof quizTimeline> | null>(null);
  const textRef = useRef<{ stop: () => void } | null>(null);
  const nav = useNav();

  useEffect(() => {
    if (still) return;
    const root = scope.current;
    if (!root) return;
    root.dataset.qa = "quiz";
    const from = fromTeacher ? root.closest(".story")?.querySelector<HTMLElement>(".slide.tc") ?? null : null;
    const tl = quizTimeline(root, { from, shift });
    tlRef.current = tl;
    const st = ANSWER.stat;
    const steps: Step[] = [
      [".qa-head > span", { y: ["105%", "0%"] }, { duration: ANSWER.headline.dur, ease: OUT, at: at(ANSWER.headline.at) }],
      [".qa-l0 > span", { y: ["105%", "0%"] }, { duration: st.dur, ease: OUT, at: at(st.at) }],
      [".qa-l1 > span", { y: ["105%", "0%"] }, { duration: st.dur, ease: OUT, at: at(st.at + st.step) }],
      [".qa-l2 > span", { y: ["105%", "0%"] }, { duration: st.dur, ease: OUT, at: at(st.at + st.step * 2) }],
      [".qa-l3 > span", { y: ["105%", "0%"] }, { duration: st.dur, ease: OUT, at: at(st.at + st.step * 3) }],
      [".qa-note", { opacity: [0, 1], y: [6, 0] }, { duration: ANSWER.note.dur, ease: OUT, at: at(ANSWER.note.at) }],
    ];
    const c = sequence(root, animate, steps);
    textRef.current = c ?? null;
    const t = window.setTimeout(() => setCounting(true), at(st.at + st.step) * 1000);
    return () => {
      tl.kill();
      c?.stop();
      clearTimeout(t);
    };
    // entry is fixed for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, animate, scope]);

  // ── exit to Screen 06 ("Underline → Playhead"): 06's GSAP timeline takes over
  // the rails and the underline; here only the text fades (Motion). Any other
  // exit is immediate.
  useEffect(() => {
    if (isPresent) return;
    tlRef.current?.kill();
    textRef.current?.stop();
    if (nav.kind !== "watch" || !scope.current) {
      safeToRemove?.();
      return;
    }
    const c = animate(".qa-fade", { opacity: 0, y: -8 }, { duration: WATCH.textOut, ease: [0.4, 0, 0.2, 1] });
    const t = window.setTimeout(() => safeToRemove?.(), WATCH.out * 1000);
    return () => {
      c.stop();
      clearTimeout(t);
    };
    // nav is read at the moment Screen 05 starts leaving
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  const words = COPY.quiz.headline.split(" ");
  const head = [words.slice(0, -2).join(" "), words.slice(-2).join(" ")];

  return (
    <div ref={scope} className={`slide qa ${still ? "" : "is-pre"}`} data-qa={still ? "final" : "quiz"}>
      <h1 className="qa-head qa-fade">
        {/* PRD text unchanged; broken before its last two words: "কুইজে কেমন কাটল / তোমার বছর?" */}
        <span>
          {head[0]}
          <br />
          {head[1]}
        </span>
      </h1>

      <div className="qa-stat" style={numSize(slide.count)}>
        {/* Read as one sentence; the visual split is for emphasis only. */}
        <p className="qa-sr">{COPY.quiz.heroLine(slide.count)}</p>
        <div className="qa-statement qa-fade" aria-hidden="true">
          <span className="qa-line qa-l0">
            <span>এই বছর</span>
          </span>
          <div className="qa-figure">
            <span className="qa-line qa-l1">
              <span className="qa-num">
                <CountUp to={slide.count} run={counting} duration={ANSWER.stat.count} />
              </span>
            </span>
            <span className="qa-unit">
              <span className="qa-line qa-l2">
                <span>টি কুইজ</span>
              </span>
              <span className="qa-line qa-l3">
                <span>শেষ করেছ</span>
              </span>
            </span>
          </div>
        </div>
        {/* The quiz's progress bar (state 02) — here, the count's underline. */}
        <div className="qa-bar" aria-hidden="true">
          <span className="qa-bar-track" />
          <span className="qa-bar-fill" />
          <span className="qa-check">
            <Check className="qa-check-mark" />
          </span>
        </div>
        {slide.nudge ? (
          <p className="qa-note qa-nudge qa-fade">{COPY.quiz.nudge(slide.nudge.gap, slide.nudge.milestone)}</p>
        ) : slide.badge ? (
          <div className="qa-note qa-fade">
            <BadgePill id={slide.badge} landAt={at(ANSWER.note.at)} />
          </div>
        ) : null}
      </div>

      {/* The four answers: a question (01), a finished quiz (02), the year's rails (03). */}
      <div className="qa-deck" aria-hidden="true">
        {LETTERS.map((L, i) => (
          <div key={L} className={`qa-opt qa-opt-${L.toLowerCase()}`} style={{ "--i": i } as CSSProperties}>
            <span className="qa-chip">{L}</span>
            <span className="qa-lines">
              <i />
              <i />
            </span>
            <span className="qa-tick">
              <Check className="qa-tick-mark" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
