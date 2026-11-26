import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { usePresence } from "motion/react";
import gsap from "gsap";
import liveIconRaw from "../assets/live/live-class.svg?raw";
import { COPY } from "../data/copy";
import { bn } from "../lib/bangla";
import { usePrefs } from "../lib/prefs";
import { FOCUS, useNav } from "../story/entry";
import { BadgePill } from "../components/primitives";
import { LANDING } from "../badges/BadgeLive";
import { createLanding } from "../motion/primitives";
import { RELATION, SPRING, TEXT, eio } from "../motion/reference";
import { spr } from "../motion/spring";
import { gsapEase } from "../motion/ease";
import { useMotionProfile } from "../motion/profile";
import { devRegister, fromGsap } from "../motion/timeline";
import type { ScreenProps } from "./types";
import "../styles/live-reserved.css";

/**
 * 03 Live classes — "The Reserved Seat" (screen facet live.design = reserved).
 *
 * One yellow hero chair at the front (the existing chair artwork), a few muted
 * chairs behind it in perspective, and the actual Shikho Live Class icon (Figma
 * "Homepage Redesign 2026", node 2134:5707) above it, where the class happens.
 * The Front Bencher sticker, when earned, stamps onto the floor just under the
 * hero chair (it moves with the chair, so the two read as one).
 *
 * Reference motion (adapted, not its compositions):
 *   - spring entrance with controlled overshoot (C3 springs, ζ .42 ωn 15 stamp)
 *   - travelling illumination with sequential activation, timed so each chair
 *     lights as the light passes it (A3 kit tile 15: t = start + eio⁻¹(k) · span)
 *   - the count driven by the same eased progress as the light
 *   - the hero number landing (Reference Motion, no gold flash)
 *   - the achievement stamp with its impact (badge landing + screen shake)
 *
 * The stage (390 × 336 units) holds only the scene, centred in the space under
 * the statement, so the statement, icon and chair read as one composition.
 *
 * One GSAP timeline with one paint() (deterministic, seekable, Motion Inspector).
 * Seconds from the screen's start:
 *   0.00  the heading rises
 *   0.20  the Live Class icon springs in, large, in the middle of the stage;
 *         its pink record button starts a quiet pulse (0.6, the only loop)
 *   1.00  the icon scales down and rises to its place above the hero chair;
 *         the chairs emerge beneath it, nearest first
 *   1.75  a soft light travels from the back of the room to the hero chair;
 *         each chair warms as it passes; the count follows the same progress
 *   2.75  the light reaches the hero chair: it turns yellow and settles on a
 *         spring, lit from below; the number lands (+ 0.05)
 *   land + 0.1  the sentence completes; + 0.4 the held total
 *   land + 0.5  Front Bencher (if earned) stamps onto the backrest; the chair
 *         gives under it and recovers
 * Reduced motion / repeat view: the settled frame.
 */

// ── the stage (stage units; 390 × 420) ──
const STAGE = { w: 390, h: 336 } as const;
/** Room under the chair for the Front Bencher sticker (only when it is earned). */
const STICKER_ROOM = 106;
const CHAIR = { w: 100, h: 132 } as const;
/** The hero chair: front and centre. */
const HERO = { s: 1.7, cx: 195, bottom: 328 } as const;
const HERO_BOX = { x: HERO.cx - (CHAIR.w * HERO.s) / 2, y: HERO.bottom - CHAIR.h * HERO.s, w: CHAIR.w * HERO.s, h: CHAIR.h * HERO.s };
/** The muted chairs behind it (far, middle, the near edges), in the original screen's depth colours. */
const BACK = [
  { cx: 72, y: 28, s: 0.42, fill: "#6175d5", o: 0.36 },
  { cx: 132, y: 28, s: 0.42, fill: "#6175d5", o: 0.36 },
  { cx: 258, y: 28, s: 0.42, fill: "#6175d5", o: 0.36 },
  { cx: 318, y: 28, s: 0.42, fill: "#6175d5", o: 0.36 },
  { cx: 40, y: 64, s: 0.6, fill: "#5d77e7", o: 0.5 },
  { cx: 108, y: 64, s: 0.6, fill: "#5d77e7", o: 0.5 },
  { cx: 282, y: 64, s: 0.6, fill: "#5d77e7", o: 0.5 },
  { cx: 350, y: 64, s: 0.6, fill: "#5d77e7", o: 0.5 },
  { cx: 28, y: 124, s: 0.86, fill: "#526cf0", o: 0.62 },
  { cx: 362, y: 124, s: 0.86, fill: "#526cf0", o: 0.62 },
] as const;
/** The icon: large in the middle of the stage, then small above the hero chair. */
const ICON = { from: { cx: 195, cy: 150, size: 150 }, to: { cx: 195, cy: 50, size: 72 } } as const;

