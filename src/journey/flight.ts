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
 * A single gsap.ticker callback integrates the wingbeat cycle and writes plain
 * SVG transforms — rotations about each joint (PIVOT), no deformation, no filters.
 *
 * The wingbeat IS the Figma motion (Smart Class (R), 983:1716 timeline — the
 * supplied JSON): one 500 ms cycle, wings 0 → 48° in 180 ms (ease-in,
 * cubic-bezier .42,0,1,1) and back in 320 ms (ease-out, 0,0,.58,1), every piece
 * of a wing about its shared shoulder origin; the bird rises 6 px by 240 ms
 * (ease-in-out .42,0,.58,1) and settles by 500 ms. At full climb it plays at
 * exactly that rate and stroke; as the bird slows, the cycle slows (to 60 %) and
 * the stroke shrinks with `amp` (24 = the full 48°).
 */

/** cubic-bezier(x1, y1, x2, y2) as a function of progress (Newton on x). */
const bezier = (x1: number, y1: number, x2: number, y2: number) => (x: number) => {
  let t = x;
  for (let i = 0; i < 10; i++) {
    const cx = 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3 - x;
    const d = 3 * x1 * (1 - t) ** 2 + 6 * (x2 - x1) * t * (1 - t) + 3 * (1 - x2) * t * t;
    if (Math.abs(d) < 1e-6) break;
    t = Math.min(1, Math.max(0, t - cx / d));
  }
  return 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
};
/** The Figma motion, one cycle (keyframes from the JSON). */
export const WINGBEAT = {
  periodMs: 500,
  /** 0.8377580642700195 rad */
  strokeDeg: 48,
  /** the wing reaches the bottom of the stroke at 180 ms */
  down: 180 / 500,
  easeDown: bezier(0.42, 0, 1, 1),
  easeUp: bezier(0, 0, 0.58, 1),
  /** motionTranslationY 357.68 → 351.68: up 6 px at 240 ms, back by 500 ms */
  bobPx: 6,
  bobPeak: 240 / 500,
  easeBob: bezier(0.42, 0, 0.58, 1),
} as const;
/** Wing stroke 0…1 at cycle position p (0 = wings up, the Figma pose). */
export function stroke(p: number) {
  const B = WINGBEAT;
  return p <= B.down ? B.easeDown(p / B.down) : 1 - B.easeUp((p - B.down) / (1 - B.down));
}
/** Body lift 0…1 at cycle position p. */
export function lift(p: number) {
  const B = WINGBEAT;
  return p <= B.bobPeak ? B.easeBob(p / B.bobPeak) : 1 - B.easeBob((p - B.bobPeak) / (1 - B.bobPeak));
}
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

/** The held wing angles of a fold: swept down behind the body (closest to the resting pose's folded wings). */
const FOLD_L = -62;
const FOLD_R = 62;

/**
 * The three-quarter rear pose (Figma 981:1640) in flight — the closing's climb
 * toward ২০২৭. The same wingbeat cycle drives it; its wings, seen from behind,
 * beat about their own shoulders (PIVOT.rear) between up (+) and down (−),
 * within the range the joints stay closed (+24° … −20°, checked in JourneyLab).
 */
const REAR_WING = { centre: 4, half: 18 };
/** Rear-pose airflow anchors: under each wing and behind the tail; it flies up-right, so the air streams down-left. */
const TRAIL_FROM_REAR: [number, number, number][] = [
  [40, 122, -1.9],
  [120, 112, -1.1],
  [46, 158, -1.5],
];

/** Anchors (flying-pose units) the airflow trails start from: under each wing and behind the tail. */
const TRAIL_FROM: [number, number, number][] = [
  // x, y, outward lean
  [46, 101, -1],
  [156, 95, 1],
  [86, 143, -0.35],
];

