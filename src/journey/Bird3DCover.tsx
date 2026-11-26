import { useLayoutEffect, useRef, useState } from "react";
import { usePresence } from "motion/react";
import gsap from "gsap";
import { usePrefs } from "../lib/prefs";
import { BIRD_COVER as T } from "../motion/birdCover";
import { BIRD_HOVER, flightPose, smooth } from "../motion/birdFlight";
import { Bird3DImage, Bird3DWind, createBird3DEnvironment } from "./Bird3DFlight";
import { gsapEase } from "../motion/ease";
import { devRegister, fromGsap } from "../motion/timeline";
import type { ScreenProps } from "../screens/types";
import { SKY_HANDOFF, useNav } from "../story/entry";
import { BirdCoverScene, CLOUDS, FINAL_INK, MARKER_INK } from "./BirdCoverScene";
import "../styles/bird-3d-cover.css";

const FINAL_MARKER_Y = 0.22;

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
    const environment = createBird3DEnvironment(el, CLOUDS);
    const playhead = { time: 0 };
    const layout = { w: 0, h: 0, x: 0, y: 0, ratio: 1 };
    let years: { x: number; height: number }[] = [];
    let origins: { x: number; y: number }[] = [];

    const paintFlight = () => {
      const { w, h, x: anchorX, y: anchorY, ratio } = layout;
      const u = Math.min(playhead.time / T.climb, 1);
      const pose = flightPose(u, ratio);
      const { distance, drift, lift } = pose;
      const entry = 1 - smooth(distance / 0.17);
      const arrival = smooth((u - 0.70) / 0.30);
      const y = (h * (0.51 + 0.34 * entry) - anchorY) * (1 - arrival) + lift;
      const x = (w / 2 - anchorX) * (1 - arrival) + drift;
      const bank = pose.bank - 2.4 * entry;
      const scale = 1 + (0.52 - 0.21 * entry) * (1 - arrival) + pose.scale;
      mascot.style.transform = `translate3d(${x}px,${y}px,0) rotate(${bank}deg) scale(${scale})`;

      const step = h * 0.49;
      const firstY = h * 0.16;
      const finalY = h * FINAL_MARKER_Y;
      const track = firstY + (6 * step + finalY - firstY) * distance;
      markers.forEach((marker, i) => {
        const cy = track - i * step;
        marker.style.transform = `translate3d(${years[i].x}px,${cy - years[i].height / 2}px,0)`;
      });

      environment.paint(pose, distance * h * 2.25);
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
      environment.measure(layout);
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
      y: -BIRD_HOVER.amplitude, duration: BIRD_HOVER.period / 2,
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
      bird={<Bird3DImage ref={bird} />}
      air={<Bird3DWind />}
      onNext={actions.next}
      onSkip={() => finish.current?.()}
    />
  );
}
