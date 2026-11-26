import { OPTICS_SPECTRUM, OpticsPrism, OpticsProjection } from "../components/OpticsArtwork";
import { useId, useLayoutEffect, useRef } from "react";
import { usePresence } from "motion/react";
import gsap from "gsap";
import { BadgeReveal } from "../components/primitives";
import { COPY } from "../data/copy";
import { bn } from "../lib/bangla";
import { usePrefs } from "../lib/prefs";
import { easeFn, gsapEase } from "../motion/ease";
import { coupledCount, createLanding } from "../motion/primitives";
import { eio, SPRING, TEXT } from "../motion/reference";
import { springEase } from "../motion/spring";
import { devRegister, fromGsap } from "../motion/timeline";
import { VIDEO_BEYOND as T } from "../motion/videoBeyond";
import { TAKEOVER, WATCH, useEntry, useNav } from "../story/entry";
import { useFacet } from "../variants/facets";
import type { ScreenProps } from "./types";
import "../styles/video-beyond.css";

const FRAME = { x: 26, y: 81, w: 308, h: 162, r: 16 };
const PLAY = { x: 180, y: 161, r: 35 };
const BAR = { x: 67, y: 228, width: 230 };
const PLAY_LEFT = [[-7, -10], [1, -5], [1, 5], [-7, 10]];
const PLAY_RIGHT = [[1, -5], [9, 0], [9, 0], [1, 5]];
const PAUSE_LEFT = [[-7, -8], [-3, -8], [-3, 8], [-7, 8]];
const PAUSE_RIGHT = [[3, -8], [7, -8], [7, 8], [3, 8]];
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const clamp = (p: number) => Math.max(0, Math.min(1, p));
const cue = (t: number, at: number, duration: number) => clamp((t - at) / duration);
const points = (a: number[][], b: number[][], p: number) =>
  a.map(([x, y], i) => `${lerp(x, b[i][0], p)},${lerp(y, b[i][1], p)}`).join(" ");

