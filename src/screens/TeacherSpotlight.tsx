import { useEffect, useRef } from "react";
import { useAnimate, usePresence } from "motion/react";
import { COPY } from "../data/copy";
import { usePrefs } from "../lib/prefs";
import { sequence, type Step } from "../lib/sequence";
import { ANSWER, FOCUS, useEntry, useNav } from "../story/entry";
import { focusTimeline } from "./focusHandoff";
import type { ScreenProps } from "./types";
import "../styles/teacher.css";

const OUT = [0.22, 1, 0.36, 1] as const;
const SOFT = [0.33, 0, 0.2, 1] as const;

/**
 * Teacher portrait bust — editorial, not an avatar. Head in a slight three-quarter
 * turn, neck, sloping shoulders and upper torso in a jacket with lapels over an
 * open collar (a pen in the breast pocket): upright, attentive, "teacher" by
 * posture and dress rather than props. No face and no gender cues — V2 "never
 * guess a face". Lit from above by the beam: warm on the head and shoulders, the
 * jacket deepening into the room's violet so the figure rises out of the scene.
 */
function Silhouette() {
  const head =
    "M112 122C100 120 92 112 90 100C88 92 87 84 88 76C88 68 88 60 90 54C94 36 108 26 126 26C146 26 160 40 160 60C160 74 156 84 150 92C146 104 136 116 124 121C120 122 116 122 112 122Z";
  return (
    <svg className="tc-silhouette" viewBox="0 0 240 300" aria-hidden="true">
      <defs>
        {/* Duotone: warm light from above, the room's violet below. User space, so the
            light runs continuously across every shape. */}
        <linearGradient id="tc-skin" gradientUnits="userSpaceOnUse" x1="0" y1="26" x2="0" y2="122">
          <stop offset="0" stopColor="#ffe3bc" />
          <stop offset="1" stopColor="#d6a3ad" />
        </linearGradient>
        <linearGradient id="tc-neck" gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="0" y2="146">
          <stop offset="0" stopColor="#8f6aa6" />
          <stop offset="1" stopColor="#c294ad" />
        </linearGradient>
        <linearGradient id="tc-hair" gradientUnits="userSpaceOnUse" x1="0" y1="22" x2="0" y2="92">
          <stop offset="0" stopColor="#d79c80" />
          <stop offset="1" stopColor="#5b4294" />
        </linearGradient>
        <linearGradient id="tc-jacket" gradientUnits="userSpaceOnUse" x1="0" y1="134" x2="0" y2="300">
          <stop offset="0" stopColor="#ebc0a2" />
          <stop offset="0.38" stopColor="#9c7cbc" />
          <stop offset="1" stopColor="#4c3ca6" />
        </linearGradient>
        <linearGradient id="tc-shirt" gradientUnits="userSpaceOnUse" x1="0" y1="132" x2="0" y2="216">
          <stop offset="0" stopColor="#fbe8d6" />
          <stop offset="1" stopColor="#c7aed3" />
        </linearGradient>
        {/* Light falls on the near side of the face; the far side turns away. */}
        <radialGradient id="tc-turn" gradientUnits="userSpaceOnUse" cx="104" cy="58" r="64">
          <stop offset="0" stopColor="#fff3dc" stopOpacity="0.55" />
          <stop offset="0.55" stopColor="#fff3dc" stopOpacity="0" />
          <stop offset="1" stopColor="#5b4294" stopOpacity="0.35" />
        </radialGradient>
        <clipPath id="tc-head-clip">
          <path d={head} />
        </clipPath>
      </defs>

      {/* neck */}
      <path d="M103 98Q102 124 100 142Q120 153 142 142Q138 124 139 94Z" fill="url(#tc-neck)" />
      {/* shirt, showing in the jacket's opening */}
      <path d="M100 134L140 134L120 216Z" fill="url(#tc-shirt)" />
      {/* jacket */}
      <path
        d="M100 134C86 145 62 151 46 159C30 167 21 183 19 205L14 300H226L221 205C219 183 210 167 194 159C178 151 154 145 140 134L131 150L120 214L109 150Z"
        fill="url(#tc-jacket)"
      />
      {/* open shirt collar */}
      <path d="M101 132L113 155L103 162L95 141Z M139 132L127 155L137 162L145 141Z" fill="url(#tc-shirt)" />
      {/* lapels and pocket, drawn as folds in the cloth */}
      <g fill="none" stroke="#4c3ca6" strokeOpacity="0.4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M95 142L102 164L92 170L112 212" />
        <path d="M145 142L138 164L148 170L128 212" />
        <path d="M152 214H176" />
      </g>
      {/* pen in the breast pocket */}
      <path d="M166 203V214" stroke="#ffe9cf" strokeOpacity="0.75" strokeWidth="3" strokeLinecap="round" />
      {/* head: a slight three-quarter turn — brow, cheek and jaw on the near side, skull and ear behind */}
      <path d={head} fill="url(#tc-skin)" />
      <rect x="80" y="20" width="90" height="110" fill="url(#tc-turn)" clipPath="url(#tc-head-clip)" />
      {/* short hair, a clean hairline across the forehead, wrapping the back of the head; then the ear */}
      <path
        d="M87 68C83 42 101 21 128 21C152 21 166 38 165 62C165 77 162 89 157 97C153 95 150 90 149 84C149 76 148 70 145 65C135 59 122 55 110 53C100 53 92 59 87 68Z"
        fill="url(#tc-hair)"
      />
      <ellipse cx="152" cy="80" rx="5.5" ry="10" fill="#c99aae" />
    </svg>
  );
}

