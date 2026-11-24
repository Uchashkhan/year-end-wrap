import { useId } from "react";
import { MONTHS, bn } from "../lib/bangla";
import { COPY } from "../data/copy";
import { CHAIR_H, HALL_H, HALL_W, ROWS, YOU, YOU_AT, placeOf, tf } from "../screens/LiveClass";
import "../styles/analog-clock.css";

/**
 * The marksheet's memories: each earlier chapter's own illustration, redrawn
 * from that screen's geometry and colours as a static, export-safe piece (no
 * live time, no entrance state). Nothing here is new artwork.
 *   ClockArt     02 Study — AnalogClock's face, ticks, hands and hub
 *   HallArt      03 Live — the Roll Call hall: four rows, the yellow front-row seat
 *   RailsArt     05 Quiz — the year's A/B/C/D rails, each ticked done
 *   PlayerArt    06 Video — the lesson player: orbit art, play disc, watched line
 *   CalendarArt  08 Peak day — the month, the day lit in Shikho yellow
 * (07's subject icon, 04's portrait and 09's LearnerBadge are used as they are.)
 */

/** 02 — the clock, stopped at a fixed, legible time (10:09:36). Same classes as AnalogClock. */
export function ClockArt() {
  const hand = (deg: number, body: React.ReactNode, cls: string) => (
    <div className={`clk-hand ${cls}`} style={{ transform: `rotate(${deg}deg)` }}>
      <svg viewBox="0 0 1000 1000">{body}</svg>
    </div>
  );
  return (
    <div className="clk" aria-hidden="true">
      <svg className="clk-face" viewBox="0 0 1000 1000">
        <circle cx="500" cy="500" r="500" className="clk-rim" />
        <circle cx="500" cy="500" r="462" className="clk-dial-edge" />
        <circle cx="500" cy="500" r="440" className="clk-dial" />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="500" y1="70" x2="500" y2="118" className="clk-tick" transform={`rotate(${i * 30} 500 500)`} />
        ))}
      </svg>
      {hand(304.8, <rect x="486" y="250" width="28" height="275" rx="14" />, "clk-hour")}
      {hand(57.6, <rect x="490" y="120" width="20" height="405" rx="10" />, "clk-min")}
      {hand(216, <rect x="496.5" y="92" width="7" height="488" rx="3.5" />, "clk-sec")}
      <svg className="clk-hub" viewBox="0 0 1000 1000">
        <circle cx="500" cy="500" r="22" className="clk-hub-outer" />
        <circle cx="500" cy="500" r="8" className="clk-hub-inner" />
      </svg>
    </div>
  );
}

/** 03 — the hall, from LiveClass's own geometry; the student's seat in yellow. */
export function HallArt({ aura = true, fromRow = 0 }: { aura?: boolean; fromRow?: number } = {}) {
  const id = `chair-${useId().replace(/:/g, "")}`;
  // fromRow crops the hall to its front rows (the marksheet's small tile); the geometry is unchanged
  const y0 = fromRow > 0 ? ROWS[fromRow].y - 4 : 0;
  const yc = YOU_AT.x + 50 * YOU_AT.s;
  const yf = YOU_AT.y + CHAIR_H * YOU_AT.s;
  return (
    <svg className="art-hall" viewBox={`0 ${y0} ${HALL_W} ${HALL_H - y0}`} aria-hidden="true">
      <defs>
        <g id={id}>
          <rect x="16" y="0" width="68" height="68" rx="16" />
          <rect x="8" y="73" width="84" height="21" rx="10.5" />
          <rect x="17" y="91" width="9" height="41" rx="3" />
          <rect x="74" y="91" width="9" height="41" rx="3" />
        </g>
        <radialGradient id={`${id}-aura`}>
          <stop offset="0" stopColor="#f3be28" stopOpacity="0.32" />
          <stop offset="1" stopColor="#f3be28" stopOpacity="0" />
        </radialGradient>
      </defs>
      {ROWS.map((r, ri) => ri < fromRow ? null : (
        <g key={ri} fill={r.fill} fillOpacity={Math.min(1, r.opacity + 0.12)}>
          {Array.from({ length: r.n }, (_, j) => (ri === YOU.row && j === YOU.seat ? null : <use key={j} href={`#${id}`} transform={tf(placeOf(r, j))} />))}
        </g>
      ))}
      {aura && <ellipse cx={yc} cy={yf - CHAIR_H * YOU_AT.s * 0.55} rx="64" ry="64" fill={`url(#${id}-aura)`} />}
      <use href={`#${id}`} transform={tf(YOU_AT)} fill="#f3be28" />
    </svg>
  );
}

