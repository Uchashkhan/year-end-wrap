import gsap from "gsap";
import { PIVOT } from "./BirdCharacter";

/**
 * The flight system — one shared state drives every moving part, so wings,
 * body, tail, airflow and clouds read as ONE animation:
 *
 *   speed   0…1  how fast the bird climbs (timelines tween it)
 *   amp     deg  wing-stroke amplitude (calmer as it slows)
 *   pitch   deg  the body's lean (forward when accelerating, back when braking)
 *   trail   0…1  airflow strength (follows speed; fades as it slows)
 *   beats   0…1  the Figma wing-beat strokes' strength
 *   climb   px/s the clouds' downward drift at full speed
 *
 * A single gsap.ticker callback integrates the wingbeat phase (frequency rises
 * with speed; the downstroke is quicker than the upstroke) and writes plain SVG
 * transforms — rotations about each joint (PIVOT), no deformation, no filters.
 */
export interface FlightState {
  speed: number;
  amp: number;
  pitch: number;
  trail: number;
  beats: number;
  climb: number;
  /** 0…1: the wings sweep down to the body's sides (before the pose turns), held there. */
  fold: number;
}

export interface Cloud {
  el: HTMLElement;
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number;
  recycle: boolean;
}

/** The held wing angles of a fold: down along the body (closest to the resting pose's folded wings). */
const FOLD_L = -38;
const FOLD_R = 36;

/** Anchors (flying-pose units) the airflow trails start from: under each wing and behind the tail. */
const TRAIL_FROM: [number, number, number][] = [
  // x, y, outward lean
  [46, 116, -1],
  [156, 110, 1],
  [86, 158, -0.35],
];

