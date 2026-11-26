import { useEffect, useMemo, useRef } from "react";
import { useIsPresent } from "motion/react";
import gsap from "gsap";
import { usePrefs } from "../../lib/prefs";
import { gsapEase } from "../../motion/ease";
import { DURATION } from "../../motion/tokens";
import { SKY_HANDOFF, useEntry } from "../../story/entry";
import type { SkyProgress } from "./progress";
import "./study-sky.css";

/**
 * Study Time background effect "day/night" (screen facet study.sky = daynight).
 *
 * Adapted from the reference prototype's Journey direction, hours screen (C3,
 * `.hr-day`, `.hr-night`, `.hr-nightfx`, `.hr-sun`, `.hr-moon`, `stars()`): the
 * same layers — a day light, a night sky with a cyan and a magenta glow, seeded
 * stars in three twinkling layers, a setting sun with halo rings, a rising
 * crescent moon with a halo — re-built for our screen:
 *   - it follows the clock, not a timer: progress p (0 → 1) is published by the
 *     character on screen (the clock's spin, or the Timekeeper's hand), so the
 *     hours passing are what turn day into night
 *   - day is the screen's own Ocean Blue (the persistent background, unchanged);
 *     a dusk layer sits between day and night (Day → Dusk → Night), so the change
 *     is a progression, not one background fading into another
 *   - the sun and the moon keep the reference's own choreography (positions,
 *     sizes, paths, timing, easing, overlap), scaled to our screen with the
 *     clock's rim in place of the school's roof: the sun sets straight down
 *     behind the rim on the right; the moon rises in above it on the same side
 *     as the sun goes; stars appear one by one
 *   - restrained: no city, school, windows, flag or statistics bar; fewer, smaller
 *     stars; one halo on each light
 * Leaving the screen it fades out over the next screen's background change.
 * Reduced motion / repeat view: the night, still.
 */

const STARS = 30;
const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const clamp = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a: number, b: number, x: number) => {
  const u = clamp((x - a) / (b - a));
  return u * u * (3 - 2 * u);
};

