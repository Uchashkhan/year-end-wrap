import { useId } from "react";
import type { LearnerTypeId } from "../data/types";

/**
 * The learner-type badge, as ONE replaceable component.
 *
 * Today every type shows the dummy badge from shikho_learner_type_big_reveal.html
 * (a gold-rimmed shield, "SHIKHO", a star, "2026"; viewBox 220 × 240). When the
 * Figma badges arrive, add each type's file to BADGE_ART (an SVG or PNG under
 * public/assets/learner-types/) — the screen, its layout and its animation do
 * not change. The art always fills the 220 : 240 box (object-fit: contain), so
 * its aspect ratio holds through every transform.
 */
export const BADGE_ART: Partial<Record<LearnerTypeId, string>> = {
  // rhythm: "/assets/learner-types/rhythm.svg",
};

export function LearnerBadge({ type, className }: { type: LearnerTypeId; className?: string }) {
  const src = BADGE_ART[type];
  return (
    <div className={`lt-badge-art ${className ?? ""}`}>{src ? <img src={src} alt="" draggable={false} /> : <DummyBadge />}</div>
  );
}

/** The reference's placeholder shield (Option A colours), unchanged. */
function DummyBadge() {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 220 240" aria-hidden="true">
      <defs>
        <linearGradient id={`bevel-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff7cd" />
          <stop offset="1" stopColor="#f5b929" />
        </linearGradient>
      </defs>
      <path d="M110 7 L191 45 L193 153 Q190 190 110 231 Q30 190 27 153 L29 45 Z" fill={`url(#bevel-${id})`} stroke="#fff9d8" strokeWidth="3" />
      <path d="M110 19 L180 51 L181 149 Q177 180 110 215 Q43 180 39 149 L40 51 Z" fill="#3927a3" />
      <path d="M110 31 L168 57 L169 144 Q166 170 110 200 Q54 170 51 144 L52 57 Z" fill="none" stroke="#ffefa9" strokeWidth="2" strokeDasharray="4 7" />
      <text x="110" y="76" textAnchor="middle" style={{ font: "bold 13px Arial, sans-serif", letterSpacing: 2, fill: "#fff" }}>
        SHIKHO
      </text>
      <path d="M110 89 l11 23 25 4 -18 18 4 26 -22 -12 -22 12 4 -26 -18 -18 25 -4z" fill="#ffcd41" />
      <text x="110" y="183" textAnchor="middle" style={{ font: "700 14px Arial, sans-serif", fill: "#fff" }}>
        2026
      </text>
    </svg>
  );
}
