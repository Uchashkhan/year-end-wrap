import { useId, type Ref } from "react";
import { BIRD_WINGS, smooth, wingFrame, type flightPose } from "../motion/birdFlight";

import "../styles/bird-3d-flight.css";

export const BIRD_FLIGHT_FRAMES = BIRD_WINGS.frameEnds.map(
  (_, i) => `/assets/journey/bird-flight/bird-flight-0${i + 1}.webp`,
);
const wrap = (n: number, period: number) => ((n % period) + period) % period;

// Lanes carry the wind past the wings, with the fastest lines at the edges.
const WIND = [
  { x: 0.09, y: 0.23, depth: 0.45, length: 42, bend: -5, width: 1, opacity: 0.38 },
  { x: 0.77, y: 0.31, depth: 0.48, length: 46, bend: 5, width: 1, opacity: 0.42 },
  { x: 0.24, y: 0.08, depth: 0.50, length: 44, bend: -6, width: 1, opacity: 0.36 },
  { x: 0.93, y: 0.73, depth: 0.53, length: 38, bend: 4, width: 1, opacity: 0.35 },
  { x: 0.21, y: 0.92, depth: 0.50, length: 37, bend: -5, width: 0.9, opacity: 0.34 },
  { x: 0.72, y: 0.68, depth: 0.48, length: 42, bend: 5, width: 1, opacity: 0.36 },
  { x: 0.16, y: 0.52, depth: 0.85, length: 74, bend: -9, width: 1.4, opacity: 0.65 },
  { x: 0.82, y: 0.47, depth: 0.92, length: 85, bend: 10, width: 1.3, opacity: 0.64 },
  { x: 0.13, y: 0.85, depth: 0.98, length: 63, bend: -8, width: 1.3, opacity: 0.55 },
  { x: 0.88, y: 0.12, depth: 0.89, length: 73, bend: 9, width: 1.4, opacity: 0.56 },
  { x: 0.23, y: 0.38, depth: 1.02, length: 58, bend: -9, width: 1.25, opacity: 0.51 },
  { x: 0.76, y: 0.84, depth: 1.05, length: 62, bend: 7, width: 1.25, opacity: 0.51 },
  { x: 0.075, y: 0.66, depth: 1.33, length: 106, bend: -13, width: 1.8, opacity: 0.76 },
  { x: 0.95, y: 0.37, depth: 1.45, length: 114, bend: 10, width: 1.65, opacity: 0.72 },
  { x: 0.048, y: 0.12, depth: 1.52, length: 96, bend: -8, width: 1.55, opacity: 0.64 },
] as const;
const FOREGROUND_LINES = 3;
const WIND_PAD = 172;

function Airflow({ foreground }: { foreground?: boolean }) {
  const gradient = useId();
  const lines = foreground ? WIND.slice(-FOREGROUND_LINES) : WIND.slice(0, -FOREGROUND_LINES);
  return (
    <svg className={`bj-air b3-air ${foreground ? "b3-air-near" : ""}`} aria-hidden="true">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#fff" stopOpacity="0" />
          <stop offset="0.37" stopColor="#fff" stopOpacity="0.58" />
          <stop offset="0.72" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      {lines.map((line) => (
        <path key={line.x} d={`M0 0 Q0 ${line.length * 0.62} ${line.bend} ${line.length}`}
          strokeWidth={line.width} style={{ stroke: `url(#${gradient})` }} />
      ))}
    </svg>
  );
}

export function Bird3DImage({ ref, still }: { ref?: Ref<HTMLSpanElement>; still: boolean }) {
  const frames = still ? BIRD_FLIGHT_FRAMES.slice(0, 1) : BIRD_FLIGHT_FRAMES;
  return (
    <span ref={ref} className="b3-bird" aria-hidden="true">
      {frames.map((src, i) => (
        <img key={src} className="b3-bird-frame" src={src} width={606} height={624} alt=""
          draggable={false} fetchPriority={i === 0 ? "high" : "auto"} />
      ))}
    </span>
  );
}

