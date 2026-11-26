import liveClassIcon from "../assets/live/live-class.svg?url";
import { ClockDial } from "../components/AnalogClock";
import { OPTICS_SPECTRUM, OpticsPrism, OpticsProjection } from "../components/OpticsArtwork";
import { QuizActivityCard } from "../components/QuizActivityCard";
import { ChairShapes } from "../components/ReservedSeatChair";
import { COPY } from "../data/copy";
import { bn, MONTHS } from "../lib/bangla";
import { calendarMonth } from "../lib/calendar";

export function StudyTimeArt() {
  return (
    <div className="ms3-clock">
      <ClockDial hour={306} min={55} sec={136} />
      <svg className="ms3-clock-celestial" viewBox="0 0 228 28">
        <circle cx="38" cy="16" r="7" fill="var(--ds-warning-500)" />
        <path d="M138 6a8 8 0 1 0 9 11 8.5 8.5 0 0 1-9-11Z" fill="#e3efff" />
      </svg>
    </div>
  );
}

export function ReservedSeatArt() {
  return (
    <div className="ms3-reservation">
      <svg viewBox="0 0 128 100">
        <g className="lr-hero-muted" transform="translate(2 35) scale(.34)">
          <ChairShapes />
        </g>
        <g className="lr-hero-muted" transform="translate(89 33) scale(.37)">
          <ChairShapes />
        </g>
        <g className="lr-hero-lit" transform="translate(29 12) scale(.66)">
          <ChairShapes lip />
        </g>
      </svg>
      <img src={liveClassIcon} alt="" draggable={false} />
    </div>
  );
}

export function QuizStackArt() {
  return (
    <div className="ms3-quiz-fan">
      {[1, 2, 0].map(index => <QuizActivityCard key={index} index={index} compact />)}
    </div>
  );
}

export function BeyondVideoArt() {
  return (
    <svg viewBox="0 0 112 89">
      <rect x="4" y="27" width="91" height="59" rx="8" fill="#0a1b47" stroke="#92b5ed" strokeOpacity=".8" />
      <rect x="8" y="31" width="83" height="41" rx="5" fill="#15387a" />
      <path d="M14 65H86M25 35V68M44 35V68M63 35V68M82 35V68" stroke="#b8ddff" strokeOpacity=".16" />
      <path d="M14 56H43" stroke="#e8faff" strokeWidth="1.25" strokeLinecap="round" />
      <OpticsPrism transform="translate(42 52) scale(.37)" />
      {OPTICS_SPECTRUM.map((color, index) => (
        <path key={color} d={`M50 54L89.73 ${28 + (-19 + index * 10) * 0.57}`} stroke={color} strokeWidth="1.3" />
      ))}
      <OpticsProjection transform="translate(96 28) scale(.57)" />
      <path d="M14 76v5m3-5v5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M23 78.5H85" stroke="#536b9d" strokeWidth="2" strokeLinecap="round" />
      <path d="M23 78.5H76" stroke="var(--ds-warning-500)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="76" cy="78.5" r="2" fill="var(--ds-warning-500)" />
    </svg>
  );
}

export function PeakCalendarArt({ date }: { date: string }) {
  const { month, day, cells } = calendarMonth(date);
  return (
    <div className="ms3-calendar">
      <div className="ms3-calendar-month">{MONTHS[month - 1]}</div>
      <div className="ms3-calendar-grid">
        {COPY.peakDay.weekHeads.map(label => <span key={label} className="ms3-calendar-weekday">{label}</span>)}
        {cells.map((cell, index) => (
          <span key={index} className={cell === day ? "ms3-calendar-selected" : undefined}>
            {cell === null ? null : bn(cell)}
          </span>
        ))}
      </div>
    </div>
  );
}
