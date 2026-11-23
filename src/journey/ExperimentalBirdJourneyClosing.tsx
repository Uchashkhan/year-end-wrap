import { useEffect, useLayoutEffect, useRef } from "react";
import { usePresence } from "motion/react";
import gsap from "gsap";
import { COPY } from "../data/copy";
import { usePrefs } from "../lib/prefs";
import { Actions } from "../components/primitives";
import { useEntry } from "../story/entry";
import type { ScreenProps } from "../screens/types";
import { BirdPose, PIVOT, REAR, RESTING, poseBox } from "./BirdCharacter";
import "../styles/journey.css";

/** The cover's year digits (same boxes, glyphs and tilts as the Bird Journey cover). */
const DIGITS = [
  { id: "tl", ch: "২", out: [-1, -1] },
  { id: "tr", ch: "০", out: [1, -1] },
  { id: "bl", ch: "২", out: [-1, 1] },
  { id: "br", ch: "৬", out: [1, 1] },
] as const;

/**
 * The closing's master timeline (s). Overlapping phases, one camera:
 *   A  0–0.45     the marksheet clears in three groups (the badge a beat longer);
 *                 its ink ground opens onto the Cover world's violet
 *   B  0.08–0.75  the Cover world returns: its four year digits slide back in
 *                 from their corners; the front-facing bird lands in its place
 *   C  0.68–1.37  the bird notices ২০২৭: eyes up-right, the head follows, the
 *                 body turns (front → three-quarter rear, head-registered), the
 *                 wings open a little, the tail answers
 *   D  0.72–1.6   the camera follows its gaze up and to the right: ২০২৬ moves
 *                 out behind, ২০২৭ comes in from where it looks (one world,
 *                 parallax by depth); the story chrome never moves
 *   F  1.45–2.15  the closing line, then the actions
 */
export const CLOSING = {
  msFoot: { at: 0, dur: 0.18 },
  msGroups: [
    { at: 0, dur: 0.26 },
    { at: 0.09, dur: 0.26 },
    { at: 0.18, dur: 0.26 },
  ],
  msBadge: { at: 0.2, dur: 0.25 },
  msGround: { at: 0.1, dur: 0.35 },
  digitsIn: { at: 0.08, dur: 0.5 },
  decor: { at: 0.15, dur: 0.4 },
  birdIn: { at: 0.35, dur: 0.27 },
  land: { at: 0.6, dur: 0.15 },
  gaze: { at: 0.68, dur: 0.14 },
  head: { at: 0.74, dur: 0.16 },
  turn: { at: 0.86, dur: 0.12 },
  wings: { at: 0.9, dur: 0.32 },
  tail: { at: 0.95, dur: 0.42 },
  camera: { at: 0.72, dur: 0.88 },
  line: { at: 1.45, dur: 0.5 },
  actions: { at: 1.62, dur: 0.5 },
  end: 2.2,
} as const;

/** The line, exactly as given, with one word kept whole (no break inside "২০২৭-এ"). */
function keepTogether(text: string, word: string) {
  const i = text.indexOf(word);
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <span style={{ whiteSpace: "nowrap" }}>{word}</span>
      {text.slice(i + word.length)}
    </>
  );
}

/** Parallax depth of each world layer (1 = moves with the camera). */
const DEPTH = { far: 0.5, digits: 1.25, next: 0.9 } as const;

/**
 * EXPERIMENT — 11 Closing, "The Journey Continues" (Bird Journey mode only;
 * the approved Closing is untouched). Marksheet → the familiar Cover world →
 * the bird turns toward ২০২৭ → the camera follows → the closing line.
 * Bird: the Figma poses only (front-facing Reference 02, three-quarter rear
 * Pose 03), head-registered so the turn is in place at one size.
 * Copy: the PRD closing line (exact) and the approved closing actions.
 * Reduced motion / repeat view: the final frame.
 */