type BirdFrames = { decoded: boolean; ready: Promise<void>; paint: (cycles: number) => void };
const framePlayers = new WeakMap<HTMLElement, BirdFrames>();

export function birdFrames(root: HTMLElement): BirdFrames {
  const cached = framePlayers.get(root);
  if (cached) return cached;

  const frames = [...root.querySelectorAll<HTMLImageElement>(".b3-bird-frame")];
  let visible = 0;
  let decoded = false;
  const show = (next: number) => {
    if (next === visible) return;
    frames[visible].style.visibility = "hidden";
    frames[next].style.visibility = "visible";
    visible = next;
  };
  const ready = Promise.allSettled(frames.map((frame) => frame.decode())).then((results) => {
    decoded = results.length === BIRD_FLIGHT_FRAMES.length && results.every((result) => result.status === "fulfilled");
    if (!decoded) {
      const fallback = results.findIndex((result) => result.status === "fulfilled");
      if (fallback >= 0) show(fallback);
    }
  });
  const player: BirdFrames = {
    get decoded() { return decoded; },
    ready,
    paint(cycles) { if (decoded) show(wingFrame(cycles)); },
  };
  framePlayers.set(root, player);
  return player;
}

export function Bird3DWind() {
  return <><Airflow /><Airflow foreground /></>;
}

type CloudSpec = { x: number; y: number; w: number; h: number; depth: number };
type Frame = { w: number; h: number; ratio: number };

export function createBird3DEnvironment(root: HTMLElement, specs: readonly CloudSpec[]) {
  const clouds = [...root.querySelectorAll<HTMLElement>(".bj-cloud")];
  const air = [...root.querySelectorAll<SVGSVGElement>(".b3-air")];
  const streaks = [...root.querySelectorAll<SVGPathElement>(".b3-air path")];
  let frame: Frame = { w: 0, h: 0, ratio: 1 };

  return {
    measure(next: Frame) {
      frame = next;
      const { w, h, ratio } = frame;
      air.forEach((layer) => layer.setAttribute("viewBox", `0 0 ${w} ${h}`));
      clouds.forEach((cloud, i) => {
        const spec = specs[i];
        cloud.style.width = `${(spec?.w ?? 572) * ratio}px`;
        cloud.style.height = `${(spec?.h ?? 83) * ratio}px`;
        cloud.style.opacity = String(spec ? 0.42 + spec.depth * 0.48 : 1);
      });
    },

    paint({ drift, phase, velocity }: ReturnType<typeof flightPose>, travel: number) {
      const { w, h, ratio } = frame;
      clouds.forEach((cloud, i) => {
        const spec = specs[i];
        if (!spec) {
          cloud.style.transform = `translate3d(${w / 2 - 286 * ratio}px,${h - 83 * ratio + travel * 1.3}px,0)`;
          return;
        }
        const height = spec.h * ratio;
        const startY = spec.y / 852 * h;
        const cloudY = wrap(startY + travel * spec.depth + height, h + height * 2) - height;
        const cloudX = spec.x * ratio - drift * spec.depth * 0.46;
        cloud.style.transform = `translate3d(${cloudX}px,${cloudY}px,0)`;
      });

      const wind = Math.pow(velocity / 1.12, 1.15);
      streaks.forEach((line, i) => {
        const spec = WIND[i];
        const y = wrap(spec.y * h + travel * 1.65 * spec.depth, h + WIND_PAD * 2) - WIND_PAD;
        const side = Math.sign(spec.x - 0.5);
        const wake = Math.sin(phase * 1.18 - spec.y * 4 + side * 0.65);
        const x = w * spec.x + (side * wake * 4.8 * wind - drift * spec.depth * 0.4) * ratio;
        const envelope = smooth((y + WIND_PAD) / 84) * smooth((h + 20 - y) / 92);
        const gust = 0.86 + 0.14 * wake;
        line.style.opacity = String(spec.opacity * envelope * wind * gust);
        line.style.transform = `translate(${x}px,${y}px) scale(${ratio},${ratio * (0.67 + 0.58 * wind * gust)})`;
      });
    },
  };
}