export function StudySky({ progress }: { progress: SkyProgress }) {
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const root = useRef<HTMLDivElement>(null);
  const isPresent = useIsPresent();
  const fromCover = useEntry().kind === "sky";

  // seeded stars in the sky above the clock (x %, y as a share of the space above the horizon), each with
  // the moment it appears
  const stars = useMemo(() => {
    const r = rng(11);
    return Array.from({ length: STARS }, (_, i) => {
      const big = r();
      return { x: 3 + r() * 94, y: 4 + r() * 84, s: big < 0.12 ? 2.4 : big < 0.5 ? 1.7 : 1.2, a: 0.45 + r() * 0.5, at: 0.5 + r() * 0.4, layer: i % 3 };
    });
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = <T extends Element = HTMLElement>(s: string) => el.querySelector(s) as T;
    const sun = q(".ssk-sun");
    const sunGlow = q(".ssk-sunglow");
    const dusk = q(".ssk-dusk");
    const horizon = q(".ssk-horizon");
    const night = q(".ssk-night");
    const moon = q(".ssk-moon");
    const starEls = [...el.querySelectorAll<HTMLElement>(".ssk-star")];
    const paint = (p: number) => {
      // the sky follows the clock: dusk comes up over the day, warm at the horizon; night comes over the dusk
      dusk.style.opacity = smooth(0.06, 0.45, p).toFixed(3);
      horizon.style.opacity = (smooth(0.1, 0.35, p) * (1 - smooth(0.5, 0.9, p))).toFixed(3);
      night.style.opacity = smooth(0.42, 0.95, p).toFixed(3);
      // the stars come out one by one
      starEls.forEach((s, i) => {
        s.style.opacity = (clamp((p - stars[i].at) / 0.12) * stars[i].a).toFixed(3);
      });
    };

    // The sun and the moon: the reference's own choreography (C3 .hr-sun / .hr-moon), on its clock, from the
    // moment the hours start to move. Sun: 0.25 s, 1.7 s, straight down 220 px (2.895 × its size) fading out,
    // accelerating — behind the clock's rim. Moon: 1.5 s, 1.3 s, up 70 px (0.833 × its size) from 0.6 scale
    // and opacity 0, overshooting; its halo breathes from 2.8 s.
    const halo = el.querySelector<SVGGElement>(".ssk-moon-halo");
    let pulse: gsap.core.Tween | undefined;
    const tl = gsap.timeline({ paused: true });
    tl.fromTo(sun, { yPercent: 0, opacity: 1, "--warm": 0 }, { yPercent: 289.5, opacity: 0, "--warm": 1, duration: 1.7, ease: gsapEase("celestialSet") }, 0.25);
    tl.fromTo(sunGlow, { opacity: 1 }, { opacity: 0, duration: 1.7, ease: gsapEase("celestialSet") }, 0.25);
    tl.fromTo(moon, { yPercent: 83.3, scale: 0.6, opacity: 0 }, { yPercent: 0, scale: 1, opacity: 1, duration: 1.3, ease: gsapEase("celestialRise") }, 1.5);
    tl.call(() => {
      if (halo) pulse = gsap.to(halo, { scale: 1.12, svgOrigin: "42 42", duration: 1.5, ease: "sine.inOut", yoyo: true, repeat: -1 });
    }, undefined, 2.8);

    if (still) {
      paint(1);
      tl.progress(1);
      return () => void tl.kill();
    }
    let started = false;
    const off = progress.subscribe((p) => {
      paint(p);
      if (!started && p > 0) {
        started = true;
        tl.play(0);
      }
    });
    return () => {
      off();
      tl.kill();
      pulse?.kill();
    };
  }, [progress, still, stars]);

  // arriving: in with the screen's content (from the cover, after its year has cleared), never over the
  // previous screen
  useEffect(() => {
    if (still || !root.current) return;
    const t = gsap.fromTo(root.current, { opacity: 0 }, { opacity: 1, duration: DURATION.base, delay: fromCover ? SKY_HANDOFF.revealAt : 0.05, ease: gsapEase("settle") });
    return () => {
      t.kill();
    };
    // the entry is fixed for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still]);

  // leaving: fade out under the next screen's background change
  useEffect(() => {
    if (isPresent || !root.current) return;
    const t = gsap.to(root.current, { opacity: 0, duration: DURATION.base, ease: gsapEase("exit") });
    return () => {
      t.kill();
    };
  }, [isPresent]);

  return (
    <div ref={root} className={`ssk ${still ? "ssk-still" : ""}`} aria-hidden="true">
      <i className="ssk-layer ssk-sunglow" />
      <i className="ssk-layer ssk-dusk" />
      <i className="ssk-layer ssk-horizon" />
      <i className="ssk-layer ssk-night" />
      <div className="ssk-stars">
        {[0, 1, 2].map((l) => (
          <div key={l} className={`ssk-twk ssk-twk-${l}`}>
            {stars.map((s, i) =>
              s.layer === l ? <i key={i} className="ssk-star" style={{ left: `${s.x}%`, top: `calc(var(--ssk-horizon) * ${(s.y / 100).toFixed(3)})`, width: s.s, height: s.s }} /> : null,
            )}
          </div>
        ))}
      </div>
      <div className="ssk-sun">
        <i className="ssk-sun-disc" />
      </div>
      <svg className="ssk-moon" viewBox="0 0 84 84">
        <g className="ssk-moon-halo">
          <circle cx="42" cy="42" r="41" fill="#FFC93C" fillOpacity=".10" />
          <circle cx="42" cy="42" r="31" fill="#FFC93C" fillOpacity=".16" />
        </g>
        <path d="M50 20a22 22 0 1 0 13 31A19 19 0 0 1 50 20z" fill="#FFC93C" />
        <path d="M50 20a22 22 0 0 0-19 9 19 19 0 0 1 17-5z" fill="#FFE9A3" />
      </svg>
    </div>
  );
}