const T = {
  iconIn: 0.2,
  pulse: 0.6,
  rise: 1.0,
  emerge: 1.05,
  wave: 1.75,
  hero: 2.75,
  tail: 0.1,
} as const;

const clamp = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const pc = (v: number, total: number) => `${((v / total) * 100).toFixed(3)}%`;
/** Inverse of the cubic in-out (A3's invEio): the time at which eio reaches k. */
const eioInv = (k: number) => (k < 0.5 ? Math.cbrt(k / 4) : 1 - Math.cbrt(2 * (1 - k)) / 2);

/** The chair, front view (the original screen's chair geometry, with its lip). */
function ChairShapes({ lip }: { lip?: boolean }) {
  return (
    <>
      <rect x="16" y="0" width="68" height="68" rx="16" />
      <rect x="8" y="73" width="84" height="21" rx="10.5" />
      <rect x="17" y="91" width="9" height="41" rx="3" />
      <rect x="74" y="91" width="9" height="41" rx="3" />
      {lip && <rect x="24" y="5" width="52" height="4" rx="2" className="lr-lip" />}
    </>
  );
}

export function LiveReservedSeat({ slide }: ScreenProps<"live">) {
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const { profile, sparks } = useMotionProfile();
  const nav = useNav();
  const root = useRef<HTMLDivElement>(null);
  const [isPresent, safeToRemove] = usePresence();
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const wasLeaving = useRef(false);
  const [entryN, setEntryN] = useState(0);
  const L = COPY.liveClass;
  const finalNumber = bn(slide.attended);
  const landAt = T.hero + RELATION.landAfterDriver;
  const badgeAt = landAt + RELATION.panelAfterLand;
  // the stage's height: the scene, plus the sticker's place under the chair when earned
  const H = STAGE.h + (slide.badge ? STICKER_ROOM : 0);

  // the order the light reaches the chairs: from the back of the room to the front
  const order = useMemo(() => {
    const idx = BACK.map((c, i) => ({ i, d: c.y * 10 + Math.abs(c.cx - HERO.cx) / 40 }));
    idx.sort((a, b) => a.d - b.d);
    const rank = new Array<number>(BACK.length);
    idx.forEach((x, k) => (rank[x.i] = k));
    return rank;
  }, []);
  // the order the chairs emerge under the rising icon: nearest to its path first
  const emergeRank = useMemo(() => {
    const idx = BACK.map((c, i) => ({ i, d: Math.hypot(c.cx - ICON.from.cx, c.y - ICON.from.cy) }));
    idx.sort((a, b) => a.d - b.d);
    const rank = new Array<number>(BACK.length);
    idx.forEach((x, k) => (rank[x.i] = k));
    return rank;
  }, []);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = <E extends Element = HTMLElement>(s: string) => el.querySelector(s) as E;
    const backs = [...el.querySelectorAll<SVGGElement>("[data-back]")];
    const warms = [...el.querySelectorAll<SVGGElement>("[data-warm]")];
    const icon = q(".lr-icon");
    const dot = el.querySelector<SVGGElement>('.lr-icon [id="Group 48095899"]');
    const band = q<SVGEllipseElement>(".lr-band");
    const hero = q(".lr-hero");
    const heroFill = q<SVGRectElement>(".lr-hero-fill");
    const glow = q<SVGEllipseElement>(".lr-glow");
    const num = q(".lr-t");
    const numBox = q(".lr-num");

    // the number keeps its final width while it counts
    num.textContent = finalNumber;
    num.style.minWidth = `${num.offsetWidth}px`;
    const landing = createLanding(numBox, { origin: "50% 75%", sparks: sparks && profile === "reference", canvasHost: el, seed: 41, fit: el });

    const span = T.hero - T.wave;
    const waveT = BACK.map((_, i) => T.wave + eioInv((order[i] + 0.5) / (BACK.length + 1)) * span);
    const emergeT = BACK.map((_, i) => T.emerge + emergeRank[i] * 0.06);
    const impactAt = badgeAt + LANDING.approach;
    const hasBadge = !!slide.badge;
    let lastText = "";

    const paint = (t: number) => {
      // the icon: springs in large; then scales down and rises (travel spring)
      const inK = spr(t - T.iconIn, SPRING.stamp.z, SPRING.stamp.wn);
      const mv = spr(t - T.rise, SPRING.travel.z, SPRING.travel.wn);
      const size = lerp(ICON.from.size, ICON.to.size, mv) * lerp(0.5, 1, inK);
      const cx = lerp(ICON.from.cx, ICON.to.cx, mv);
      const cy = lerp(ICON.from.cy, ICON.to.cy, mv);
      icon.style.left = pc(cx - size / 2, STAGE.w);
      icon.style.top = pc(cy - size / 2, H);
      icon.style.width = pc(size, STAGE.w);
      icon.style.opacity = String(r3(clamp((t - T.iconIn) / 0.12)));
      // the background chairs: emerge under the icon, then warm as the light passes
      BACK.forEach((c, i) => {
        const e = t - emergeT[i];
        const k = spr(e, SPRING.panel.z, SPRING.panel.wn);
        const g = backs[i];
        const ox = c.cx;
        const oy = c.y + CHAIR.h * c.s;
        g.setAttribute("opacity", String(r3(clamp(e / 0.18))));
        g.setAttribute("transform", `translate(${ox} ${r3(oy + 10 * (1 - k))}) scale(${r3(0.92 + 0.08 * k)}) translate(${-ox} ${-oy})`);
        const a = (t - waveT[i]) / 0.5;
        warms[i].setAttribute("opacity", String(r3(a <= 0 ? 0 : a < 0.3 ? (a / 0.3) * 0.75 : lerp(0.75, 0.12, clamp((a - 0.3) / 0.7)))));
      });
      // the light: from the back row to the hero chair, on the count's eased progress
      const p = clamp((t - T.wave) / span);
      const e = eio(p);
      band.setAttribute("cy", String(r3(lerp(BACK[0].y + 20, HERO_BOX.y + HERO_BOX.h * 0.45, e))));
      band.setAttribute("opacity", String(r3(t < T.wave ? 0 : clamp((t - T.wave) / 0.2) * (1 - clamp((t - T.hero) / 0.4)) * 0.85)));
      // the count: the same progress as the light, exact at the end
      const s = bn(p >= 1 ? slide.attended : Math.round(slide.attended * e));
      if (s !== lastText) num.textContent = lastText = s;
      // the hero chair: there from the start, muted; the light turns it yellow and it settles on a spring
      const h = t - T.hero;
      const hk = h <= 0 ? 0 : spr(h, SPRING.travel.z, SPRING.travel.wn);
      // the light fills it from the floor up (eased), so it never passes through a muddy mix of blue and yellow
      const fill = eio(clamp(h / 0.32));
      heroFill.setAttribute("y", String(r3(CHAIR.h * (1 - fill))));
      heroFill.setAttribute("height", String(r3(CHAIR.h * fill + 1)));
      glow.setAttribute("opacity", String(r3(clamp(h / 0.5))));
      // … and gives under the sticker as it stamps on, recovering on the panel spring
      const b = hasBadge ? t - impactAt : -1;
      const give = b <= 0 ? 0 : 1 - spr(b, SPRING.panel.z, SPRING.panel.wn);
      const lift = h <= 0 ? 0 : -8 * (1 - hk);
      hero.style.opacity = String(r3(clamp((t - T.emerge) / 0.3)));
      hero.style.transform = `translate3d(0, ${r3(lift)}px, 0) scale(${r3(1 + 0.035 * give)}, ${r3((h <= 0 ? 0.96 : 0.96 + 0.04 * hk) - 0.05 * give)})`;
      landing.paint(t - landAt);
    };

    if (still) {
      paint(impactAt + 3);
      landing.paint(99);
      el.querySelectorAll<HTMLElement>(".lr-up, .lr-tail, .lr-held").forEach((x) => (x.style.opacity = "1"));
      return () => landing.dispose();
    }

    const clock = { t: 0 };
    const tl = gsap.timeline();
    tlRef.current = tl;
    // the heading: the reference text entrance
    const head = q(".lr-head");
    tl.fromTo(head, { opacity: 0, y: TEXT.up.y, scale: TEXT.up.scale }, { opacity: 1, y: 0, scale: 1, duration: TEXT.up.dur, ease: gsapEase("refPop") }, 0);
    tl.fromTo(q(".lr-num"), { opacity: 0 }, { opacity: 1, duration: 0.35, ease: gsapEase("settle") }, T.wave - 0.35);
    tl.to(clock, { t: impactAt + 1.2, duration: impactAt + 1.2, ease: "none", onUpdate: () => paint(clock.t) }, 0);
    // the sentence completes with the landing; the held total follows as a caption
    const tail = q(".lr-tail");
    const held = el.querySelector<HTMLElement>(".lr-held");
    tl.fromTo(tail, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, ease: gsapEase("settle") }, landAt + T.tail);
    if (held) tl.fromTo(held, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: gsapEase("refSoft") }, landAt + RELATION.captionAfterLand);
    // the record button: the only loop, very quiet
    let pulse: gsap.core.Tween | null = null;
    tl.call(() => {
      if (dot) pulse = gsap.to(dot, { scale: 1.12, opacity: 0.82, svgOrigin: "78.75 74.55", duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1 });
    }, undefined, T.pulse);
    paint(0);
    const unregister = devRegister("03 Live · Reserved Seat (GSAP)", fromGsap(tl));
    return () => {
      unregister();
      tl.kill();
      pulse?.kill();
      if (dot) gsap.set(dot, { clearProps: "transform,opacity" });
      landing.dispose();
      tlRef.current = null;
    };
    // the entrance is fixed for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, slide.attended, finalNumber, entryN, H]);

  // leaving: 03 → 04 ("focus") keeps the screen a moment while its text clears; anything else at once.
  // Called back while leaving: the entrance runs again.
  useLayoutEffect(() => {
    const el = root.current;
    if (isPresent) {
      if (wasLeaving.current) {
        wasLeaving.current = false;
        setEntryN((n) => n + 1);
      }
      return;
    }
    wasLeaving.current = true;
    tlRef.current?.kill();
    if (nav.kind !== "focus" || !el) {
      safeToRemove?.();
      return;
    }
    const c = gsap.to(el.querySelectorAll(".lr-top"), { opacity: 0, y: -8, duration: FOCUS.textOut, ease: "power2.out" });
    const t = window.setTimeout(() => safeToRemove?.(), FOCUS.out * 1000);
    return () => {
      c.kill();
      clearTimeout(t);
    };
    // nav is read at the moment the screen starts leaving
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  const heroStyle: CSSProperties = {
    left: pc(HERO_BOX.x, STAGE.w),
    top: pc(HERO_BOX.y, H),
    width: pc(HERO_BOX.w, STAGE.w),
    height: pc(HERO_BOX.h, H),
  };

  return (
    <div ref={root} className={`slide lr ${still ? "lr-still" : ""}`} style={{ "--lr-num": bn(slide.attended).length <= 2 ? "min(28cqw, 13.5cqh)" : "min(22cqw, 11cqh)" } as CSSProperties}>
      <div className="lr-top">
        <p className="lr-sr">
          {L.headline.join(" ")}। {L.statement(slide.attended)}। {slide.held > 0 ? COPY.live.held(slide.held) : ""}
        </p>
        <h1 className="lr-head" aria-hidden="true">
          {L.headline.join(" ")}
        </h1>
        <div className="lr-stat" aria-hidden="true">
          <div className="lr-num">
            <span className="lr-t">{still ? finalNumber : bn(0)}</span>
          </div>
          <p className="lr-tail" style={{ opacity: still ? 1 : 0 }}>
            {L.unitTop} {L.unitBottom} {L.tail}
          </p>
          {slide.held > 0 && (
            <p className="lr-held" style={{ opacity: still ? 1 : 0 }}>
              {COPY.live.held(slide.held)}
            </p>
          )}
        </div>
      </div>

      <div className="lr-stage" aria-hidden="true" style={{ "--lr-ratio": String(H / STAGE.w) } as CSSProperties}>
        <svg className="lr-room" viewBox={`0 0 ${STAGE.w} ${H}`}>
          <defs>
            <radialGradient id="lr-band-g">
              <stop offset="0" stopColor="#ffe08a" stopOpacity="0.5" />
              <stop offset="0.6" stopColor="#ffe08a" stopOpacity="0.12" />
              <stop offset="1" stopColor="#ffe08a" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="lr-glow-g">
              <stop offset="0" stopColor="#ffc93c" stopOpacity="0.42" />
              <stop offset="1" stopColor="#ffc93c" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse className="lr-band" cx={STAGE.w / 2} cy={BACK[0].y} rx={STAGE.w * 0.58} ry="54" fill="url(#lr-band-g)" opacity="0" />
          {BACK.map((c, i) => (
            <g key={i} data-back="" opacity={still ? 1 : 0}>
              <g transform={`translate(${(c.cx - (CHAIR.w * c.s) / 2).toFixed(2)} ${c.y}) scale(${c.s})`}>
                <g fill={c.fill} fillOpacity={c.o}>
                  <ChairShapes />
                </g>
                <g data-warm="" fill="#ffd977" opacity="0">
                  <ChairShapes />
                </g>
              </g>
            </g>
          ))}
          <ellipse className="lr-glow" cx={HERO.cx} cy={HERO.bottom - 2} rx="104" ry="20" fill="url(#lr-glow-g)" opacity="0" />
        </svg>

        <div className="lr-icon" dangerouslySetInnerHTML={{ __html: liveIconRaw }} />

        <div className="lr-hero" style={heroStyle}>
          <svg className="lr-hero-chair" viewBox={`0 0 ${CHAIR.w} ${CHAIR.h}`}>
            <g className="lr-hero-muted">
              <ChairShapes lip />
            </g>
            <defs>
              <clipPath id="lr-hero-clip">
                <rect className="lr-hero-fill" x="-10" y={still ? -1 : CHAIR.h} width={CHAIR.w + 20} height={still ? CHAIR.h + 2 : 0} />
              </clipPath>
            </defs>
            <g className="lr-hero-lit" clipPath="url(#lr-hero-clip)">
              <ChairShapes lip />
            </g>
          </svg>
          {slide.badge && (
            <div className="lr-sticker">
              <BadgePill id={slide.badge} landAt={badgeAt} amplitude={3} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
