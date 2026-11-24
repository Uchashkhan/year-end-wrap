import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePresence } from "motion/react";
import gsap from "gsap";
import { COPY } from "../data/copy";
import { usePrefs } from "../lib/prefs";
import { Actions } from "../components/primitives";
import { useEntry } from "../story/entry";
import type { ScreenProps } from "../screens/types";
import { BirdPose, PIVOT, REAR, RESTING, poseBox } from "./BirdCharacter";
import { createFlight } from "./flight";
import { GATE, Gateway } from "./Gateway";
import "../styles/journey.css";

/** The cover's year digits (same boxes, glyphs and tilts as the Bird Journey cover); `out` = the corner each slides in from. */
const DIGITS = [
  { id: "tl", ch: "২", out: [-1, -1] },
  { id: "tr", ch: "০", out: [1, -1] },
  { id: "bl", ch: "২", out: [-1, 1] },
  { id: "br", ch: "৬", out: [1, 1] },
] as const;

/** Clouds the climb passes (opening's art, faint on the night ground): world y as a share of H (negative = above the cover). */
// (each passes the bird and clears the frame's lower half by the end, so none settles behind the words;
// the last stays high at the left, beside the gateway)
const CLOUDS = [
  { src: "cloud1", x: -0.12, y: -0.18, w: 0.42, depth: 1.15 },
  { src: "cloud3", x: 0.78, y: -0.48, w: 0.24, depth: 0.95 },
  { src: "cloud2", x: -0.04, y: -0.86, w: 0.3, depth: 1.15 },
  { src: "cloud1", x: 0.7, y: -1.2, w: 0.4, depth: 1.3 },
  { src: "cloud3", x: 0.02, y: -1.45, w: 0.22, depth: 0.95 },
] as const;

/** Parallax depth of each world layer (1 = moves with the camera; < 1 = farther away). */
const DEPTH = { far: 0.35, digits: 1.3, gate: 0.55 } as const;

/**
 * "The Next Checkpoint" — one master timeline (s), phases overlapping:
 *   A  0–0.6      the marksheet recedes as one artifact; the Cover world's ground shows
 *   B  0.45–1.2   the Cover world: stars, the four ২০২৬ digits slide home, the
 *                 front-facing bird takes its place — a beat to breathe
 *   C  1.15–1.7   the bird notices where it is going: eyes up-right, the head
 *                 follows, the body turns (front → three-quarter rear, one size),
 *                 the wings open, the first air moves
 *   D  1.55–4.4   it flies: one shared speed drives the wingbeat, the airflow and
 *                 the camera (accelerate → cruise → long deceleration); ২০২৬
 *                 falls away below, clouds pass at their depths, the gateway comes
 *                 down from the top of the world and grows a little as it nears
 *   E  ~4.0–4.4   everything settles: the bird hovers below the gateway, short of it
 *   F  4.3–4.95   the closing line (masked rise), then the actions
 */
export const CLOSING = {
  ms: { at: 0, dur: 0.6 },
  decor: { at: 0.45, dur: 0.5 },
  digitsIn: { at: 0.5, dur: 0.62 },
  birdIn: { at: 0.6, dur: 0.32 },
  gaze: { at: 1.15, dur: 0.16 },
  head: { at: 1.22, dur: 0.2 },
  turn: { at: 1.36, dur: 0.14 },
  open: { at: 1.42, dur: 0.3 },
  flight: { at: 1.55, dur: 2.85 },
  line: { at: 4.3, dur: 0.55 },
  actions: { at: 4.45, dur: 0.5 },
  end: 4.95,
} as const;

/**
 * The climb's speed over the flight (u = 0…1): from rest, up to cruise by
 * 0.24, held, then a long ease down to a hover (not zero: it keeps flying).
 * Returns the normalised distance E(u) and the speed v(u) (0…1).
 */
function climbProfile() {
  const v = (u: number) => {
    if (u < 0.24) {
      const k = u / 0.24;
      return 0.04 + 0.96 * k * k * (3 - 2 * k);
    }
    if (u < 0.52) return 1;
    const k = (u - 0.52) / 0.48;
    return 0.1 + 0.9 * (1 - k) ** 2;
  };
  const N = 600;
  const cum = [0];
  for (let i = 1; i <= N; i++) cum.push(cum[i - 1] + v((i - 0.5) / N) / N);
  const total = cum[N];
  return {
    E: (u: number) => {
      const x = Math.max(0, Math.min(1, u)) * N;
      const i = Math.floor(x);
      return (cum[i] + (cum[Math.min(N, i + 1)] - cum[i]) * (x - i)) / total;
    },
    v: (u: number) => v(Math.max(0, Math.min(1, u))),
  };
}

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