/** 05 — the four answers as the year's finished quizzes (Screen 05's final rails). */
export function RailsArt() {
  const fills = ["#303ebf", "#5468ff", "#5a49d4", "#6f87ff"];
  const ox = [0, 16, -6, 22];
  return (
    <svg className="art-rails" viewBox="0 0 420 320" aria-hidden="true">
      <g transform="rotate(-7 210 160)">
        {["A", "B", "C", "D"].map((L, i) => {
          const y = 14 + i * 76;
          const x = 20 + ox[i];
          return (
            <g key={L}>
              <rect x={x} y={y + 7} width="420" height="64" rx="17" fill="#08277a" fillOpacity="0.35" />
              <rect x={x} y={y} width="420" height="64" rx="17" fill={fills[i]} stroke="#c9e6ff" strokeOpacity="0.3" strokeWidth="1.5" />
              <rect x={x + 12} y={y + 11} width="42" height="42" rx="12" fill="#a6d6ff" fillOpacity="0.2" />
              <text x={x + 33} y={y + 44} textAnchor="middle" className="art-rail-letter">
                {L}
              </text>
              <rect x={x + 72} y={y + 29} width="150" height="6" rx="3" fill="#d5e9ff" fillOpacity="0.5" />
              <circle cx={x + 270} cy={y + 32} r="15" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="2" />
              <path d={`M${x + 263} ${y + 32} l5 5 l9 -10`} fill="none" stroke="#f3be28" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/** 06 — the lesson player: its orbit art, the play disc with the yellow halo, the watched line. */
export function PlayerArt({ watched = 0.72 }: { watched?: number }) {
  const g = `pl-${useId().replace(/:/g, "")}`;
  const bx = 40;
  const bw = 520;
  return (
    <svg className="art-player" viewBox="0 0 600 340" aria-hidden="true">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#152269" />
          <stop offset="0.75" stopColor="#283bb0" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="600" height="340" rx="30" fill={`url(#${g})`} />
      <g transform="translate(176 40)">
        <ellipse cx="124" cy="68" rx="98" ry="49" transform="rotate(-24 124 68)" fill="none" stroke="#7ab6ff" strokeWidth="2" />
        <ellipse cx="124" cy="68" rx="98" ry="49" transform="rotate(29 124 68)" fill="none" stroke="#7ab6ff" strokeWidth="2" />
        <path d="M42 102L82 89L101 109L159 106L183 79" fill="none" stroke="#7ab6ff" strokeWidth="1.4" strokeDasharray="4 5" opacity="0.55" />
        <circle cx="35" cy="52" r="8" fill="#51d0f2" />
        <circle cx="204" cy="39" r="5" fill="#f3be28" />
      </g>
      <circle cx="300" cy="108" r="52" fill="#273baf" fillOpacity="0.55" stroke="#f3be28" strokeWidth="3" />
      <circle cx="300" cy="108" r="44" fill="#101a5c" stroke="#e4efff" strokeOpacity="0.6" strokeWidth="1.5" />
      <path d="M289 89.5c0-2 2.2-3.2 3.9-2.2l24.4 15.6c1.5 1 1.5 3.4 0 4.4l-24.4 15.6c-1.7 1-3.9-.2-3.9-2.2z" fill="#eef3ff" />
      <rect x={bx} y="270" width={bw} height="8" rx="4" fill="#d6e2ff" fillOpacity="0.4" />
      <rect x={bx} y="270" width={bw * watched} height="8" rx="4" fill="#f3be28" />
      <circle cx={bx + bw * watched} cy="274" r="13" fill="#f3be28" />
    </svg>
  );
}

/** 08 — the month (real month and year), the day lit; Sunday-first like Screen 08. */
export function CalendarArt({ date }: { date: string }) {
  const [y, m, d] = date.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array.from({ length: first }, () => null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <div className="art-cal" aria-hidden="true" style={{ "--lit-row": Math.floor((first + d - 1) / 7) } as React.CSSProperties}>
      <div className="art-cal-title">
        {MONTHS[m - 1]} {bn(y)}
      </div>
      <div className="art-cal-wk">
        {COPY.peakDay.weekHeads.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="art-cal-grid">
        {cells.map((n, i) => (
          <span key={i} className={n === d ? "is-lit" : ""}>
            {n ? bn(n) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
