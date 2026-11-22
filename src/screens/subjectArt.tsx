import type { ComponentType } from "react";
import { SUBJECTS } from "../data/copy";
import type { SubjectId } from "../data/types";

/**
 * Screen 07 "Subject Takes Over" — the per-subject visual system.
 * One entry per subject: how its Bengali name breaks into lines for the hero
 * (the last line takes the accent colour), and the illustration that "takes
 * over" around it. Colours come from SUBJECTS (copy.ts; Physics and Math are
 * PRD-verified, the rest placeholders).
 *
 * Physics has its full custom artwork (the prototype's atom). Every other
 * subject uses the neutral fallback, drawn in its own subject colour, until its
 * custom artwork is designed — the atom is never reused for another subject.
 */
export type SubjectArtProps = { color: string };
export type SubjectVisual = { lines: string[]; Art: ComponentType<SubjectArtProps>; custom: boolean };

/** Physics — the prototype's atom: three orbits, nucleus, electrons, sparks. viewBox 540 × 420. */
function PhysicsArt() {
  return (
    <svg className="sb-svg" viewBox="0 0 540 420" aria-hidden="true">
      <defs>
        <radialGradient id="sb-core-glow">
          <stop stopColor="#e3e7ff" stopOpacity=".33" />
          <stop offset=".6" stopColor="#879dfb" stopOpacity=".08" />
          <stop offset="1" stopColor="#879dfb" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="285" cy="216" r="192" fill="url(#sb-core-glow)" />
      <circle cx="285" cy="216" r="165" className="sb-ring-thin" />
      <g>
        <ellipse cx="285" cy="216" rx="186" ry="69" transform="rotate(-33 285 216)" className="sb-orbit sb-o1" />
        <ellipse cx="285" cy="216" rx="186" ry="69" transform="rotate(35 285 216)" className="sb-orbit sb-o2" />
        <ellipse cx="285" cy="216" rx="186" ry="69" transform="rotate(89 285 216)" className="sb-orbit sb-o3" />
      </g>
      <circle cx="285" cy="216" r="57" className="sb-nucleus" />
      <circle cx="285" cy="216" r="31" className="sb-core" />
      <circle cx="151" cy="304" r="10" className="sb-electron" />
      <circle cx="442" cy="141" r="11" className="sb-electron sb-b" />
      <circle cx="276" cy="29" r="9" className="sb-electron sb-c" />
      <path d="M87 123L91 132L100 136L91 140L87 149L83 140L74 136L83 132Z" className="sb-spark" opacity=".85" />
      <path d="M450 345L454 354L463 358L454 362L450 371L446 362L437 358L446 354Z" className="sb-spark" opacity=".6" />
      <circle cx="105" cy="271" r="3" fill="#f9c531" />
      <circle cx="474" cy="231" r="4" fill="#55d7eb" />
    </svg>
  );
}

/**
 * Fallback for subjects without custom artwork yet: concentric arcs and a few
 * marks in the subject's own colour — calm, abstract, and clearly not the atom.
 */
function FallbackArt({ color }: SubjectArtProps) {
  return (
    <svg className="sb-svg" viewBox="0 0 540 420" aria-hidden="true">
      <defs>
        <radialGradient id="sb-fb-glow">
          <stop stopColor={color} stopOpacity=".28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="285" cy="216" r="192" fill="url(#sb-fb-glow)" />
      {[150, 112, 74].map((r, i) => (
        <path
          key={r}
          d={`M${285 - r} 216A${r} ${r} 0 1 1 ${285 + r * Math.cos(Math.PI / 5)} ${216 + r * Math.sin(Math.PI / 5)}`}
          fill="none"
          stroke={i === 1 ? "#fff" : color}
          strokeOpacity={i === 1 ? 0.7 : 1}
          strokeWidth="5"
          strokeLinecap="round"
        />
      ))}
      <circle cx="285" cy="216" r="30" fill="#f9c531" />
      <circle cx="135" cy="216" r="9" fill={color} />
      <circle cx="406" cy="304" r="8" fill="#f9c531" />
      <path d="M450 110L454 119L463 123L454 127L450 136L446 127L437 123L446 119Z" fill="#fff" opacity=".7" />
    </svg>
  );
}

const fallback = (lines: string[]): SubjectVisual => ({ lines, Art: FallbackArt, custom: false });

export const SUBJECT_VISUAL: Record<SubjectId, SubjectVisual> = {
  physics: { lines: ["পদার্থ", "বিজ্ঞান"], Art: PhysicsArt, custom: true },
  math: fallback(["গণিত"]),
  chemistry: fallback(["রসায়ন"]),
  biology: fallback(["জীব", "বিজ্ঞান"]),
  higherMath: fallback(["উচ্চতর", "গণিত"]),
  bangla: fallback(["বাংলা"]),
  english: fallback(["ইংরেজি"]),
  ict: fallback(["আইসিটি"]),
};

export const subjectColor = (id: SubjectId) => SUBJECTS[id].color;