export function createFlight(opts: {
  rig: HTMLElement;
  trails?: SVGSVGElement | null;
  clouds?: Cloud[];
  frame: () => { W: number; H: number; f: number };
  state?: Partial<FlightState>;
  /** Which pose flies: the opening's front-on "flying" pose (default) or the closing's three-quarter "rear". */
  pose?: "flying" | "rear";
  /** The element the bob and lean are applied to (default: the rig's `.bj-rig-tilt`). */
  tilt?: HTMLElement | null;
  /** Pose units → screen px for the airflow anchors (default: the rig's own x / y / scale). */
  anchor?: (ax: number, ay: number) => [number, number, number];
}) {
  const { rig } = opts;
  if (opts.pose === "rear") return createRearFlight(opts);
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
  let cycle = 0;
  let flow = 0;
  let running = true;

  const tick = (_t: number, deltaMs: number) => {
    if (!running) return;
    const dt = Math.min(deltaMs, 50) / 1000;
    const { W, H, f } = opts.frame();
    // the Figma wingbeat: 2 Hz at full climb (its 500 ms cycle), slowing to 60 % as the bird slows
    cycle += dt * (1000 / WINGBEAT.periodMs) * (0.6 + 0.4 * s.speed);
    const p = cycle % 1;
    const phase = p * Math.PI * 2; // for the secondary motions below
    const k = s.amp / 24; // stroke strength (1 = the Figma 48°)
    const w = stroke(p) * WINGBEAT.strokeDeg * k;
    // folding: the stroke blends into a held down-sweep (wings tucked behind the body)
    const aL = -w * (1 - s.fold) + FOLD_L * s.fold;
    const aR = w * (1 - s.fold) + FOLD_R * s.fold;
    wingL?.setAttribute("transform", `rotate(${aL.toFixed(2)} ${P.wingL![0]} ${P.wingL![1]})`);
    wingR?.setAttribute("transform", `rotate(${aR.toFixed(2)} ${P.wingR![0]} ${P.wingR![1]})`);
    // body: the Figma lift — up 6 px through the downstroke, peaking just after it
    const bob = -WINGBEAT.bobPx * lift(p) * k * (1 - s.fold);
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

/**
 * The rear pose in flight — the same cycle, lift, lean, tail and airflow as
 * createFlight, on the closing's bird. `amp` 0 holds the wings in the pose
 * (they open as it grows); 24 is the full beat. `fold` blends back to the pose.
 */
function createRearFlight(opts: Parameters<typeof createFlight>[0]) {
  const { rig } = opts;
  const s: FlightState = { speed: 0, amp: 0, pitch: 0, trail: 0, beats: 0, climb: 0, fold: 0, ...opts.state };
  const q = (sel: string) => rig.querySelector<SVGGElement>(sel);
  const wingL = q(".bird-rear .bl-wingL");
  const wingR = q(".bird-rear .bl-wingR");
  const tail = q(".bird-rear .bl-tail");
  const tilt = opts.tilt ?? null;
  const P = PIVOT.rear;
  const trailPaths = opts.trails ? [...opts.trails.querySelectorAll<SVGPathElement>("path")] : [];
  let cycle = 0;
  let flow = 0;
  let running = true;
  const tick = (_t: number, deltaMs: number) => {
    if (!running) return;
    const dt = Math.min(deltaMs, 50) / 1000;
    const { f } = opts.frame();
    cycle += dt * (1000 / WINGBEAT.periodMs) * (0.6 + 0.4 * s.speed);
    const p = cycle % 1;
    const phase = p * Math.PI * 2;
    const k = (s.amp / 24) * (1 - s.fold);
    // up (+) at the top of the cycle, down (−) at the bottom of the stroke
    const a = k * (REAR_WING.centre + REAR_WING.half * (1 - 2 * stroke(p)));
    wingL?.setAttribute("transform", `rotate(${a.toFixed(2)} ${P.wingL![0]} ${P.wingL![1]})`);
    wingR?.setAttribute("transform", `rotate(${(-1.1 * a).toFixed(2)} ${P.wingR![0]} ${P.wingR![1]})`);
    const bob = -WINGBEAT.bobPx * 0.8 * lift(p) * k;
    if (tilt) tilt.style.transform = `translateY(${bob.toFixed(2)}px) rotate(${(s.pitch + 0.6 * Math.sin(phase) * k).toFixed(2)}deg)`;
    tail?.setAttribute("transform", `rotate(${(-0.5 * s.pitch + 3 * Math.sin(phase - 1.15) * k).toFixed(2)} ${P.tail![0]} ${P.tail![1]})`);
    if (trailPaths.length && opts.anchor) {
      flow += dt * (160 + 760 * s.speed) * f;
      const L = (30 + 130 * s.speed) * f * s.trail;
      trailPaths.forEach((path, i) => {
        const [ax, ay, lean] = TRAIL_FROM_REAR[i];
        const [x, y0, S] = opts.anchor!(ax, ay);
        const y = y0 + bob * S;
        const w = lean * (12 + 22 * s.speed) * f;
        path.setAttribute("d", `M${x.toFixed(1)} ${y.toFixed(1)} C${(x + w * 0.2).toFixed(1)} ${(y + L * 0.35).toFixed(1)} ${(x + w * 0.7).toFixed(1)} ${(y + L * 0.7).toFixed(1)} ${(x + w).toFixed(1)} ${(y + L).toFixed(1)}`);
        const seg = Math.max(4, L * 0.42);
        path.style.strokeDasharray = `${seg.toFixed(1)} ${(L * 0.24 + 6).toFixed(1)}`;
        path.style.strokeDashoffset = (-flow - i * 19).toFixed(1);
        path.style.opacity = (0.7 * s.trail * Math.min(1, s.speed * 2.5)).toFixed(3);
        path.style.strokeWidth = `${(2.2 * f).toFixed(2)}px`;
      });
    }
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
