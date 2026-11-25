import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useAnimate, usePresence } from "motion/react";
import { COPY } from "../data/copy";
import { bn } from "../lib/bangla";
import { usePrefs } from "../lib/prefs";
import { sequence, type Step } from "../lib/sequence";
import { CountUp } from "../components/CountUp";
import { BadgePill } from "../components/primitives";
import { FLOW, FOCUS, useEntry, useNav } from "../story/entry";
import type { ScreenProps } from "./types";
import { heroTimeline, settleHall } from "./heroHandoff";
import "../styles/live-class.css";
import { devRegister, fromGsap, fromMotion, group } from "../motion/timeline";

const OUT = [0.22, 1, 0.36, 1] as const;

// ── The classroom (reference: "The Roll Call") ──────────────────────────────
// Four rows seen from the front of the room, in hall units (390 wide): each row
// further back is smaller, higher and dimmer. Row 3 is the front row; the
// student's seat is its third chair (just right of centre).
export const HALL_W = 390;
export const HALL_H = 300;
export const ROWS = [
  { n: 7, y: 8, w: 26, fill: "#6175d5", opacity: 0.32 },
  { n: 6, y: 65, w: 34, fill: "#5d77e7", opacity: 0.47 },
  { n: 5, y: 133, w: 43, fill: "#526cf0", opacity: 0.62 },
  { n: 4, y: 216, w: 56, fill: "#4059d7", opacity: 0.84 },
];
export const YOU = { row: 3, seat: 2 };
/** The chair's box: 100 × 132 (backrest, seat, two legs — one consistent geometry). */
export const CHAIR_H = 132;

export type Place = { x: number; y: number; s: number };
export const placeOf = (r: (typeof ROWS)[number], j: number): Place => {
  const s = r.w / 100;
  return { x: (j + 0.5) * (HALL_W / r.n) - r.w / 2, y: r.y, s };
};
export const YOU_AT = placeOf(ROWS[YOU.row], YOU.seat);
export const tf = (p: Place) => `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) scale(${p.s.toFixed(4)})`;

/** One chair, front view: a rounded backrest with a soft top edge, the seat, two legs. */
function ChairDef() {
  return (
    <g id="fr-chair">
      <rect x="16" y="0" width="68" height="68" rx="16" />
      <rect x="8" y="73" width="84" height="21" rx="10.5" />
      <rect x="17" y="91" width="9" height="41" rx="3" />
      <rect x="74" y="91" width="9" height="41" rx="3" />
      <rect x="24" y="5" width="52" height="4" rx="2" className="fr-chair-lip" />
    </g>
  );
}

/** The count steps down with digit count. */
function numSize(n: number): CSSProperties {
  const len = bn(n).length;
  return { "--fr-num": len <= 2 ? "min(27cqw, 13.5cqh)" : "min(22cqw, 11cqh)" } as CSSProperties;
}

/**
 * 03 Live classes — "The Roll Call" (Nov 22 brief + HTML prototype).
 * Copy (PRD Screen 3): headline "লাইভ ক্লাসে তোমার উপস্থিতি"; primary "[X]টি
 * ক্লাসে অংশ নিয়েছ তুমি" (X = classes attended, from the record); the held
 * total for context ("[Y]টি ক্লাসের মধ্যে"); the ফার্স্ট বেঞ্চার ribbon only when
 * earned (≥ 85%, config.ts). No percentage. The prototype's eyebrow, footer and
 * "LIVE" label are not PRD copy and are not used.
 *
 * One continuous entrance, three checkpoints (heroHandoff.ts):
 *   01 classroom  the room establishes: four rows of seats as one arrangement
 *   02 present    the student's front-row seat (yellow) is the focus: a ring
 *                 marks it; the other seats recede
 *   03 reveal     the count rises above the room, with the statement; the
 *                 classroom stays behind as support; the yellow seat stays
 * From Screen 02 ("clock drops, seat rises"): 02's clock drops out of the frame
 * while the yellow seat rises from the same place. To Screen 04 the yellow seat
 * is the outgoing anchor (focusHandoff.ts). Reduced motion / repeat view: the
 * settled frame.
 */