export function createFlight(opts: {
  rig: HTMLElement;
  trails?: SVGSVGElement | null;
  clouds?: Cloud[];
  frame: () => { W: number; H: number; f: number };
  state?: Partial<FlightState>;
}) {
  const { rig } = opts;
  const s: FlightState = { speed: 0, amp: 24, pitch: 0, trail: 0, beats: 0, climb: 900, fold: 0, ...opts.state };
  const q = (sel: string) => rig.querySelector<SVGGElement>(sel);
  const wingL = q(".bird-flying .bl-wingL");
  const wingR = q(".bird-flying .bl-wingR");
  const tail = q(".bird-flying .bl-tail");
  const beats = q(".bird-flying .bl-beats");
  const tilt = rig.querySelector<HTMLElement>(".bj-rig-tilt");
  const restWingL = q(".bird-resting .bl-wingL");
  const restWingR = q(".bird-resting .bl-wingR");
  const P = PIVOT.flying;
  const trailPaths = opts.trails ? [...opts.trails.querySelectorAll<SVGPathElement>("path")] : [];
  let phase = 0;
  let flow = 0;
  let running = true;

  const tick = (_t: number, deltaMs: number) => {
    if (!running) return;
    const dt = Math.min(deltaMs, 50) / 1000;
    const { W, H, f } = opts.frame();
    // wingbeat: 1.6 Hz drifting → 4.6 Hz at full climb; downstroke ~1.4× quicker
    const freq = 1.6 + 3 * s.speed;
    const down = Math.sin(phase) > 0;
    phase += dt * Math.PI * 2 * freq * (down ? 1.18 : 0.85);
    const k = s.amp / 24; // stroke strength
    const dl = (1 - Math.cos(phase)) / 2; // 0 wings up (the Figma pose) → 1 wings down
    const dr = (1 - Math.cos(phase - 0.14)) / 2; // the right wing trails by a hair
    // folding: the stroke blends into a held down-sweep (wings along the body's sides)
    const aL = (-s.amp * dl) * (1 - s.fold) + FOLD_L * s.fold;
    const aR = (s.amp * 0.93 * dr) * (1 - s.fold) + FOLD_R * s.fold;
    wingL?.setAttribute("transform", `rotate(${aL.toFixed(2)} ${P.wingL![0]} ${P.wingL![1]})`);
    wingR?.setAttribute("transform", `rotate(${aR.toFixed(2)} ${P.wingR![0]} ${P.wingR![1]})`);
    // body: rises a little on each downstroke, leans with acceleration
    const bob = -2.1 * Math.sin(phase - 0.6) * k;
    if (tilt) tilt.style.transform = `translateY(${bob.toFixed(2)}px) rotate(${(s.pitch + 0.7 * Math.sin(phase) * k).toFixed(2)}deg)`;
    // tail: lags the body, answers the lean
    tail?.setAttribute("transform", `rotate(${(-0.45 * s.pitch + 3.2 * Math.sin(phase - 1.15) * k).toFixed(2)} ${P.tail![0]} ${P.tail![1]})`);
    // wing-beat strokes: a short flick as the wings top out
    if (beats) beats.style.opacity = (s.beats * Math.pow(Math.max(0, Math.cos(phase)), 6)).toFixed(3);
    // a resting bird still breathes its wings very slightly (only seen once the pose has turned)
    if (restWingL && restWingR) {
      const b = Math.sin(phase * 0.5) * 1.2 * (1 - s.speed);
      restWingL.setAttribute("transform", `rotate(${(-b).toFixed(2)} ${PIVOT.resting.wingL![0]} ${PIVOT.resting.wingL![1]})`);
      restWingR.setAttribute("transform", `rotate(${b.toFixed(2)} ${PIVOT.resting.wingR![0]} ${PIVOT.resting.wingR![1]})`);
    }

    // airflow: three short streams from under the wings and the tail, flowing down
    if (trailPaths.length) {
      const rx = Number(gsap.getProperty(rig, "x"));
      const ry = Number(gsap.getProperty(rig, "y"));
      const S = Number(gsap.getProperty(rig, "scale"));
      flow += dt * (220 + 900 * s.speed) * f;
      const L = (40 + 150 * s.speed) * f * s.trail;
      trailPaths.forEach((p, i) => {
        const [ax, ay, lean] = TRAIL_FROM[i];
        const x = rx + ax * S;
        const y = ry + (ay + bob) * S + 6 * f;
        const w = lean * (10 + 16 * s.speed) * f;
        p.setAttribute("d", `M${x.toFixed(1)} ${y.toFixed(1)} C${(x + w * 0.2).toFixed(1)} ${(y + L * 0.35).toFixed(1)} ${(x + w * 0.7).toFixed(1)} ${(y + L * 0.7).toFixed(1)} ${(x + w).toFixed(1)} ${(y + L).toFixed(1)}`);
        const seg = Math.max(4, L * 0.42);
        p.style.strokeDasharray = `${seg.toFixed(1)} ${(L * 0.24 + 6).toFixed(1)}`;
        p.style.strokeDashoffset = (-flow - i * 19).toFixed(1);
        p.style.opacity = (0.75 * s.trail * Math.min(1, s.speed * 3)).toFixed(3);
        p.style.strokeWidth = `${(2.4 * f).toFixed(2)}px`;
      });
    }

    // clouds: parallax — nearer clouds pass faster; far ones drift
    opts.clouds?.forEach((c) => {
      c.y += dt * s.speed * s.climb * f * c.depth;
      if (c.recycle && c.y > H + 10) {
        c.y = -c.h - (20 + Math.random() * 120) * f;
        // keep the middle clear for the bird: clouds re-enter at either edge
        const left = Math.random() < 0.5;
        c.x = left ? -c.w * (0.25 + Math.random() * 0.3) : W - c.w * (0.45 + Math.random() * 0.3);
      }
      c.el.style.transform = `translate3d(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px, 0)`;
    });
  };
  gsap.ticker.add(tick);
  tick(0, 16);
  return {
    state: s,
    stop() {
      running = false;
      gsap.ticker.remove(tick);
    },
  };
}
