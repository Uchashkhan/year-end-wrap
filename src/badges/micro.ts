import gsap from "gsap";
import { SPRING } from "../motion/reference";
import { springEase } from "../motion/spring";
import type { BadgeArtId } from "../data/badgeArt";

/**
 * Badge artwork micro-animations, one per badge, chosen from its own drawing.
 * The finalized SVGs are flat lists of paths (no named layers); the elements are
 * addressed by their paint order in the exported file (src/assets/badges), which
 * is the Figma layer order of each badge's vector group. Nothing is redrawn:
 * paths are moved, scaled or briefly overlaid (a white copy of a path for a
 * flash, a clipped light band for a sweep) and always return to their place.
 *
 *   streakMaster     flame (paths 1 outer, 2 middle, 3 core): flares on landing,
 *                    then a quiet flicker loop, each layer at its own rhythm,
 *                    anchored at its base · check mark (16): one pop
 *   quizWarrior      the three ticks (5, 6, 7): pop in answer order · the
 *                    lightning bolt (18 + its shading 19, 20): one flash
 *   videoMarathoner  play triangle (9): one press · progress bar + knob (8): the
 *                    playhead nudges forward and settles
 *   firstBencher     the chair (frame and seat 4–14, leg 17): hops and takes its
 *                    seat (small squash on the base, spring settle)
 *   capstone         crown (1): a gold light sweep · gem (facets 4, 5, 6): one glint
 *
 * `activate` adds one-shot tweens to the badge timeline at `at` (after the
 * landing) and returns ambient loops (started by the timeline, killed on exit).
 */
export type Activate = (svg: SVGSVGElement, tl: gsap.core.Timeline, at: number, uid: string) => { loops: () => gsap.core.Tween[] };

const NS = "http://www.w3.org/2000/svg";
const settle = (d: number) => springEase(SPRING.panel, d);

/** Wrap consecutive paths in a <g> (a common transform origin), in place. */
function wrap(paths: SVGPathElement[]): SVGGElement {
  const g = document.createElementNS(NS, "g");
  paths[0].before(g);
  paths.forEach((p) => g.append(p));
  return g;
}
/** A white copy of a path, right above it, invisible until flashed. */
function flashCopy(p: SVGPathElement): SVGPathElement {
  const c = p.cloneNode() as SVGPathElement;
  c.removeAttribute("id");
  c.setAttribute("fill", "#FFFFFF");
  c.setAttribute("opacity", "0");
  c.setAttribute("pointer-events", "none");
  p.after(c);
  return c;
}
function defs(svg: SVGSVGElement): SVGDefsElement {
  let d = svg.querySelector("defs");
  if (!d) {
    d = document.createElementNS(NS, "defs");
    svg.prepend(d);
  }
  return d as SVGDefsElement;
}
/** A soft light band clipped to a path's shape, placed right above it. */
function sweepBand(svg: SVGSVGElement, shape: SVGPathElement, after: Element, uid: string) {
  const d = defs(svg);
  const bb = shape.getBBox();
  const clip = document.createElementNS(NS, "clipPath");
  clip.id = `${uid}-clip`;
  const cp = shape.cloneNode() as SVGPathElement;
  cp.removeAttribute("id");
  clip.append(cp);
  const grad = document.createElementNS(NS, "linearGradient");
  grad.id = `${uid}-grad`;
  grad.setAttribute("x1", "0");
  grad.setAttribute("x2", "1");
  [
    ["0", "0"],
    ["0.5", "0.6"],
    ["1", "0"],
  ].forEach(([o, a]) => {
    const s = document.createElementNS(NS, "stop");
    s.setAttribute("offset", o);
    s.setAttribute("stop-color", "#FFFFFF");
    s.setAttribute("stop-opacity", a);
    grad.append(s);
  });
  d.append(clip, grad);
  const g = document.createElementNS(NS, "g");
  g.setAttribute("clip-path", `url(#${clip.id})`);
  g.setAttribute("pointer-events", "none");
  const band = document.createElementNS(NS, "rect");
  const w = bb.width * 0.32;
  band.setAttribute("x", String(bb.x - w));
  band.setAttribute("y", String(bb.y - bb.height * 0.2));
  band.setAttribute("width", String(w));
  band.setAttribute("height", String(bb.height * 1.4));
  band.setAttribute("fill", `url(#${grad.id})`);
  g.append(band);
  after.after(g);
  return { band, travel: bb.width + w * 2 };
}

const pop = (tl: gsap.core.Timeline, el: Element | Element[], at: number, peak = 1.2, stagger = 0) =>
  tl.fromTo(
    el,
    { scale: 1 },
    {
      keyframes: [
        { scale: peak, duration: 0.14, ease: "power2.out" },
        { scale: 1, duration: 0.42, ease: settle(0.42) },
      ],
      transformOrigin: "50% 50%",
      stagger,
    },
    at,
  );

