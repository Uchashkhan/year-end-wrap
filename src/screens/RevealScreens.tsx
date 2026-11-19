/** 04 · 07 · 08 — "reveal a name/date" slides. */
import { COPY, SUBJECTS } from "../data/copy";
import { bnDate } from "../lib/bangla";
import { AssetPlaceholder } from "../components/primitives";
import type { ScreenProps } from "./types";

export function Teacher({ slide }: ScreenProps<"teacher">) {
  // V2 fallback chain: photo → generic avatar (male/female) → name only. Never guess a face.
  const portrait = slide.photoUrl ? (
    slide.photoUrl.startsWith("mock://") ? (
      <AssetPlaceholder label="cleared teacher photo" w={128} h={128} round />
    ) : (
      <img className="teacher-photo" src={slide.photoUrl} alt="" />
    )
  ) : slide.avatar ? (
    <AssetPlaceholder label={`generic ${slide.avatar} avatar`} w={128} h={128} round />
  ) : null;

  return (
    <div className="slide slide-center">
      <p className="eyebrow">{COPY.teacher.framing}</p>
      {portrait && <div className="teacher-portrait">{portrait}</div>}
      <h2 className="display reveal-name">{slide.name}</h2>
    </div>
  );
}

export function Subject({ slide }: ScreenProps<"subject">) {
  const s = SUBJECTS[slide.subject];
  return (
    <div className="slide slide-center">
      <p className="eyebrow">{COPY.subject.headline}</p>
      <h2 className="display reveal-name" style={{ color: "var(--stage-ink)" }}>
        <span className="subject-chip" style={{ background: s.color }} aria-hidden="true" />
        {s.name}
      </h2>
      {/* V2 must-show: the "most time" line — this is time, not marks. */}
      <p className="support">{COPY.subject.support}</p>
      {slide.runnersUp.length > 0 && (
        <p className="note">{COPY.subject.runnersUp(slide.runnersUp.map((id) => SUBJECTS[id].name))}</p>
      )}
    </div>
  );
}

export function PeakDay({ slide }: ScreenProps<"peakDay">) {
  const d = bnDate(slide.date);
  return (
    <div className="slide slide-center">
      <p className="eyebrow">{COPY.peakDay.headline}</p>
      <h2 className="display reveal-name">{d.short}</h2>
      <p className="note">{d.weekday}</p>
      <p className="support">{slide.hours ? COPY.peakDay.timeThatDay(slide.hours) : COPY.peakDay.support}</p>
    </div>
  );
}