/**
 * 04 Teacher — "Teacher in the Spotlight" (Nov 2026 brief).
 * Copy (PRD, unchanged): framing "যাঁর ক্লাসে সবচেয়ে বেশি ছিলে" · reveal [শিক্ষকের নাম].
 * Omission is compose.ts's job: no reliable teacher record → this slide never exists.
 *
 * An emotional pause after the attendance data: less celebration, more human
 * appreciation. No numbers; slower pacing; warm, soft light.
 * Composition (centred, over Soft Violet): the framing line and — the hero — the
 * name sit in the upper part; one focused warm beam falls from the top edge onto
 * a portrait bust rising from the bottom edge, lit on the head and shoulders.
 * A light veil settles the room (and keeps the lower band calm).
 * Teacher visual, fallback chain: cleared illustrated portrait (transparent 4:5
 * bust, e.g. /assets/teacher/enam-bhaiya.png) → in the bust's place, at full
 * colour; cleared photo → in a yellow-ringed circle;
 * otherwise (generic avatar or none) → the neutral portrait bust. Mock photos
 * (mock://) render the silhouette until a cleared asset exists.
 *
 * Motion — from Screen 03 ("focus shift", FOCUS): the classroom fades, the yellow
 * seat lingers then fades softly; the light comes up slowly from the top, the
 * pool forms, the teacher appears in the light with the framing line; a held
 * beat of stillness; then the name fades softly into place (≈2.6 s). Light and figure (and 03's seats) run on one GSAP timeline
 * (focusHandoff.ts); the text is Motion. Entered any other way, the same
 * sequence runs without the seats, starting at once. No loops.
 * Reduced motion / repeat view: the settled frame.
 */
export function TeacherSpotlight({ slide }: ScreenProps<"teacher">) {
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const fromLive = useEntry().kind === "focus";
  const shift = fromLive ? 0 : -FOCUS.dim.at;
  const at = (t: number) => Math.max(0, t + shift);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const tlRef = useRef<ReturnType<typeof focusTimeline> | null>(null);
  const textRef = useRef<{ stop: () => void } | null>(null);
  const nav = useNav();
  const [isPresent, safeToRemove] = usePresence();
  const portrait = slide.portraitUrl || null;
  const photo = !portrait && slide.photoUrl && !slide.photoUrl.startsWith("mock://") ? slide.photoUrl : null;

  useEffect(() => {
    if (still) return;
    const root = scope.current;
    if (!root) return;
    const from = fromLive ? root.closest(".story")?.querySelector<HTMLElement>(".slide.fr") ?? null : null;
    const tl = focusTimeline(root, { from, shift });
    tlRef.current = tl;
    const steps: Step[] = [
      [".tc-framing", { opacity: [0, 1], y: [10, 0] }, { duration: FOCUS.framing.dur, ease: OUT, at: at(FOCUS.framing.at) }],
      // The name is recognition, not a reveal: a soft fade-up after a held beat.
      [".tc-name > span", { opacity: [0, 1], y: [10, 0] }, { duration: FOCUS.name.dur, ease: SOFT, at: at(FOCUS.name.at) }],
    ];
    const c = sequence(root, animate, steps);
    textRef.current = c ?? null;
    return () => {
      tl.kill();
      c?.stop();
    };
    // entry is fixed for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, animate, scope]);

  // ── exit to Screen 05 ("Spotlight → Answer Reveal"): 05's GSAP timeline takes
  // over the figure, light and veil; here only the text fades (Motion). Any
  // other exit is immediate.
  useEffect(() => {
    if (isPresent) return;
    tlRef.current?.kill();
    textRef.current?.stop();
    if (nav.kind !== "answer" || !scope.current) {
      safeToRemove?.();
      return;
    }
    const c = animate(".tc-copy", { opacity: 0, y: -8 }, { duration: ANSWER.textOut, ease: [0.4, 0, 0.2, 1] });
    const t = window.setTimeout(() => safeToRemove?.(), ANSWER.out * 1000);
    return () => {
      c.stop();
      clearTimeout(t);
    };
    // nav is read at the moment Screen 04 starts leaving
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  return (
    <div ref={scope} className={`slide tc ${still ? "" : "is-pre"}`}>
      <div className="tc-dim" aria-hidden="true" />
      <div className="tc-beam" aria-hidden="true" />
      <div className="tc-pool" aria-hidden="true" />
      <div className={`tc-figure ${photo ? "tc-figure-photo" : portrait ? "tc-figure-portrait" : ""}`} aria-hidden="true">
        {portrait ? (
          <img className="tc-portrait" src={portrait} alt="" decoding="async" />
        ) : photo ? (
          <img className="tc-photo" src={photo} alt="" />
        ) : (
          <Silhouette />
        )}
      </div>

      <div className="tc-copy">
        <p className="tc-framing">{COPY.teacher.framing}</p>
        <h1 className="tc-name">
          <span>{slide.name}</span>
        </h1>
      </div>
    </div>
  );
}
