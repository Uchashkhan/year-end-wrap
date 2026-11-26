import type { LearnerTypeId } from "../data/types";

// Figma Learner Type (198:137), in the order of the numbered badge frames.
const badgeFiles: Record<LearnerTypeId, string> = {
  rhythm: "rhythm.svg",       // 1
  intensity: "intensity.svg", // 2
  focusHigh: "focus-high.svg", // 3
  focusLow: "focus-low.svg",   // 4
  method: "method.svg",        // 5
  nightOwl: "night-owl.svg",   // 6
  balanced: "balanced.svg",    // 7
};

export const LEARNER_BADGE_ORDER = Object.keys(badgeFiles) as LearnerTypeId[];

export function learnerBadgeSrc(type: LearnerTypeId) {
  return `/assets/learner-types/${badgeFiles[type]}`;
}

export function LearnerBadge({ type, className }: { type: LearnerTypeId; className?: string }) {
  return (
    <div className={`lt-badge-art ${className ?? ""}`}>
      <img src={learnerBadgeSrc(type)} alt="" draggable={false} />
    </div>
  );
}