export const MICRO: Record<BadgeArtId, Activate> = {
  streakMaster(svg, tl, at) {
    const p = [...svg.querySelectorAll<SVGPathElement>("path")];
    const flames = [p[1], p[2], p[3]];
    // the flame flares as the badge lands, then settles on a spring
    tl.fromTo(
      flames,
      { scaleY: 1, scaleX: 1 },
      {
        keyframes: [
          { scaleY: 1.12, scaleX: 0.97, duration: 0.16, ease: "power2.out" },
          { scaleY: 1, scaleX: 1, duration: 0.5, ease: settle(0.5) },
        ],
        transformOrigin: "50% 100%",
        stagger: 0.04,
      },
      at,
    );
    pop(tl, p[16], at + 0.12, 1.2);
    // quiet flicker: outer slow and small, core quick and lively
    const amp = [0.025, 0.04, 0.06];
    const dur = [0.95, 0.72, 0.55];
    const skew = [0, 1.2, -1.6];
    return {
      loops: () =>
        flames.map((f, i) =>
          gsap.to(f, { scaleY: 1 + amp[i], skewX: skew[i], duration: dur[i], ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 100%" }),
        ),
    };
  },

  quizWarrior(svg, tl, at) {
    const p = [...svg.querySelectorAll<SVGPathElement>("path")];
    // the three answers ticked, in order
    pop(tl, [p[5], p[6], p[7]], at, 1.25, 0.1);
    // then the bolt strikes: one white flash over the bolt, a small kick of the bolt
    const flash = flashCopy(p[18]);
    const bolt = wrap([p[18], flash, p[19], p[20]]);
    const t = at + 0.38;
    tl.fromTo(flash, { opacity: 0 }, { keyframes: [{ opacity: 0.7, duration: 0.07, ease: "none" }, { opacity: 0, duration: 0.32, ease: "power2.out" }] }, t);
    pop(tl, bolt, t, 1.07);
    return { loops: () => [] };
  },

  videoMarathoner(svg, tl, at) {
    const p = [...svg.querySelectorAll<SVGPathElement>("path")];
    // play: pressed once
    tl.fromTo(
      p[9],
      { scale: 1 },
      {
        keyframes: [
          { scale: 0.84, duration: 0.1, ease: "power2.in" },
          { scale: 1.08, duration: 0.14, ease: "power2.out" },
          { scale: 1, duration: 0.4, ease: settle(0.4) },
        ],
        transformOrigin: "50% 50%",
      },
      at,
    );
    // the playhead nudges forward, then settles back to its place
    tl.fromTo(
      p[8],
      { scaleX: 1 },
      { keyframes: [{ scaleX: 1.06, duration: 0.28, ease: "power2.out" }, { scaleX: 1, duration: 0.5, ease: "sine.inOut" }], transformOrigin: "0% 50%" },
      at + 0.24,
    );
    return { loops: () => [] };
  },

  firstBencher(svg, tl, at) {
    const p = [...svg.querySelectorAll<SVGPathElement>("path")];
    const chair = wrap(p.slice(4, 15));
    const leg = p[17];
    // the chair hops and takes its seat
    tl.to([chair, leg], { y: -9, duration: 0.16, ease: "power2.out" }, at)
      .to([chair, leg], { y: 0, duration: 0.14, ease: "power2.in" }, at + 0.16)
      .fromTo(
        chair,
        { scaleY: 1, scaleX: 1 },
        { keyframes: [{ scaleY: 0.94, scaleX: 1.03, duration: 0.07, ease: "power1.out" }, { scaleY: 1, scaleX: 1, duration: 0.45, ease: settle(0.45) }], transformOrigin: "50% 100%" },
        at + 0.3,
      );
    return { loops: () => [] };
  },

  capstone(svg, tl, at, uid) {
    const p = [...svg.querySelectorAll<SVGPathElement>("path")];
    // a gold light sweep across the crown (above its highlight, under the gem)
    const { band, travel } = sweepBand(svg, p[1], p[3], uid);
    tl.fromTo(band, { x: 0 }, { x: travel, duration: 0.75, ease: "power1.inOut" }, at);
    // then the gem glints
    const glint = flashCopy(p[6]);
    const gem = wrap([p[4], p[5], p[6], glint]);
    const t = at + 0.55;
    tl.fromTo(glint, { opacity: 0 }, { keyframes: [{ opacity: 0.85, duration: 0.1, ease: "none" }, { opacity: 0, duration: 0.4, ease: "power2.out" }] }, t);
    pop(tl, gem, t, 1.08);
    return { loops: () => [] };
  },
};
