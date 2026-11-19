import { useEffect, useState } from "react";
import { useAnimate } from "motion/react";
import { COPY } from "../data/copy";
import { bn } from "../lib/bangla";
import { usePrefs } from "../lib/prefs";
import { sequence, type Step } from "../lib/sequence";
import { CountUp } from "../components/CountUp";
import { FLOW, useEntry } from "../story/entry";
import type { ScreenProps } from "./types";
import { heroTimeline } from "./heroHandoff";
import "../styles/live-class.css";

const OUT = [0.22, 1, 0.36, 1] as const;

// ── The hall: rows of chairs seen from the front of the room ────────────────
// The front row (row 0) is nearest: largest, lowest, brightest. Each row behind
// it is smaller and higher, converging on the frame's centre (one vanishing
// axis), and alternate rows sit half a seat over, like tiered classroom seating.
// SVG units: the hall is 400 wide; y grows downward from the front row's floor.
const VB_W = 400;
const ROWS = 7;
const FRONT = 1; // front-row chair scale (chair box: 100 × 110)
const SHRINK = 0.84; // each row back
const PITCH = 1.28; // seat spacing, in chair widths
const STEP_UP = 0.8; // how far each row sits above the one in front, in chair heights
const FLOOR_PAD = 20; // space under the front row so the student's seat is never clipped

type Seat = { x: number; y: number; s: number };
type Row = { r: number; seats: Seat[] };

function buildHall() {
  const rows: Row[] = [];
  let floor = 0;
  let you: Seat | null = null;
  for (let r = 0; r < ROWS; r++) {
    const s = FRONT * Math.pow(SHRINK, r);
    const pitch = 100 * PITCH * s;
    const offset = r % 2 === 0 ? 0.5 : 0;
    const k = Math.ceil(VB_W / 2 / pitch) + 1;
    const seats: Seat[] = [];
    for (let i = -k; i <= k; i++) {
      const cx = VB_W / 2 + (i + offset) * pitch;
      const seat = { x: cx - 50 * s, y: floor - 110 * s, s };
      if (cx + 50 * s < -2 || cx - 50 * s > VB_W + 2) continue;
      // The student's seat: front row, just right of centre, balancing the left-set text.
      if (r === 0 && i === 0) you = seat;
      else seats.push(seat);
    }
    rows.push({ r, seats });
    floor -= 110 * s * STEP_UP;
  }
  const top = floor - 110 * FRONT * Math.pow(SHRINK, ROWS - 1) * (1 - STEP_UP) - 8;
  return { rows, you: you!, top, height: FLOOR_PAD - top };
}
const HALL = buildHall();

/** One chair silhouette, front view: backrest, two posts, seat, two legs. */
function ChairDef() {
  return (
    <g id="fr-chair">
      <rect x="16" y="0" width="68" height="48" rx="13" />
      <rect x="27" y="44" width="8" height="14" />
      <rect x="65" y="44" width="8" height="14" />
      <rect x="6" y="56" width="88" height="17" rx="8.5" />
      <rect x="15" y="70" width="9" height="40" rx="4.5" />
      <rect x="76" y="70" width="9" height="40" rx="4.5" />
    </g>
  );
}

const place = (p: Seat) => `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) scale(${p.s.toFixed(4)})`;

/**
 * 03 Live classes — "The Front-Row Seat" (Nov 2026 brief).
 * Copy: "এই বছর তুমি / লাইভ ক্লাসে ছিলে" · [X] · "টি ক্লাসে";
 * X = classes attended, from the record (compose.ts → slide.attended).
 *
 * Asymmetric editorial layout (not Screen 02's centred stack): headline and
 * number left-set on the gutter in the upper part; below, a hall of chairs
 * receding from a large front row at the bottom edge. The student's chair, in
 * the front row just right of centre, is Shikho yellow.
 *
 * Entrance — from Screen 02 ("clock drops, seat rises", FLOW): the yellow chair
 * rises from below the frame while 02's clock drops away; the other rows stand
 * up in place from the front backwards while it settles; then the headline, the
 * count and the unit. Clock, chair and rows run on one GSAP master timeline
 * (heroHandoff.ts); the text and count are Motion. From anywhere else the same
 * sequence runs without the clock, starting at once. No loops, no bounce.
 * Reduced motion / repeat view: the settled frame, final number.
 */
export function LiveClass({ slide }: ScreenProps<"live">) {
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const fromStudy = useEntry().kind === "flow";
  // Without the clock to wait for, everything starts ~0.35 s earlier.
  const shift = fromStudy ? 0 : -(FLOW.seat.at - 0.05);
  const countAt = FLOW.stat.at + 0.05 + shift;
  const [counting, setCounting] = useState(still);
  const [scope, animate] = useAnimate<HTMLDivElement>();

  useEffect(() => {
    if (still) return;
    const root = scope.current;
    if (!root) return;
    // B–D (clock, chair, rows): one GSAP master timeline (heroHandoff.ts).
    const clock = fromStudy ? root.closest(".story")?.querySelector<HTMLElement>(".sc-clock") ?? null : null;
    const hero = heroTimeline(root, { clock, shift });
    // E (Motion): headline, count, unit.
    const steps: Step[] = [
      [".fr-line-0 > span", { y: ["105%", "0%"] }, { duration: 0.45, ease: OUT, at: FLOW.stat.at + shift }],
      [".fr-line-1 > span", { y: ["105%", "0%"] }, { duration: 0.45, ease: OUT, at: FLOW.stat.at + 0.06 + shift }],
      [".fr-num", { opacity: [0, 1] }, { duration: 0.2, ease: OUT, at: countAt }],
      [".fr-unit", { opacity: [0, 1] }, { duration: 0.3, ease: OUT, at: countAt + 0.2 }],
    ];
    const c = sequence(root, animate, steps);
    const t = window.setTimeout(() => setCounting(true), countAt * 1000);
    return () => {
      hero.kill();
      c?.stop();
      clearTimeout(t);
    };
    // entry is fixed for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, animate, scope]);

  const [l1, l2] = COPY.liveClass.headline;
  return (
    <div ref={scope} className={`slide fr ${still ? "" : "is-pre"}`}>
      <div className="fr-copy">
        {/* One heading, read as one sentence; the counting digits are hidden from screen readers. */}
        <h1 className="fr-head" aria-label={`${l1} ${l2} ${bn(slide.attended)}${COPY.liveClass.unit}`}>
          <span className="fr-line fr-line-0" aria-hidden="true">
            <span>{l1}</span>
          </span>
          <span className="fr-line fr-line-1" aria-hidden="true">
            <span>{l2}</span>
          </span>
          <span className="fr-stat" aria-hidden="true">
            <span className="fr-num">
              <CountUp to={slide.attended} run={counting} duration={FLOW.stat.count} />
            </span>
            <span className="fr-unit">{COPY.liveClass.unit}</span>
          </span>
        </h1>
      </div>

      <svg
        className="fr-hall"
        viewBox={`0 ${HALL.top.toFixed(1)} ${VB_W} ${HALL.height.toFixed(1)}`}
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        <defs>
          <ChairDef />
        </defs>
        {/* Back rows first, so nearer chairs overlap the ones behind them. */}
        {[...HALL.rows].reverse().map(({ r, seats }) => (
          <g key={r} className={`fr-row fr-row-${r}`}>
            {seats.map((p, i) => (
              <use key={i} href="#fr-chair" transform={place(p)} />
            ))}
          </g>
        ))}
        <g className="fr-you">
          <use href="#fr-chair" transform={place(HALL.you)} />
        </g>
      </svg>
    </div>
  );
}
