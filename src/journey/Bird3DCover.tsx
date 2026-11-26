import { useId, useLayoutEffect, useRef, useState } from "react";
import { usePresence } from "motion/react";
import gsap from "gsap";
import { usePrefs } from "../lib/prefs";
import { BIRD_COVER as T, flightAt, smooth } from "../motion/birdCover";
import { gsapEase } from "../motion/ease";
import { devRegister, fromGsap } from "../motion/timeline";
import type { ScreenProps } from "../screens/types";
import { SKY_HANDOFF, useNav } from "../story/entry";
import { BirdCoverScene, CLOUDS, FINAL_INK, MARKER_INK } from "./BirdCoverScene";
import "../styles/bird-3d-cover.css";

export const BIRD_3D_IMAGE = "/assets/journey/bird-3d.png";
const FINAL_MARKER_Y = 0.22;
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

export function Bird3DCover({ actions }: ScreenProps<"cover">) {
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const [revealed, setRevealed] = useState(false);
  const flying = !still && !revealed;
  const [isPresent, safeToRemove] = usePresence();
  const nav = useNav();
  const root = useRef<HTMLDivElement>(null);
  const bird = useRef<HTMLImageElement>(null);
  const finish = useRef<(() => void) | null>(null);
  const focusStart = useRef(false);

  useLayoutEffect(() => {
    const el = root.current;
    const mascot = bird.current;
    if (!el || !mascot || !flying || !isPresent) return;

    const all = <E extends Element = HTMLElement>(selector: string) => [...el.querySelectorAll<E>(selector)];
    const one = (selector: string) => el.querySelector<HTMLElement>(selector)!;
    const slot = one(".bj-slot");
    const markers = all(".bj-yr");
    const spans = all(".bj-yr-6 .bj-yr-d");
    const boxes = all(".bj-dg");
    const digits = all(".bj-dgm");
    const clouds = all(".bj-cloud");
    const air = all<SVGSVGElement>(".b3-air");
    const streaks = all<SVGPathElement>(".b3-air path");
    const playhead = { time: 0 };
    const layout = { w: 0, h: 0, x: 0, y: 0, ratio: 1 };
    let years: { x: number; height: number }[] = [];
    let origins: { x: number; y: number }[] = [];

    const paintFlight = () => {
      const { w, h, x: anchorX, y: anchorY, ratio } = layout;
      const u = Math.min(playhead.time / T.climb, 1);
      const { distance, velocity } = flightAt(u);
      const entry = 1 - smooth(distance / 0.17);
      const arrival = smooth((u - 0.70) / 0.30);
      const pace = Math.min(velocity, 1);
      const phase = distance * Math.PI * 3.1;
      const inertia = velocity - flightAt(u - 0.045).velocity;
      const drift = (5.2 * Math.sin(phase + 0.4) + 2 * Math.sin(0.55 * phase)) * pace * ratio;
      const lift = (-8 * Math.sin(phase + 0.2) + 16 * inertia) * pace * ratio;
      const y = (h * (0.51 + 0.34 * entry) - anchorY) * (1 - arrival) + lift;
      const x = (w / 2 - anchorX) * (1 - arrival) + drift;
      const bank = (2.7 * Math.sin(phase + 0.65) - 8 * inertia) * pace - 2.4 * entry;
      const scale = 1 + (0.52 - 0.21 * entry) * (1 - arrival) + 0.023 * pace;
      mascot.style.transform = `translate3d(${x}px,${y}px,0) rotate(${bank}deg) scale(${scale})`;

      const step = h * 0.49;
      const firstY = h * 0.16;
      const finalY = h * FINAL_MARKER_Y;
      const track = firstY + (6 * step + finalY - firstY) * distance;
      markers.forEach((marker, i) => {
        const cy = track - i * step;
        marker.style.transform = `translate3d(${years[i].x}px,${cy - years[i].height / 2}px,0)`;
      });

      const travel = distance * h * 2.25;
      clouds.forEach((cloud, i) => {
        const spec = CLOUDS[i];
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
    };

    // Measure only when layout changes. Every animation frame reads the same cached geometry.
    const measure = () => {
      const frame = el.getBoundingClientRect();
      const target = slot.getBoundingClientRect();
      Object.assign(layout, {
        w: el.clientWidth, h: el.clientHeight, ratio: el.clientWidth / 412,
        x: target.left - frame.left + target.width / 2,
        y: target.top - frame.top + target.height / 2,
      });
      years = markers.map((m, i) => ({
        height: m.offsetHeight,
        x: i === 6 ? (layout.w - m.offsetWidth) / 2 : i % 2 === 0 ? 20 * layout.ratio : layout.w - m.offsetWidth - 20 * layout.ratio,
      }));
      origins = spans.map((span, i) => ({
        x: years[6].x + span.offsetLeft + span.offsetWidth / 2 - boxes[i].offsetLeft - boxes[i].offsetWidth / 2,
        y: layout.h * FINAL_MARKER_Y - years[6].height / 2 + span.offsetTop + span.offsetHeight / 2 - boxes[i].offsetTop,
      }));
      air.forEach((layer) => layer.setAttribute("viewBox", `0 0 ${layout.w} ${layout.h}`));
      clouds.forEach((cloud, i) => {
        const spec = CLOUDS[i];
        cloud.style.width = `${(spec?.w ?? 572) * layout.ratio}px`;
        cloud.style.height = `${(spec?.h ?? 83) * layout.ratio}px`;
        cloud.style.opacity = String(spec ? 0.42 + spec.depth * 0.48 : 1);
      });
      paintFlight();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    observer.observe(markers[6]);
    observer.observe(slot);

    let timeline: gsap.core.Timeline;
    const context = gsap.context(() => {
      timeline = gsap.timeline({
        paused: !mascot.complete,
        onComplete: () => {
          focusStart.current = document.activeElement === one(".bj-skip");
          setRevealed(true);
        },
        onUpdate: paintFlight,
      });
      timeline.to(playhead, { time: T.climb, duration: T.climb, ease: "none" }, 0);
      timeline.to(markers.slice(0, -1), { opacity: 0, duration: 0.45, ease: gsapEase("refSoft") }, T.climb - 0.6);
      timeline.to(all(".bj-sky, .bj-clouds"), { opacity: 0, duration: 0.53, ease: gsapEase("glide") }, T.climb - 0.08);
      timeline.set(markers[6], { opacity: 0 }, T.cornerDigits.at);
      timeline.set(boxes, { opacity: 1 }, T.cornerDigits.at);
      timeline.fromTo(digits, {
        x: (i: number) => origins[i].x,
        y: (i: number) => origins[i].y,
        scale: 112 / 300,
        rotation: (i: number) => i === 0 || i === 3 ? 27.25 : -27.25,
        color: MARKER_INK,
      }, {
        x: 0, y: 0, scale: 1, rotation: 0, color: (i: number) => FINAL_INK[i],
        duration: T.cornerDigits.duration, ease: gsapEase("glide"), immediateRender: false,
      }, T.cornerDigits.at);
      timeline.to(all(".bj-decor, .bj-scrim, .bj-bird-light"), { opacity: 1, duration: 0.6, ease: gsapEase("refSoft") }, T.climb + 0.12);
      for (const [selector, cue] of [[".bj-head > span", T.headline], [".bj-year > span", T.year]] as const) {
        timeline.fromTo(one(selector), { y: "105%" }, { y: 0, duration: cue.duration, ease: gsapEase("refPop") }, cue.at);
      }
      timeline.to(one(".bj-support"), { opacity: 1, duration: T.support.duration, ease: gsapEase("refSoft") }, T.support.at);
      timeline.to(one(".bj-cta"), { opacity: 1, duration: T.cta.duration, ease: gsapEase("refSoft") }, T.cta.at);
    }, el);
    const play = () => { timeline.play(); };
    mascot.addEventListener("load", play);
    mascot.addEventListener("error", play);
    const unregister = devRegister("01 3D Bird Journey", fromGsap(timeline!));
    finish.current = () => {
      focusStart.current = document.activeElement === one(".bj-skip");
      setRevealed(true);
    };
    return () => {
      finish.current = null;
      observer.disconnect();
      mascot.removeEventListener("load", play);
      mascot.removeEventListener("error", play);
      unregister();
      context.revert();
      mascot.style.removeProperty("transform");
    };
  }, [flying, isPresent]);

  useLayoutEffect(() => {
    const el = root.current;
    const mascot = bird.current;
    if (!el || !mascot || flying || still || !isPresent) return;
    if (focusStart.current) el.querySelector<HTMLButtonElement>(".bj-cta")?.focus();
    focusStart.current = false;
    const hover = gsap.to(mascot, {
      y: -T.hover.amplitude, duration: T.hover.period / 2,
      ease: "sine.inOut", repeat: -1, yoyo: true,
    });
    return () => { hover.revert(); };
  }, [flying, still, isPresent]);

  useLayoutEffect(() => {
    const el = root.current;
    if (isPresent || !el) return;
    if (nav.kind !== "sky" || still || flying) {
      safeToRemove?.();
      return;
    }
    const D = SKY_HANDOFF.digitsOut;
    const context = gsap.context(() => {
      gsap.timeline({ onComplete: () => safeToRemove?.() })
        .to(".bj-center, .bj-cta", { y: `-=${SKY_HANDOFF.contentLift}`, opacity: 0, duration: SKY_HANDOFF.contentFade }, 0)
        .to(".bj-decor, .bj-scrim", { opacity: 0, duration: SKY_HANDOFF.contentFade + 0.15 }, 0)
        .to(".bj-float", {
          x: (i: number) => i % 2 === 0 ? -el.clientWidth * 0.55 : el.clientWidth * 0.55,
          y: (i: number) => i < 2 ? -el.clientHeight * 0.3 : el.clientHeight * 0.3,
          duration: D.dur, ease: gsapEase("glide"),
        }, D.at)
        .to(".bj-float", { opacity: 0, duration: D.dur - D.fadeAt }, D.at + D.fadeAt)
        .set({}, {}, SKY_HANDOFF.coverOut);
    }, el);
    return () => { context.revert(); };
  }, [isPresent, nav.kind, still, flying, safeToRemove]);

  return (
    <BirdCoverScene
      root={root}
      className="b3"
      flying={flying}
      lockCta
      bird={<img ref={bird} className="b3-bird" src={BIRD_3D_IMAGE} width={2158} height={2222} alt="" draggable={false} fetchPriority="high" />}
      air={<><Airflow /><Airflow foreground /></>}
      onNext={actions.next}
      onSkip={() => finish.current?.()}
    />
  );
}
