import { SUBJECTS } from "../data/copy";
import type { SubjectId } from "../data/types";
import "../styles/quiz-activities.css";

const CARD_SUBJECTS: SubjectId[] = ["physics", "chemistry", "math", "biology"];

export function QuizActivityCard({ index, compact }: { index: number; compact?: boolean }) {
  const subject = SUBJECTS[CARD_SUBJECTS[index % CARD_SUBJECTS.length]];
  const selected = (index * 7 + 1) % 4;
  return (
    <div className="qr-card">
      <div className="qr-sj">
        <i style={{ background: subject.color }} />
        {compact ? <b /> : subject.name}
      </div>
      <div className="qr-q" />
      <div className="qr-q qr-q-s" />
      {[0, 1, 2, 3].map((option) => (
        <span key={option} className={`qr-o${option === selected ? " qr-ok" : ""}`}>
          <i />
          <b style={{ width: `${50 + ((index + option * 3) % 4) * 12}%` }} />
        </span>
      ))}
    </div>
  );
}
