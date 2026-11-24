import { COPY } from "../data/copy";
import { bn } from "../lib/bangla";

/**
 * Marksheet V2's compact memories: each is an earlier screen's own visual
 * metaphor, re-composed for a small tile (not new artwork, not a shrunk screen).
 * Colours come from CSS custom properties so V2-A and V2-B can tone them.
 *   SeatsArt  03 Live — the hall's chair (LiveClass geometry), two rows, your
 *             yellow seat in the front row
 *   WatchArt  06 Video — the watchline: four playback tiles over the yellow
 *             watched line and its scrubber (no player chrome)
 *   WeekArt   08 Peak day — the calendar reduced to the one week that holds
 *             the day, the day lit; the date itself is the tile's headline
 * (02's clock and 05's answer rails are reused from art.tsx; 07's subject
 * icon, 04's portrait and 09's badge are used as they are.)
 */

/** The chair from LiveClass (100 × 132: backrest, seat, two legs). */
const Chair = () => (
  <>
    <rect x="16" y="0" width="68" height="68" rx="16" />
    <rect x="8" y="73" width="84" height="21" rx="10.5" />
    <rect x="17" y="91" width="9" height="41" rx="3" />
    <rect x="74" y="91" width="9" height="41" rx="3" />
  </>
);

export function SeatsArt() {
  // back row: five small, quiet chairs; front row: three, the middle one yours
  const back = Array.from({ length: 5 }, (_, i) => ({ x: 34 + i * 96, y: 14, s: 0.6 }));
  const front = Array.from({ length: 3 }, (_, i) => ({ x: 92 + i * 128, y: 104, s: 0.86 }));
  return (
    <svg className="v2-seats" viewBox="0 0 540 230" aria-hidden="true">
      <g className="v2-seat-back">
        {back.map((p, i) => (
          <g key={i} transform={`translate(${p.x} ${p.y}) scale(${p.s})`}>
            <Chair />
          </g>
        ))}
      </g>
      <g className="v2-seat-front">
        {front.map((p, i) =>
          i === 1 ? null : (
            <g key={i} transform={`translate(${p.x} ${p.y}) scale(${p.s})`}>
              <Chair />
            </g>
          ),
        )}
      </g>
      <g className="v2-seat-you" transform={`translate(${front[1].x} ${front[1].y}) scale(${front[1].s})`}>
        <Chair />
      </g>
    </svg>
  );
}

const Tri = ({ x, y }: { x: number; y: number }) => <path d={`M${x - 9} ${y - 13}v26l22-13z`} />;

export function WatchArt({ watched = 0.72 }: { watched?: number }) {
  const w = 104;
  const gap = 18;
  const x0 = 6;
  const tx = (i: number) => x0 + i * (w + gap);
  const end = tx(3) + w;
  return (
    <svg className="v2-watch" viewBox="0 0 500 170" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <g key={i} className={`v2-play v2-play-${i}`}>
          <rect x={tx(i)} y="4" width={w} height="80" rx="18" />
          <Tri x={tx(i) + w / 2 - 2} y={44} />
        </g>
      ))}
      <rect className="v2-track" x={x0} y="128" width={end - x0} height="10" rx="5" />
      <rect className="v2-watched" x={x0} y="128" width={(end - x0) * watched} height="10" rx="5" />
      <circle className="v2-knob" cx={x0 + (end - x0) * watched} cy="133" r="17" />
    </svg>
  );
}

/** The week (Sunday first, as Screen 08) holding `date`, the day lit. */
export function WeekArt({ date }: { date: string }) {
  const [y, m, d] = date.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d));
  const start = new Date(day);
  start.setUTCDate(d - day.getUTCDay());
  const days = Array.from({ length: 7 }, (_, i) => {
    const x = new Date(start);
    x.setUTCDate(start.getUTCDate() + i);
    return { n: x.getUTCDate(), lit: i === day.getUTCDay(), out: x.getUTCMonth() !== m - 1 };
  });
  return (
    <div className="v2-week" aria-hidden="true">
      {days.map((x, i) => (
        <span key={i} className={`v2-wd ${x.lit ? "is-lit" : ""} ${x.out ? "is-out" : ""}`}>
          <em>{COPY.peakDay.weekHeads[i]}</em>
          <b>{bn(x.n)}</b>
        </span>
      ))}
    </div>
  );
}