/**
 * EXPERIMENT — 11 Closing, "The Next Checkpoint" (Bird Journey mode only; the
 * approved Closing is untouched). Marksheet → the familiar ২০২৬ Cover world →
 * the bird turns → it flies again → ২০২৬ falls away → the ২০২৭ gateway
 * approaches → the bird hovers short of it, the next journey still ahead →
 * the closing line and actions.
 *
 * One world under one camera: every layer is placed from the same camera
 * value at its own depth; the story chrome (progress, close) is outside it.
 * The bird is the Figma poses only (front-facing Reference 02, three-quarter
 * rear Pose 03), head-registered, flown by the opening's flight system.
 * Copy: the PRD closing line (exact) and the approved closing actions.
 * Tap during the sequence to skip to the settled frame. Reduced motion /
 * repeat view: the settled frame, still.
 */
export function ExperimentalBirdJourneyClosing({ actions }: ScreenProps<"close">) {
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const fromMarksheet = useEntry().kind === "onward";
  const root = useRef<HTMLDivElement>(null);
  const [isPresent, safeToRemove] = usePresence();
  const [playing, setPlaying] = useState(!still);
  const ctl = useRef<{ stop: () => void; finish: () => void } | null>(null);

  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    const el: HTMLDivElement = node;
    const q = <T extends Element = HTMLElement>(s: string) => el.querySelector(s) as T;
    const qa = <T extends Element = HTMLElement>(s: string) => [...el.querySelectorAll(s)] as T[];
    const W = el.clientWidth;
    const H = el.clientHeight;
    const f = W / 412;
    const C = CLOSING;

    // ── the final composition: gateway above, bird in the middle, words below ──
    const copy = q(".bjw-copy");
    const copyTop = H - copy.offsetHeight - parseFloat(getComputedStyle(copy).bottom);
    const top0 = Math.max(66, 0.075 * H);
    const avail = copyTop - top0;
    const gw = Math.min(0.66 * W, 286, ((avail * 0.42) * GATE.w) / GATE.h);
    const gh = (gw * GATE.h) / GATE.w;
    const gate = q(".bjw-gate");
    gate.style.width = `${gw}px`;
    const gateEnd = { x: W * 0.55 - gw / 2, y: top0 };
    const rb = poseBox("rear", 51);
    const unit = rb.width / REAR.w; // rear-pose units → px at scale 1
    const bs = Math.max(0.9, Math.min(1.28, avail / 430)); // the bird's settled scale
    const above = 45 * unit * bs; // head centre (rear pose y 45) → top of the pose
    const below = (REAR.h - 45) * unit * bs;
    const free = copyTop - 14 - (gateEnd.y + gh) - (above + below);
    const birdEnd = { x: W * 0.43, y: gateEnd.y + gh + free * 0.6 + above, scale: bs };

    // where it starts: exactly the cover's resting bird (Reference 02's slot)
    const slotX = W / 2 - 0.5 - RESTING.w / 2;
    const slotY = H / 2 - 37.12 - 120.5;
    const birdStart = { x: slotX + 48.5, y: slotY + 27, scale: 1 };

    // ── the camera: one value; every layer is placed from it at its depth ──
    const cam = { y: 0 };
    const camEnd = 1.75 * H;
    const far = q(".bjw-far");
    const digits = q(".bjw-digits");
    const clouds = qa<HTMLElement>(".bjw-cloud").map((c, i) => ({ el: c, ...CLOUDS[i] }));
    const gateY0 = gateEnd.y - camEnd * DEPTH.gate;
    const frame = () => {
      const e = cam.y / camEnd;
      far.style.transform = `translate3d(0, ${(cam.y * DEPTH.far).toFixed(1)}px, 0)`;
      digits.style.transform = `translate3d(0, ${(cam.y * DEPTH.digits).toFixed(1)}px, 0)`;
      clouds.forEach((c) => (c.el.style.transform = `translate3d(${(c.x * W).toFixed(1)}px, ${(c.y * H + cam.y * c.depth).toFixed(1)}px, 0)`));
      // the gateway: far away (slow) and a little smaller until the bird nears it
      const sc = 0.64 + 0.36 * Math.pow(e, 1.6);
      gate.style.transform = `translate3d(${gateEnd.x.toFixed(1)}px, ${(gateY0 + cam.y * DEPTH.gate).toFixed(1)}px, 0) scale(${sc.toFixed(4)})`;
    };

    const bird = q(".bjw-bird");
    const front = q(".bjw-front");
    const rear = q(".bjw-rear");
    const head = q<SVGGElement>(".bjw-front .bl-head");
    const pupils = qa<SVGPathElement>(".bjw-front .bl-eyeL path:nth-child(n+3), .bjw-front .bl-eyeR path:nth-child(2), .bjw-front .bl-eyeR path:nth-child(3)");
    const lineSpan = q(".bjw-line > span");
    const actionsEl = q(".bjw-actions");

    // the flight system (the opening's), on the rear pose; airflow anchors follow the bird
    let flight: ReturnType<typeof createFlight> | null = null;
    const startFlight = (state: Partial<{ speed: number; amp: number; trail: number; pitch: number }>) => {
      flight?.stop();
      flight = createFlight({
        rig: bird,
        pose: "rear",
        tilt: q<HTMLElement>(".bjw-rear-tilt"),
        trails: q<SVGSVGElement>(".bjw-air"),
        frame: () => ({ W, H, f }),
        state,
        anchor: (ax, ay) => {
          const bx = Number(gsap.getProperty(bird, "x"));
          const by = Number(gsap.getProperty(bird, "y"));
          const S = Number(gsap.getProperty(bird, "scale"));
          return [bx + (rb.left + ax * unit) * S, by + (rb.top + ay * unit) * S, S * unit];
        },
      });
      return flight.state;
    };
    const HOVER = { speed: 0.1, amp: 9, trail: 0.12, pitch: 3 };

    const final = () => {
      cam.y = camEnd;
      frame();
      gsap.set(bird, { ...birdEnd, opacity: 1 });
      gsap.set(front, { opacity: 0 });
      gsap.set(rear, { opacity: 1 });
      gsap.set(far, { opacity: 1 });
      gsap.set([lineSpan, actionsEl], { clearProps: "transform,opacity" });
    };

    if (still) {
      final();
      return;
    }

    // ── initial state ──
    frame();
    gsap.set(bird, { ...birdStart, opacity: 0 });
    gsap.set(front, { opacity: 1 });
    gsap.set(rear, { opacity: 0 });
    gsap.set(far, { opacity: 0 });
    gsap.set(lineSpan, { yPercent: 150 });
    gsap.set(actionsEl, { opacity: 0, y: 18 });
    qa<HTMLElement>(".bjw-digits .bj-dgm").forEach((m, i) => {
      const [ox, oy] = DIGITS[i].out;
      gsap.set(m, { x: ox * 0.42 * W, y: oy * 0.3 * H });
    });

    const tl = gsap.timeline({ onComplete: () => finish() });

    // A — the marksheet recedes as one artifact (only when we came from it)
    const ms = fromMarksheet ? el.closest(".story")?.querySelector<HTMLElement>(".slide.ms") : null;
    const msTouched: HTMLElement[] = ms ? [...ms.querySelectorAll<HTMLElement>(".ms-card, .ms-title, .ms-foot")] : [];
    const restoreMarksheet = () => {
      if (!ms?.isConnected) return;
      gsap.killTweensOf(msTouched);
      gsap.set(msTouched, { clearProps: "opacity,transform" });
    };
    if (ms) {
      const g = (s: string) => [...ms.querySelectorAll<HTMLElement>(s)];
      tl.to(g(".ms-foot, .ms-title"), { opacity: 0, duration: 0.22, ease: "sine.in" }, C.ms.at);
      tl.to(g(".ms-card"), { scale: 0.84, y: -0.04 * H, opacity: 0, transformOrigin: "50% 40%", duration: C.ms.dur, ease: "power2.in" }, C.ms.at);
    }

    // B — the Cover world: the stars, the four ২০২৬ digits slide home, the bird takes its place
    tl.to(far, { opacity: 1, duration: C.decor.dur, ease: "sine.out" }, C.decor.at);
    qa<HTMLElement>(".bjw-digits .bj-dgm").forEach((m, i) => {
      tl.to(m, { x: 0, y: 0, duration: C.digitsIn.dur, ease: "power3.out" }, C.digitsIn.at + i * 0.04);
    });
    tl.fromTo(bird, { opacity: 0, y: birdStart.y + 22 }, { opacity: 1, y: birdStart.y, duration: C.birdIn.dur, ease: "power2.out" }, C.birdIn.at);

    // C — it notices where it's going: eyes, head, then the body turns and the wings open
    tl.to(pupils, { x: 1.4, y: -1.6, duration: C.gaze.dur, ease: "power2.out" }, C.gaze.at);
    tl.set(head, { svgOrigin: `${PIVOT.resting.neck![0]} ${PIVOT.resting.neck![1]}` }, 0);
    tl.to(head, { rotation: 7, x: 1, duration: C.head.dur, ease: "sine.inOut" }, C.head.at);
    const fs = { speed: 0, amp: 0, trail: 0, pitch: 0 };
    tl.call(() => Object.assign(fs, startFlight({ speed: 0, amp: 0, trail: 0, pitch: 0 })), [], C.turn.at - 0.02);
    tl.to(rear, { opacity: 1, duration: C.turn.dur, ease: "none" }, C.turn.at);
    tl.to(front, { opacity: 0, duration: C.turn.dur, ease: "none" }, C.turn.at + 0.04);
    const open = { a: 0 };
    tl.to(open, {
      a: 1,
      duration: C.open.dur,
      ease: "sine.inOut",
      onUpdate: () => {
        if (flight) Object.assign(flight.state, { amp: 10 * open.a, trail: 0.15 * open.a, speed: 0.04 });
      },
    }, C.open.at);

    // D + E — the flight: one progress value drives the speed, the camera and the bird
    const prof = climbProfile();
    const fl = { u: 0 };
    const lift = 0.07 * H; // the bird leads: it rises off its place before the camera catches up
    tl.to(fl, {
      u: 1,
      duration: C.flight.dur,
      ease: "none",
      onUpdate: () => {
        const u = fl.u;
        const v = prof.v(u);
        cam.y = camEnd * prof.E(u);
        frame();
        if (flight) Object.assign(flight.state, { speed: v, amp: 10 + 14 * v, trail: 0.15 + 0.75 * v, pitch: 3 + 5 * v });
        // the bird's place in frame: up off the cover (leading), then easing down into its settled place
        const k = gsap.parseEase("sine.inOut")(Math.min(1, u / 0.3));
        const m = gsap.parseEase("power2.inOut")(Math.max(0, (u - 0.18) / 0.82));
        const y = birdStart.y - lift * k * (1 - m) + (birdEnd.y - birdStart.y) * m;
        const x = birdStart.x + (birdEnd.x - birdStart.x) * gsap.parseEase("sine.inOut")(u);
        gsap.set(bird, { x, y, scale: birdStart.scale + (birdEnd.scale - birdStart.scale) * gsap.parseEase("sine.inOut")(u) });
      },
    }, C.flight.at);

    // F — the closing line, then the actions
    tl.to(lineSpan, { yPercent: 0, duration: C.line.dur, ease: "expo.out" }, C.line.at);
    tl.to(actionsEl, { opacity: 1, y: 0, duration: C.actions.dur, ease: "power2.out" }, C.actions.at);
    tl.set({}, {}, C.end);

    let done = false;
    function finish() {
      if (done) return;
      done = true;
      tl.progress(1);
      tl.kill();
      final();
      // it keeps flying in place: a slow hover beat, the air almost still
      if (!flight) startFlight(HOVER);
      else Object.assign(flight.state, HOVER);
      setPlaying(false);
    }
    // Leaving early (e.g. a quick tap back to 10 while it is still mounted): stop, and give Screen 10 back as it was.
    ctl.current = {
      stop: () => {
        tl.kill();
        flight?.stop();
        restoreMarksheet();
      },
      finish,
    };
    return () => {
      tl.kill();
      flight?.stop();
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
      {/* the world the camera moves through: the Cover world below, the gateway far above */}
      <div className="bjw-far" aria-hidden="true">
        <img className="bj-decor" src="/assets/journey/cover-decorations.svg" alt="" />
        <img className="bj-decor bjw-decor-2" src="/assets/journey/cover-decorations.svg" alt="" />
      </div>
      {CLOUDS.map((c, i) => (
        <img key={i} className="bjw-cloud" src={`/assets/journey/${c.src}.svg`} alt="" aria-hidden="true" style={{ width: `${c.w * 100}cqw` }} />
      ))}
      <div className="bjw-gate" aria-hidden="true">
        <Gateway year="২০২৭" />
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

      <svg className="bjw-air" aria-hidden="true">
        <path />
        <path />
        <path />
      </svg>

      {/* the bird: its head centre is the anchor; both poses are placed around it at one head size */}
      <div className="bjw-bird" aria-hidden="true">
        <div className="bjw-pose bjw-front" style={{ left: fb.left, top: fb.top, width: fb.width, height: fb.height }}>
          <BirdPose pose={RESTING} name="resting" />
        </div>
        <div className="bjw-pose bjw-rear" style={{ left: rb.left, top: rb.top, width: rb.width, height: rb.height }}>
          <div className="bjw-rear-tilt">
            <BirdPose pose={REAR} name="rear" />
          </div>
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
      {playing && <button type="button" className="bj-skip" aria-label="এগিয়ে যাও" onClick={() => ctl.current?.finish()} />}
    </div>
  );
}