function OpticsPlayer() {
  const id = useId();
  return (
    <svg className="vb-stage" viewBox="0 24 360 232" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-board`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#15387a" /><stop offset="1" stopColor="#0d2359" />
        </linearGradient>
        <pattern id={`${id}-grid`} width="14" height="14" patternUnits="userSpaceOnUse" x="34" y="90">
          <path d="M0 14V0H14" stroke="#b8ddff" strokeOpacity=".15" fill="none" />
        </pattern>
        <clipPath id={`${id}-panel`}>
          <rect className="vb-panel-clip" x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} rx={FRAME.r} />
        </clipPath>
        <clipPath id={`${id}-lesson`}>
          <rect className="vb-lesson-clip" x="35" y="90" width="290" height="125" rx="9" />
        </clipPath>
      </defs>

      <rect className="vb-shell" {...{ x: FRAME.x, y: FRAME.y, width: FRAME.w, height: FRAME.h, rx: FRAME.r }} />
      <g className="vb-interior" clipPath={`url(#${id}-panel)`}>
        <rect x="35" y="90" width="290" height="125" rx="9" fill={`url(#${id}-board)`} />
        <rect x="35" y="90" width="290" height="125" rx="9" fill={`url(#${id}-grid)`} />
        <path d="M50 192H311" stroke="#bddfff" strokeOpacity=".24" strokeDasharray="3 5" />
        <image href="/assets/subjects/physics.svg" x="43" y="98" width="22" height="22" />
        <path d="M59 172H48m0 0v10" stroke="#659cd1" strokeWidth="1.5" fill="none" />
        <path d="M52 178h9m-4-4v8" stroke="#d8eeff" strokeOpacity=".7" strokeWidth="1.3" />
        <rect x={BAR.x} y={BAR.y - 1.5} width={BAR.width} height="3" rx="1.5" fill="#536b9d" />
        <rect className="vb-progress" x={BAR.x} y={BAR.y - 1.5} width={BAR.width} height="3" rx="1.5" fill="var(--ds-warning-500)" />
        <circle className="vb-playhead" cx={BAR.x + BAR.width} cy={BAR.y} r="3.8" fill="var(--ds-warning-500)" />
        <path d="M309 226v-3h3m4 0h3v3m0 4v3h-3m-4 0h-3v-3" fill="none" stroke="#d8eeff" strokeWidth="1.35" strokeLinecap="round" />
      </g>

      <g className="vb-lesson" clipPath={`url(#${id}-lesson)`}>
        <path className="vb-incidence" fill="none" stroke="#e8faff" strokeWidth="2.4" strokeLinecap="round" />
        <circle className="vb-photon" r="2.4" fill="#fff" />
        <g className="vb-rays" fill="none" strokeWidth="2.1" strokeLinecap="round">
          {OPTICS_SPECTRUM.map((ink) => <path key={ink} stroke={ink} />)}
        </g>
        <OpticsPrism className="vb-prism" />
        <path className="vb-refraction" fill="none" stroke="#fff9db" strokeOpacity=".85" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <OpticsProjection className="vb-projection" />
      </g>
      <g className="vb-indicator" fill="#fff">
        <polygon className="vb-icon-l" />
        <polygon className="vb-icon-r" />
      </g>
    </svg>
  );
}

export function VideoBeyond({ slide }: ScreenProps<"video">) {
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const badgeImpact = useFacet("badge", "reveal") === "impact";
  const fromQuiz = useEntry().kind === "watch";
  const nav = useNav();
  const [isPresent, safeToRemove] = usePresence();
  const root = useRef<HTMLDivElement>(null);
  const films = slide.films !== null ? COPY.video.films(slide.films) : null;

  useLayoutEffect(() => {
    const el = root.current;
    if (!el || !isPresent) return;
    const q = <E extends Element = SVGElement>(selector: string) => el.querySelector<E>(selector)!;
    const stage = q<SVGSVGElement>(".vb-stage");
    const shell = q(".vb-shell");
    const panel = q(".vb-panel-clip");
    const lessonClip = q(".vb-lesson-clip");
    const interior = q(".vb-interior");
    const lesson = q(".vb-lesson");
    const indicator = q(".vb-indicator");
    const left = q(".vb-icon-l");
    const right = q(".vb-icon-r");
    const progress = q(".vb-progress");
    const playhead = q(".vb-playhead");
    const prism = q(".vb-prism");
    const projection = q(".vb-projection");
    const incidence = q(".vb-incidence");
    const refraction = q(".vb-refraction");
    const photon = q(".vb-photon");
    const rays = [...el.querySelectorAll<SVGPathElement>(".vb-rays path")];
    const result = q<HTMLElement>(".vb-number");
    const writeCount = coupledCount(q<HTMLElement>(".vb-value"), slide.minutes);
    const getColor = (token: string) => getComputedStyle(el).getPropertyValue(token).trim();
    const warning = getColor("--ds-warning-500") || "#f3be28";
    const color = gsap.utils.interpolate(warning, "#0a1b47");
    const icon = gsap.utils.interpolate("#0a1b47", "#f5faff");
    const pop = springEase(SPRING.panel, T.play.duration);
    const rise = easeFn("refPop");
    const soft = easeFn("refSoft");
    const lead = q<HTMLElement>(".vb-lead");
    const stat = q<HTMLElement>(".vb-stat");
    const comparison = el.querySelector<HTMLElement>(".vb-comparison");
    const badge = el.querySelector<HTMLElement>(".vb-badge");
    const landing = still ? null : createLanding(result, { fit: el });

    const textIn = (target: HTMLElement | null, p: number, dy: number) => {
      if (!target) return;
      target.style.opacity = String(p);
      target.style.transform = `translate3d(0,${dy}px,0)`;
    };
    const rect = (node: SVGElement, x: number, y: number, w: number, h: number, r: number) => {
      node.setAttribute("x", String(x)); node.setAttribute("y", String(y));
      node.setAttribute("width", String(w)); node.setAttribute("height", String(h));
      node.setAttribute("rx", String(r));
    };
    const paintPhoton = (p: number, x: number, y: number, brightness: number) => {
      photon.setAttribute("cx", String(lerp(60, x, p)));
      photon.setAttribute("cy", String(lerp(172, y, p)));
      photon.style.opacity = String(brightness * Math.sin(Math.PI * p));
    };
    const paint = (t: number) => {
      const enter = cue(t, T.play.at, T.play.duration);
      const grow = eio(cue(t, T.expand.at, T.expand.duration));
      const seed = PLAY.r * (0.66 + pop(enter) * 0.34);
      const x = lerp(PLAY.x - seed, FRAME.x, grow);
      const y = lerp(PLAY.y - seed, FRAME.y, grow);
      const w = lerp(seed * 2, FRAME.w, grow);
      const h = lerp(seed * 2, FRAME.h, grow);
      const r = lerp(seed, FRAME.r, grow);
      rect(shell, x, y, w, h, r);
      rect(panel, x, y, w, h, r);
      shell.setAttribute("fill", color(grow));
      shell.style.opacity = String(clamp(enter * 5));
      interior.style.opacity = String(eio(cue(t, 0.70, 0.38)));

      const travel = eio(cue(t, T.playback.at, T.playback.duration));
      const playing = eio(cue(t, 0.97, 0.24)) * (1 - eio(cue(t, T.land - 0.12, 0.28)));
      indicator.setAttribute("transform", `translate(${lerp(PLAY.x, 50, grow)} ${lerp(PLAY.y, BAR.y, grow)}) scale(${lerp(1.55 * seed / PLAY.r, 0.67, grow)})`);
      indicator.setAttribute("fill", icon(grow));
      indicator.style.opacity = shell.style.opacity;
      left.setAttribute("points", points(PLAY_LEFT, PAUSE_LEFT, playing));
      right.setAttribute("points", points(PLAY_RIGHT, PAUSE_RIGHT, playing));
      progress.setAttribute("width", String(BAR.width * travel));
      playhead.setAttribute("cx", String(BAR.x + BAR.width * travel));
      writeCount(travel);

      const assembly = eio(cue(travel, 0.01, 0.30));
      const escape = eio(cue(travel, 0.29, 0.67));
      const screen = eio(cue(travel, 0.39, 0.60));
      const aperture = eio(cue(travel, 0.24, 0.40));
      // The lesson is one group. Its clip expands around the moving geometry as it crosses the bezel.
      rect(lessonClip, lerp(35, 0, aperture), lerp(90, 0, aperture), lerp(290, 360, aperture), lerp(125, 228, aperture), lerp(9, 0, aperture));
      lesson.style.opacity = String(eio(cue(t, 0.82, 0.40)));

      const px = lerp(132, 113, escape);
      const py = lerp(160, 86, escape);
      const rotation = -12 * (1 - assembly) - 4 * escape;
      const prismScale = lerp(0.72 + 0.1 * assembly, 1, escape);
      prism.setAttribute("transform", `translate(${px} ${py}) rotate(${rotation}) scale(${prismScale})`);
      const rad = rotation * Math.PI / 180;
      const joint = (jx: number, jy: number) => ({
        x: px + (jx * Math.cos(rad) - jy * Math.sin(rad)) * prismScale,
        y: py + (jx * Math.sin(rad) + jy * Math.cos(rad)) * prismScale,
      });
      const entry = joint(-20, 0);
      const split = joint(13, 6);
      const sx = lerp(258, 265, screen);
      const sy = lerp(157, 81, screen);
      const plateScale = lerp(0.71, 1, screen);
      projection.setAttribute("transform", `translate(${sx} ${sy}) scale(${plateScale})`);
      projection.style.opacity = String(0.32 + 0.68 * assembly);
      const intensity = eio(cue(travel, 0.02, 0.35));
      incidence.setAttribute("d", `M57 172 ${entry.x} ${entry.y}`);
      incidence.style.opacity = String(intensity * 0.92);
      refraction.setAttribute("d", `M${entry.x} ${entry.y} ${px} ${py + 4} ${split.x} ${split.y}`);
      refraction.style.opacity = String(intensity);
      rays.forEach((ray, i) => {
        const ex = sx - 11 * plateScale;
        const ey = sy + (-19 + i * 10) * plateScale;
        const draw = eio(cue(travel, 0.035 + i * 0.017, 0.35));
        ray.setAttribute("d", `M${split.x} ${split.y} ${lerp(split.x, ex, draw)} ${lerp(split.y, ey, draw)}`);
        ray.style.opacity = String(intensity * 0.88);
      });
      // Preserve the final incoming ray endpoint for the quiet settled-state light pulse.
      photon.dataset.x = String(entry.x);
      photon.dataset.y = String(entry.y);
      paintPhoton(travel, entry.x, entry.y, intensity * 0.62);

      const heading = cue(t, 0.05, TEXT.up.dur);
      const number = cue(t, 0.19, TEXT.up.dur);
      textIn(lead, soft(heading), (1 - rise(heading)) * 16);
      textIn(stat, soft(number), (1 - rise(number)) * 16);
      const caption = cue(t, T.comparison, 0.42);
      textIn(comparison, soft(caption), (1 - soft(caption)) * 7);
      if (badgeImpact || still) {
        textIn(badge, 1, 0);
      } else {
        const award = cue(t, T.badge, 0.58);
        textIn(badge, soft(award), (1 - rise(award)) * 11);
      }
      landing?.paint(t - T.land);
    };

    if (still) {
      paint(T.end);
      return;
    }

    const clock = { time: 0 };
    const ambient = { phase: 0 };
    paint(0);
    const tl = gsap.timeline();
    tl.to(clock, { time: T.end, duration: T.end, ease: "none", onUpdate: () => paint(clock.time) }, 0);
    tl.to(ambient, {
      phase: 1, duration: T.ambientPeriod, repeat: -1, ease: "none",
      onUpdate: () => paintPhoton(ambient.phase, Number(photon.dataset.x), Number(photon.dataset.y), 0.64),
    }, T.end);

    // Keep the original Answer Parade handover. Its underline travels into the same spot as the play puck.
    const from = fromQuiz ? el.closest(".story")?.querySelector(".slide.qa") : null;
    const deck = from?.querySelector<HTMLElement>(".qa-deck");
    const bar = from?.querySelector<HTMLElement>(".qa-bar");
    const handover = from ? gsap.timeline() : null;
    if (deck) handover?.to(deck, { y: `+=${el.clientHeight * 0.06}`, opacity: 0, duration: WATCH.deckOut.dur, ease: gsapEase("glide") }, WATCH.deckOut.at);
    if (bar) {
      const box = bar.getBoundingClientRect();
      const matrix = stage.getScreenCTM();
      if (matrix) {
        const seed = new DOMPoint(PLAY.x, PLAY.y).matrixTransform(matrix);
        handover?.to(bar, {
          x: Number(gsap.getProperty(bar, "x")) + seed.x - (box.left + box.width / 2),
          y: Number(gsap.getProperty(bar, "y")) + seed.y - (box.top + box.height / 2),
          scaleX: 0.17, scaleY: 0.75, duration: WATCH.bar.dur, ease: gsapEase("glide"),
        }, WATCH.bar.at);
        handover?.to(bar, { opacity: 0, duration: WATCH.barFade.dur }, WATCH.barFade.at);
      }
    }
    if (handover) tl.add(handover, 0);
    const unregister = devRegister("06 Beyond the Screen · master", {
      ...fromGsap(tl),
      duration: T.end,
      finish: () => { tl.seek(T.end, false); },
      get time() { return Math.min(tl.time(), T.end); },
    });
    return () => {
      unregister();
      handover?.revert();
      tl.kill();
      landing?.dispose();
    };
  }, [badgeImpact, fromQuiz, isPresent, slide.minutes, still]);

  useLayoutEffect(() => {
    const content = root.current?.querySelector(".vb-content");
    if (isPresent || !content) return;
    if (nav.kind !== "takeover" || still) {
      safeToRemove?.();
      return;
    }
    const exit = gsap.timeline({ onComplete: () => safeToRemove?.() })
      .to(content, { y: -8, opacity: 0, duration: TAKEOVER.textOut, ease: gsapEase("glide") })
      .set({}, {}, TAKEOVER.out);
    return () => { exit.revert(); };
  }, [isPresent, nav.kind, safeToRemove, still]);

  return (
    <div ref={root} className="slide vb">
      <p className="vb-sr">{COPY.video.lead} {bn(slide.minutes)} {COPY.video.unit}{films ? `। ${films.line1} ${films.lead} ${films.count}` : ""}</p>
      <div className="vb-content">
        <div className="vb-copy" aria-hidden="true">
          <h1 className="vb-lead">{COPY.video.lead}</h1>
          <div className="vb-stat">
            <span className="vb-number" data-wide={String(slide.minutes).length > 4 || undefined}>
              <span className="vb-value">{bn(slide.minutes)}</span>
              <span className="vb-ghost">{bn(slide.minutes)}</span>
            </span>
            <span className="vb-unit">{COPY.video.unit}</span>
          </div>
        </div>
        <OpticsPlayer />
        {(films || slide.badge) && (
          <div className="vb-footer">
            {films && <p className="vb-comparison" aria-hidden="true">{films.line1} {films.lead} <strong>{films.count}</strong></p>}
            {slide.badge && <div className="vb-badge"><BadgeReveal id={slide.badge} height="var(--vb-badge-height)" landAt={T.badge} /></div>}
          </div>
        )}
      </div>
    </div>
  );
}