export function ExperimentalBirdJourneyClosing({ actions }: ScreenProps<"close">) {
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const fromMarksheet = useEntry().kind === "onward";
  const root = useRef<HTMLDivElement>(null);
  const [isPresent, safeToRemove] = usePresence();
  const ctl = useRef<{ stop: () => void; finish: () => void } | null>(null);

  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    const el: HTMLDivElement = node;
    const q = <T extends Element = HTMLElement>(s: string) => el.querySelector(s) as T;
    const qa = <T extends Element = HTMLElement>(s: string) => [...el.querySelectorAll(s)] as T[];
    const W = el.clientWidth;
    const H = el.clientHeight;
    const C = CLOSING;

    // ── the bird: one anchor (its head centre), two poses on it ──
    const bird = q(".bjw-bird");
    const front = q(".bjw-front");
    const rear = q(".bjw-rear");
    // where it starts: exactly the cover's resting bird (Reference 02's slot)
    const slotX = W / 2 - 0.5 - RESTING.w / 2;
    const slotY = H / 2 - 37.12 - 120.5;
    const startAt = { x: slotX + 48.5, y: slotY + 27, scale: 1 };
    // where it ends: centre-left, under ২০২৭, a touch larger
    const endAt = { x: W * 0.4, y: H * 0.43, scale: 1.34 };

    // ── the camera: one value, every world layer follows it at its depth ──
    const cam = { x: 0, y: 0 };
    const camEnd = { x: -0.16 * W, y: 0.95 * H };
    const far = q(".bjw-far");
    const digits = q(".bjw-digits");
    const next = q(".bjw-2027");
    // ২০২৭ lives in the same world, above and to the right: placed so the camera brings it to the upper right
    // (high in the frame, but always clear of the progress bar and close control)
    const nextCy = Math.max(0.17 * H, 64 + next.offsetHeight * 0.42);
    const nextAt = { x: W * 0.6 - next.offsetWidth / 2 - camEnd.x * DEPTH.next, y: nextCy - next.offsetHeight / 2 - camEnd.y * DEPTH.next };
    const frame = () => {
      far.style.transform = `translate3d(${(cam.x * DEPTH.far).toFixed(1)}px, ${(cam.y * DEPTH.far).toFixed(1)}px, 0)`;
      digits.style.transform = `translate3d(${(cam.x * DEPTH.digits).toFixed(1)}px, ${(cam.y * DEPTH.digits).toFixed(1)}px, 0)`;
      next.style.transform = `translate3d(${(nextAt.x + cam.x * DEPTH.next).toFixed(1)}px, ${(nextAt.y + cam.y * DEPTH.next).toFixed(1)}px, 0)`;
    };

    // the front pose's moving parts (resting-pose units)
    const head = q<SVGGElement>(".bjw-front .bl-head");
    const pupils = qa<SVGPathElement>(".bjw-front .bl-eyeL path:nth-child(n+3), .bjw-front .bl-eyeR path:nth-child(2), .bjw-front .bl-eyeR path:nth-child(3)");
    const rWingL = q<SVGGElement>(".bjw-rear .bl-wingL");
    const rWingR = q<SVGGElement>(".bjw-rear .bl-wingR");
    const rTail = q<SVGGElement>(".bjw-rear .bl-tail");
    const P = PIVOT;

    const final = () => {
      cam.x = camEnd.x;
      cam.y = camEnd.y;
      frame();
      gsap.set(bird, { ...endAt, opacity: 1 });
      gsap.set(front, { opacity: 0 });
      gsap.set(rear, { opacity: 1 });
      gsap.set(far, { opacity: 1 });
      gsap.set([q(".bjw-line > span"), q(".bjw-actions")], { clearProps: "transform,opacity" });
    };

    if (still) {
      final();
      return;
    }

    // ── initial state ──
    frame();
    gsap.set(bird, { ...startAt, opacity: 0 });
    gsap.set(front, { opacity: 1 });
    gsap.set(rear, { opacity: 0 });
    gsap.set(far, { opacity: 0 });
    gsap.set(q(".bjw-line > span"), { yPercent: 150 });
    gsap.set(q(".bjw-actions"), { opacity: 0, y: 18 });

    const tl = gsap.timeline({ onComplete: () => finish() });

    // A — the marksheet clears (only when we came from it), the badge last
    const ms = fromMarksheet ? el.closest(".story")?.querySelector<HTMLElement>(".slide.ms") : null;
    // everything this timeline touches on Screen 10, so it can be handed back intact
    const msTouched: HTMLElement[] = ms ? [...ms.querySelectorAll<HTMLElement>(".ms-foot, .bt, .bn-foot, .bn-strip, .bn-head, .bn-type, .bn-badge, .bento, .ms-card")] : [];
    const restoreMarksheet = () => {
      if (!ms?.isConnected) return;
      gsap.killTweensOf(msTouched);
      gsap.set(msTouched, { clearProps: "opacity,transform,backgroundColor,backgroundImage,boxShadow" });
    };
    if (ms) {
      const g = (s: string) => [...ms.querySelectorAll<HTMLElement>(s)];
      tl.to(g(".ms-foot"), { opacity: 0, y: 10, duration: C.msFoot.dur, ease: "sine.in" }, C.msFoot.at);
      const groups = [g('.bt-slot[data-row="pair"] > .bt, .bn-foot'), g('.bt-slot[data-row="hero"] > .bt, .bn-strip'), g(".bt-id > .bn-head, .bt-id > .bn-type")];
      groups.forEach((grp, i) => {
        // each group sinks back and away together (out of focus), the lower chapters first
        if (grp.length) tl.to(grp, { opacity: 0, y: 44, scale: 0.94, duration: C.msGroups[i].dur, ease: "power2.in" }, C.msGroups[i].at);
      });
      // the identity tile's violet thins away; its badge goes a beat later
      tl.to(g(".bt-id"), { backgroundColor: "rgba(0,0,0,0)", backgroundImage: "none", duration: 0.001 }, C.msGroups[2].at);
      tl.fromTo(g(".bt-id"), { boxShadow: "inset 0 0 0 999px rgba(87, 58, 160, 0.9)" }, { boxShadow: "inset 0 0 0 999px rgba(87, 58, 160, 0)", duration: C.msGroups[2].dur, ease: "power2.in" }, C.msGroups[2].at);
      tl.to(g(".bn-badge"), { opacity: 0, scale: 0.9, duration: C.msBadge.dur, ease: "power2.in" }, C.msBadge.at);
      // the emptied card frame (its edge) goes with the last of its content
      tl.to(g(".ms-card"), { opacity: 0, duration: 0.14, ease: "sine.in" }, C.msBadge.at + C.msBadge.dur - 0.1);
      tl.to(g(".bento"), { backgroundColor: "rgba(11, 15, 74, 0)", duration: C.msGround.dur, ease: "sine.inOut" }, C.msGround.at);
      tl.to(g(".ms-card"), { boxShadow: "0 18px 40px rgba(10, 12, 60, 0)", duration: C.msGround.dur, ease: "sine.inOut" }, C.msGround.at);
    }

    // B — the Cover world returns: the digits slide back in from their corners; the bird lands
    qa<HTMLElement>(".bjw-digits .bj-dgm").forEach((m, i) => {
      const [ox, oy] = DIGITS[i].out;
      tl.fromTo(m, { x: ox * 0.42 * W, y: oy * 0.3 * H }, { x: 0, y: 0, duration: C.digitsIn.dur, ease: "power3.out" }, C.digitsIn.at + i * 0.03);
    });
    tl.to(far, { opacity: 1, duration: C.decor.dur, ease: "sine.out" }, C.decor.at);
    tl.fromTo(bird, { opacity: 0, y: startAt.y + 26 }, { opacity: 1, y: startAt.y, duration: C.birdIn.dur, ease: "power2.out" }, C.birdIn.at);
    tl.set(front, { transformOrigin: "50% 100%" }, C.land.at);
    tl.to(front, { keyframes: { scaleY: [1, 0.94, 1], scaleX: [1, 1.04, 1], easeEach: "sine.inOut" }, duration: C.land.dur, ease: "none" }, C.land.at);

    // C — it notices ২০২৭: eyes, then head, then the body turns
    tl.to(pupils, { x: 1.4, y: -1.6, duration: C.gaze.dur, ease: "power2.out" }, C.gaze.at);
    tl.set(head, { svgOrigin: `${P.resting.neck![0]} ${P.resting.neck![1]}` }, 0);
    tl.to(head, { rotation: 6, x: 1, duration: C.head.dur, ease: "sine.inOut" }, C.head.at);
    tl.to(rear, { opacity: 1, duration: C.turn.dur, ease: "none" }, C.turn.at);
    tl.to(front, { opacity: 0, duration: C.turn.dur, ease: "none" }, C.turn.at + 0.04);
    // the rear pose's wings open a little from just-folded; the tail answers the turn
    tl.fromTo(rWingL, { rotation: 10, svgOrigin: `${P.rear.wingL![0]} ${P.rear.wingL![1]}` }, { rotation: 0, duration: C.wings.dur, ease: "power2.out" }, C.wings.at);
    tl.fromTo(rWingR, { rotation: -12, svgOrigin: `${P.rear.wingR![0]} ${P.rear.wingR![1]}` }, { rotation: 0, duration: C.wings.dur, ease: "power2.out" }, C.wings.at);
    tl.fromTo(rTail, { rotation: 0, svgOrigin: `${P.rear.tail![0]} ${P.rear.tail![1]}` }, { keyframes: { rotation: [0, 6, -3, 0], easeEach: "sine.inOut" }, duration: C.tail.dur, ease: "none" }, C.tail.at);

    // D — the camera follows its gaze; the bird stays in frame, settling under ২০২৭
    tl.to(cam, { x: camEnd.x, y: camEnd.y, duration: C.camera.dur, ease: "power2.inOut", onUpdate: frame }, C.camera.at);
    tl.to(bird, { x: endAt.x, y: endAt.y, scale: endAt.scale, duration: C.camera.dur, ease: "power2.inOut" }, C.camera.at);

    // F — the closing line, then the actions
    tl.to(q(".bjw-line > span"), { yPercent: 0, duration: C.line.dur, ease: "expo.out" }, C.line.at);
    tl.to(q(".bjw-actions"), { opacity: 1, y: 0, duration: C.actions.dur, ease: "power2.out" }, C.actions.at);
    tl.set({}, {}, C.end);

    let done = false;
    function finish() {
      if (done) return;
      done = true;
      tl.progress(1);
      tl.kill();
      final();
    }
    // Leaving early (e.g. a quick tap back to 10 while it is still mounted): stop, and give Screen 10 back as it was.
    ctl.current = { stop: () => { tl.kill(); restoreMarksheet(); }, finish };
    return () => {
      tl.kill();
    };
    // the entry is fixed for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still]);

  const wasLeaving = useRef(false);
  useEffect(() => {
    if (isPresent) {
      if (wasLeaving.current) {
        wasLeaving.current = false;
        ctl.current?.finish();
      }
      return;
    }
    wasLeaving.current = true;
    ctl.current?.stop();
    safeToRemove?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  const fb = poseBox("resting", 51);
  const rb = poseBox("rear", 51);
  return (
    <div ref={root} className="slide bj bjw">
      <p className="bjw-sr">{COPY.close.prdLine}</p>
      {/* the world the camera moves through (Reference 02's Cover world + the next checkpoint) */}
      <div className="bjw-far" aria-hidden="true">
        <img className="bj-decor" src="/assets/journey/cover-decorations.svg" alt="" />
      </div>
      <div className="bjw-digits" aria-hidden="true">
        {DIGITS.map((d) => (
          <div key={d.id} className={`bj-dg bj-dg-${d.id}`}>
            <div className="bj-dgm">
              <span className="bj-glyph">{d.ch}</span>
            </div>
          </div>
        ))}
      </div>
      <span className="bjw-2027" aria-hidden="true">
        ২০২৭
      </span>

      {/* the bird: its head centre is the anchor; both poses are placed around it at one head size */}
      <div className="bjw-bird" aria-hidden="true">
        <div className="bjw-pose bjw-front" style={{ left: fb.left, top: fb.top, width: fb.width, height: fb.height }}>
          <BirdPose pose={RESTING} name="resting" />
        </div>
        <div className="bjw-pose bjw-rear" style={{ left: rb.left, top: rb.top, width: rb.width, height: rb.height }}>
          <BirdPose pose={REAR} name="rear" />
        </div>
      </div>

      <div className="bjw-copy">
        <h1 className="bjw-line" aria-hidden="true">
          <span>{keepTogether(COPY.close.prdLine, "২০২৭-এ")}</span>
        </h1>
        <div className="bjw-actions">
          <Actions
            primary={{ label: COPY.close.primary, onClick: actions.exitToHome }}
            secondary={{ label: COPY.close.secondary, onClick: () => actions.share("marksheet") }}
          />
        </div>
      </div>
    </div>
  );
}