export function LiveClass({ slide }: ScreenProps<"live">) {
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const fromStudy = useEntry().kind === "flow";
  // Without the clock to wait for, everything starts earlier.
  const shift = fromStudy ? 0 : -(FLOW.seat.at - 0.05);
  const at = (t: number) => Math.max(0, t + shift);
  const [counting, setCounting] = useState(still);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const nav = useNav();
  const [isPresent, safeToRemove] = usePresence();
  const heroRef = useRef<ReturnType<typeof heroTimeline> | null>(null);
  const textRef = useRef<{ stop: () => void } | null>(null);
  const wasLeaving = useRef(false);

  useEffect(() => {
    if (still) return;
    const root = scope.current;
    if (!root) return;
    // Clock, room, seat, recede: one GSAP master timeline (heroHandoff.ts).
    const clock = fromStudy ? root.closest(".story")?.querySelector<HTMLElement>(".sc-clock") ?? null : null;
    const hero = heroTimeline(root, { clock, shift });
    heroRef.current = hero;
    // Text (Motion): the heading early; the count as the room recedes.
    const st = FLOW.stat;
    const steps: Step[] = [
      [".fr-line-0 > span", { y: ["130%", "0%"] }, { duration: 0.42, ease: OUT, at: at(FLOW.head.at) }],
      [".fr-line-1 > span", { y: ["130%", "0%"] }, { duration: 0.42, ease: OUT, at: at(FLOW.head.at + 0.06) }],
      [".fr-num-mask > span", { y: ["120%", "0%"] }, { duration: 0.55, ease: OUT, at: at(st.at) }],
      [".fr-unit-mask > span", { y: ["130%", "0%"] }, { duration: 0.5, ease: OUT, at: at(st.at + 0.07) }],
      [".fr-tail-mask > span", { y: ["130%", "0%"] }, { duration: 0.5, ease: OUT, at: at(st.at + 0.13) }],
      [".fr-meta", { opacity: [0, 1], y: [8, 0] }, { duration: 0.45, ease: OUT, at: at(st.at + 0.22) }],
    ];
    const c = sequence(root, animate, steps);
    textRef.current = c ?? null;
    const t = window.setTimeout(() => setCounting(true), at(st.at) * 1000);
    // dev only (no-op in production): the Motion Inspector reads the stage (GSAP) and text (Motion) as one
    const unregister = devRegister("03 Live · stage (GSAP) + text (Motion)", group(fromGsap(hero), c ? fromMotion(c) : null));
    return () => {
      unregister();
      hero.kill();
      c?.stop();
      clearTimeout(t);
    };
    // entry is fixed for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, animate, scope]);

  // ── exit to Screen 04 ("focus shift"): 04's GSAP timeline takes over the seats;
  // here only the text fades (Motion). Any other exit is immediate.
  useEffect(() => {
    if (isPresent) {
      // Revived while leaving (e.g. back from 04 within its hand-over): the
      // entrance and the exit were both cut short — show the settled frame.
      if (wasLeaving.current && scope.current) {
        wasLeaving.current = false;
        settleHall(scope.current);
        animate(".fr-copy", { opacity: 1, y: 0 }, { duration: 0 });
        animate(".fr-line > span, .fr-num-mask > span, .fr-unit-mask > span, .fr-tail-mask > span", { y: "0%" }, { duration: 0 });
        animate(".fr-meta", { opacity: 1, y: 0 }, { duration: 0 });
        setCounting(true);
      }
      return;
    }
    wasLeaving.current = true;
    heroRef.current?.kill();
    textRef.current?.stop();
    if (nav.kind !== "focus" || !scope.current) {
      safeToRemove?.();
      return;
    }
    const c = animate(".fr-copy", { opacity: 0, y: -8 }, { duration: FOCUS.textOut, ease: [0.4, 0, 0.2, 1] });
    const t = window.setTimeout(() => safeToRemove?.(), FOCUS.out * 1000);
    return () => {
      c.stop();
      clearTimeout(t);
    };
    // nav is read at the moment Screen 03 starts leaving
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  const L = COPY.liveClass;
  const yc = YOU_AT.x + 50 * YOU_AT.s; // the seat's centre and floor, for its ring
  const yf = YOU_AT.y + CHAIR_H * YOU_AT.s;
  return (
    <div ref={scope} className={`slide fr ${still ? "" : "is-pre"}`} style={numSize(slide.attended)}>
      {/* The classroom. The hall shifts down a step as it recedes (its resting place). */}
      <div className="fr-stage" aria-hidden="true">
        <svg className="fr-hall" viewBox={`0 0 ${HALL_W} ${HALL_H}`}>
          <defs>
            <ChairDef />
          </defs>
          <g className="fr-rows">
            {ROWS.map((r, ri) => (
              <g key={ri} className={`fr-row fr-row-${ri}`} fill={r.fill} fillOpacity={r.opacity}>
                {Array.from({ length: r.n }, (_, j) =>
                  ri === YOU.row && j === YOU.seat ? null : <use key={j} href="#fr-chair" transform={tf(placeOf(r, j))} />,
                )}
              </g>
            ))}
          </g>
          <ellipse className="fr-halo" cx={yc} cy={yf - 2} rx="45" ry="15" />
          <g className="fr-you">
            <ellipse className="fr-you-aura" cx={yc} cy={yf - CHAIR_H * YOU_AT.s * 0.55} rx="58" ry="58" />
            <ellipse className="fr-you-glow" cx={yc} cy={yf - 4} rx="38" ry="10" />
            <use href="#fr-chair" transform={tf(YOU_AT)} />
          </g>
        </svg>
      </div>

      <div className="fr-copy">
        <p className="fr-sr">
          {L.headline.join(" ")}। {L.statement(slide.attended)}।{slide.held > 0 ? ` ${COPY.live.held(slide.held)}।` : ""}
        </p>
        <h1 className="fr-head" aria-hidden="true">
          <span className="fr-line fr-line-0">
            <span>{L.headline[0]}</span>
          </span>
          <span className="fr-line fr-line-1">
            <span>{L.headline[1]}</span>
          </span>
        </h1>

        <div className="fr-stat" aria-hidden="true">
          <div className="fr-figure">
            <span className="fr-num-mask">
              <span className="fr-num">
                <CountUp to={slide.attended} run={counting} duration={FLOW.stat.count} />
              </span>
            </span>
            <span className="fr-unit-mask">
              <span className="fr-unit">
                {L.unitTop}
                <br />
                {L.unitBottom}
              </span>
            </span>
          </div>
          <span className="fr-tail-mask">
            <span className="fr-tail">{L.tail}</span>
          </span>
          <div className="fr-meta">
            {slide.held > 0 && <p className="fr-held">{COPY.live.held(slide.held)}</p>}
            {slide.badge && <BadgePill id={slide.badge} />}
          </div>
        </div>
      </div>
    </div>
  );
}
