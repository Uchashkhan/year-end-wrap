import { useEffect, useId, useRef } from "react";
import { useIsPresent } from "motion/react";
import gsap from "gsap";
import firstBencher from "../assets/badges/first-bencher.svg?raw";
import quizWarrior from "../assets/badges/quiz-warrior.svg?raw";
import videoMarathoner from "../assets/badges/video-marathoner.svg?raw";
import streakMaster from "../assets/badges/streak-master.svg?raw";
import capstone from "../assets/badges/capstone.svg?raw";
import { BADGE_ART, type BadgeArtId } from "../data/badgeArt";
import { gsapEase } from "../motion/ease";
import { SPRING } from "../motion/reference";
import { spr } from "../motion/spring";
import { useImpact } from "../story/impact";
import { MICRO } from "./micro";
import "./badge-live.css";

const RAW: Record<BadgeArtId, string> = { firstBencher, quizWarrior, videoMarathoner, streakMaster, capstone };

/** The landing (approach → impact → compression → spring recoil → settle), s. */
export const LANDING = {
  /** Approach: from 1.3× and 18 px above, accelerating (EASE.drop) into place. */
  approach: 0.26,
  fromScale: 1.3,
  fromY: -18,
  /** Compression at impact (width / height), released on the Reference panel spring (ζ .6, ωn 12; ≈ 9.5 % recoil). */
  squash: { x: 0.07, y: 0.1 },
  settle: 0.6,
  /** The artwork activates once the recoil has passed its peak. */
  activateAfter: 0.3,
} as const;

/**
 * A badge as live, inline SVG (the same finalized file as the static one), with
 * the impact landing and its own micro-animation (badges/micro.ts).
 *
 * One GSAP timeline per badge, started at mount: `landAt` s later the badge
 * approaches; at the impact frame it compresses and the story shakes
 * (story/impact.tsx, `amplitude` px); it recoils on the spring and settles;
 * then its artwork activates. Transform ownership: this wrapper owns the
 * landing; the micro-animation owns the inner paths; the screen keeps owning
 * the badge's container (its reveal). Leaving the screen stops everything at
 * rest. Reduced motion / repeat view: not used (the static image is shown).
 */
export function BadgeLive({
  id,
  height,
  landAt,
  amplitude = 4,
  decorative = false,
  className,
}: {
  id: BadgeArtId;
  height: number | string;
  /** Seconds from mount when the badge starts its approach. */
  landAt: number;
  amplitude?: number;
  decorative?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isPresent = useIsPresent();
  const shake = useImpact();
  const shakeRef = useRef(shake);
  shakeRef.current = shake;
  const uid = `b${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const stop = useRef<() => void>(() => {});
  const a = BADGE_ART[id];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = RAW[id]; // a fresh copy of the artwork for this run
    const svg = el.querySelector("svg")!;
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    const loops: gsap.core.Tween[] = [];
    const tl = gsap.timeline();
    const impactAt = landAt + LANDING.approach;
    gsap.set(el, { opacity: 0, transformOrigin: "50% 90%" });
    tl.to(el, { opacity: 1, duration: 0.08, ease: "none" }, landAt);
    tl.fromTo(el, { y: LANDING.fromY, scale: LANDING.fromScale }, { y: 0, scale: 1, duration: LANDING.approach, ease: gsapEase("drop") }, landAt);
    tl.call(() => shakeRef.current?.(amplitude), undefined, impactAt);
    const rec = { t: 0 };
    tl.fromTo(
      rec,
      { t: 0 },
      {
        t: LANDING.settle,
        duration: LANDING.settle,
        ease: "none",
        immediateRender: false,
        onUpdate: () => {
          const d = 1 - spr(rec.t, SPRING.panel.z, SPRING.panel.wn);
          gsap.set(el, { scaleX: 1 + LANDING.squash.x * d, scaleY: 1 - LANDING.squash.y * d });
        },
        onComplete: () => gsap.set(el, { scaleX: 1, scaleY: 1 }),
      },
      impactAt,
    );
    const at = impactAt + LANDING.activateAfter;
    const micro = MICRO[id](svg, tl, at, uid);
    tl.call(() => loops.push(...micro.loops()), undefined, at + 0.7);
    stop.current = () => {
      tl.progress(1, true).kill();
      loops.forEach((l) => l.progress(0).kill());
    };
    return () => {
      tl.kill();
      loops.forEach((l) => l.kill());
      gsap.set(el, { clearProps: "transform,opacity" });
    };
    // the landing is fixed for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // leaving the screen: everything comes to rest at once (loops stop on their rest frame)
  useEffect(() => {
    if (!isPresent) stop.current();
  }, [isPresent]);

  return (
    <span
      ref={ref}
      className={`badge-art badge-live${className ? ` ${className}` : ""}`}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : a.name}
      aria-hidden={decorative || undefined}
      style={{ height, aspectRatio: `${a.width} / ${a.height}` }}
    />
  );
}
