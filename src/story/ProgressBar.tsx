/** Story progress: one segment per slide in *this student's* deck. */
export function ProgressBar({ count, index, progress }: { count: number; index: number; progress: number }) {
  return (
    <div className="progress" role="progressbar" aria-valuemin={1} aria-valuemax={count} aria-valuenow={index + 1}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="progress-seg">
          <span
            className="progress-fill"
            style={{ transform: `scaleX(${i < index ? 1 : i === index ? progress : 0})` }}
          />
        </span>
      ))}
    </div>
  );
}
