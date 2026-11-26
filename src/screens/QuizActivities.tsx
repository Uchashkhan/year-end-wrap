import { useLayoutEffect, useRef, type CSSProperties } from "react";
import gsap from "gsap";
import { COPY, SUBJECTS } from "../data/copy";
import { bn } from "../lib/bangla";
import { usePrefs } from "../lib/prefs";
import { BadgePill } from "../components/primitives";
import { gsapEase } from "../motion/ease";
import type { SubjectId } from "../data/types";
import type { ScreenProps } from "./types";
import "../styles/quiz-activities.css";

/**
 * 05 Quiz — "Quiz Activities" (screen facet quiz.design = reference; dev only).
 *
 * The foreground of the reference prototype's Journey direction, quiz screen
 * (C3 `renderQuiz()` / `mountQuiz()`, `.qz-stage`, `.qc`, `acHead()`, `hn()`,
 * `landFx()`, `FX.sparks()`, `badgeRig()`), ported as written onto one GSAP
 * clock: the same card, the same seeded flights, the same closed-form springs
 * (position ζ .6 ωn 11, angle ζ .45 ωn 11, fan ζ .8/.6/.32 ωn 9), the same
 * count tied to the landings, the same number landing (overshoot, gold flash,
 * glow, sparks) and the same panel rise at 3.35 s.
 *
 * Ours, not the reference's: the background (the screen keeps its own), the copy
 * (PRD: headline, "এই বছর [X]টি কুইজ শেষ করেছ", the nudge or badge only when
 * compose.ts provides them), the count (completed quizzes), the subject names
 * and colours (our subject data), the typeface. Left out: the reference's medal,
 * earned-title tiers, "next title" bar and bird image (not PRD / placeholders).
 * Reduced motion / repeat view: the settled state, still.
 */

const N = 12;
const CARD_SUBJECTS: SubjectId[] = ["physics", "chemistry", "math", "biology"]; // the reference's four, in its order
const END = 5.4; // the reference's clock: everything has settled
const PANEL_AT = 3.35; // badgeRig(el, 3.35)

// the reference's motion maths (C3, lines 636–684), unchanged
const clamp = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const eio = (t: number) => ((t = clamp(t)), t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const eo = (t: number) => ((t = clamp(t)), 1 - Math.pow(1 - t, 3));
const spr = (t: number, z: number, wn: number) => {
  if (t <= 0) return 0;
  const wd = wn * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * wn * t) * (Math.cos(wd * t) + ((z * wn) / wd) * Math.sin(wd * t));
};
const kf = (k: [number, number][], t: number) => {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (t <= k[i][0]) return lerp(k[i - 1][1], k[i][1], eio((t - k[i - 1][0]) / (k[i][0] - k[i - 1][0])));
  return k[k.length - 1][1];
};
const rng = (a: number) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const tf = (x: number, y: number, s: number | null, rot: number) =>
  `translate3d(${r3(x)}px,${r3(y)}px,0)${s != null && s !== 1 ? ` scale(${r3(s)})` : ""}${rot ? ` rotate(${r3(rot)}deg)` : ""}`;
const STAR = "M12 0C12.9 7.6 16.4 11.1 24 12 16.4 12.9 12.9 16.4 12 24 11.1 16.4 7.6 12.9 0 12 7.6 11.1 11.1 7.6 12 0Z";

/** The count steps down with its length so number + unit keep one row (the reference's size up to 3 digits). */
function numSize(n: number): CSSProperties {
  return { "--qr-hs": bn(n).length <= 3 ? "min(96px, 11.2cqh)" : "min(70px, 17cqw, 9cqh)" } as CSSProperties;
}
/** The refined layouts use our Quiz hero numeral's sizes (QuizRecap numSize). */
function heroSize(n: number): CSSProperties {
  const len = bn(n).length;
  return { "--qr-hs": len <= 2 ? "min(38cqw, 19cqh)" : len === 3 ? "min(30cqw, 15cqh)" : "min(23cqw, 12cqh)" } as CSSProperties;
}

/**
 * Layouts (screen facet quiz.design):
 *   c3         the reference's own composition (as ported; unchanged)
 *   centered   A — one centred statement (এই বছর / [X] / টি কুইজ শেষ করেছ) in our
 *              yellow Quiz numeral, the stack right under it, the nudge or badge
 *              as standalone text below
 *   editorial  B — left-aligned: the lead over the number, the unit and its ending
 *              set beside the number's baseline (the Answer Parade's figure), the
 *              stack centred, the nudge or badge standalone
 * The cards, their seeded flights, springs, count and fan are the same in all
 * three; A and B size the stack to the room the panel used to take, land the
 * number without the reference's gold flash (swell + subtle glow, as our
 * Reference Motion landing), complete the sentence as the number lands, and
 * bring the nudge / badge in 0.5 s after the landing.
 */
export type QuizActivitiesLayout = "c3" | "centered" | "editorial";
/** The number lands: last card (0.55 + 11 × 0.16) + 0.3 s. */
const LAND_AT = 0.55 + (N - 1) * 0.16 + 0.3;

export function QuizActivities({ slide, layout = "c3" }: ScreenProps<"quiz"> & { layout?: QuizActivitiesLayout }) {
  const refined = layout !== "c3";
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const root = useRef<HTMLDivElement>(null);
  const hasPanel = !!(slide.nudge || slide.badge);

  // layout effect: the refined layouts size their stage before the first paint (no shift)
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const stage = el.querySelector<HTMLElement>(".qr-stage")!;
    const cards = [...stage.querySelectorAll<HTMLElement>(".qr-card")];
    const hn = el.querySelector<HTMLElement>(".qr-hn")!;
    const tEl = hn.querySelector<HTMLElement>(".qr-t")!;
    const gold = hn.querySelector<HTMLElement>(".qr-g");
    const flare = hn.querySelector<HTMLElement>(".qr-fl")!;
    const panel = el.querySelector<HTMLElement>(".qr-panel");
    const canvas = el.querySelector<HTMLCanvasElement>(".qr-fx")!;

    // fixW: the number keeps its final width while it counts
    const fin = bn(slide.count);
    tEl.textContent = fin;
    tEl.style.minWidth = `${tEl.offsetWidth}px`;

    // mountQuiz geometry and seeded flights (seed 148, as the reference)
    const SW = stage.offsetWidth;
    let SH = stage.offsetHeight;
    let qw = Math.min(136, (SH * 0.78) / 1.2, SW * 0.44);
    if (refined) {
      // a prominent stack sized to the room it has (the panel's space included); the stage keeps only
      // the stack plus its fan and tilt margin, so the message sits right under it
      qw = Math.min(176, SW * 0.5, (SH * 0.78) / 1.2);
      SH = Math.min(SH, qw * 1.2 + 84);
      stage.style.flex = "none";
      stage.style.height = `${SH}px`;
    }
    stage.style.setProperty("--qw", `${qw}px`);
    const R = rng(148);
    const C = cards.map((_, i) => {
      const side = i % 2 ? 1 : -1;
      return {
        sx: side * (SW * 0.5 + qw),
        sy: -SH * 0.35 + R() * SH * 0.5,
        r0: side * (26 + R() * 30),
        x: (R() - 0.5) * 14,
        y: -i * 1.6,
        r: i === N - 1 ? -2 : (R() - 0.5) * 12,
        s: 0.55 + i * 0.16,
      };
    });
    const FAN: [number, number, number][] = [
      [-24, -16, 0.8],
      [-8, -6, 0.6],
      [14, 7, 0.32],
    ];
    const LAND = C[N - 1].s + 0.3; // = LAND_AT

    // FX.sparks(LAND, number centre, 7, max(50, w·.5), seed 51) on a canvas over the slide (DPR ≤ 1.5)
    const er = el.getBoundingClientRect();
    const vr = hn.querySelector<HTMLElement>(".qr-v")!.getBoundingClientRect();
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    canvas.width = Math.round(er.width * dpr);
    canvas.height = Math.round(er.height * dpr);
    const cx = canvas.getContext("2d");
    const star = new Path2D(STAR);
    const sr = rng(51);
    const sp = { x: vr.left - er.left + vr.width / 2, y: vr.top - er.top + vr.height / 2 };
    const dist = Math.max(50, vr.width * 0.5);
    const sparks = Array.from({ length: 7 }, (_, i) => ({ a: (i / 7) * Math.PI * 2 + sr() * 0.4, d: dist * (0.7 + sr() * 0.5), c: i % 3 ? "#FFC93C" : "#FFFFFF" }));
    let drawn = false;
    const paintSparks = (t: number) => {
      if (!cx) return;
      const age = t - LAND;
      const on = age >= 0 && age <= 0.8;
      if (!on && !drawn) return;
      cx.setTransform(1, 0, 0, 1, 0, 0);
      cx.clearRect(0, 0, canvas.width, canvas.height);
      drawn = on;
      if (!on) return;
      const u = age / 0.8;
      for (const p of sparks) {
        const d = p.d * (u < 0.55 ? eo(u / 0.55) : 1 + (0.15 * (u - 0.55)) / 0.45);
        const s = u < 0.55 ? lerp(0.2, 1.1, u / 0.55) : lerp(1.1, 0.3, (u - 0.55) / 0.45);
        const rot = u * 2.8;
        const co = Math.cos(rot) * s * dpr;
        const si = Math.sin(rot) * s * dpr;
        cx.globalAlpha = clamp(u < 0.55 ? 1 : 1 - (u - 0.55) / 0.45);
        cx.setTransform(co, si, -si, co, (sp.x + Math.cos(p.a) * d) * dpr, (sp.y + Math.sin(p.a) * d) * dpr);
        cx.translate(-8, -8);
        cx.scale(0.667, 0.667);
        cx.fillStyle = p.c;
        cx.fill(star);
      }
      cx.globalAlpha = 1;
    };

    const th = panel?.querySelector<HTMLElement>(".qr-panel-in")?.offsetHeight ?? 0;
    const panelIn = panel?.querySelector<HTMLElement>(".qr-panel-in");
    let lastNum = "";
    // mountQuiz().seek(t), landFx and the panel part of badgeRig: a pure function of the clock
    const paint = (t: number) => {
      let landed = 0;
      C.forEach((c, i) => {
        const u = t - c.s;
        const p = spr(u, 0.6, 11);
        const q = spr(u, 0.45, 11);
        let x = lerp(c.sx, c.x, p);
        const y = lerp(c.sy, c.y, p);
        let rot = lerp(c.r0, c.r, q);
        const fi = i - (N - 3);
        if (fi >= 0) {
          const fz = spr(t - (LAND + 0.25 + fi * 0.06), FAN[fi][2], 9);
          x += FAN[fi][0] * fz;
          rot += (FAN[fi][1] - c.r) * fz;
        }
        cards[i].style.transform = tf(x, y, lerp(0.85, 1, clamp(p)), rot);
        cards[i].style.opacity = String(r3(clamp(u / 0.08)));
        landed += clamp((u - 0.12) / 0.16);
      });
      const s = bn(Math.round((slide.count * landed) / N));
      if (s !== lastNum) tEl.textContent = lastNum = s;
      const a = t - LAND;
      hn.style.transform = `scale(${r3(a < 0 ? 1 : kf([[0, 1], [0.23, 1.16], [0.47, 0.97], [0.76, 1]], a))})`;
      if (gold) gold.style.opacity = String(r3(a < 0 ? 0 : kf([[0, 0], [0.2, 1], [0.66, 1], [1.2, 0]], a)));
      flare.style.transform = `scale(${r3(a < 0 ? 0.3 : lerp(0.3, 1.8, eo(a)))})`;
      // the refined layouts: a subtle glow (peak 0.5) behind the yellow numeral, no gold flash
      flare.style.opacity = String(r3((a < 0 ? 0 : kf([[0, 0], [0.22, 1], [1, 0]], a)) * (refined ? 0.5 : 1)));
      if (panel && panelIn) {
        const b = t - PANEL_AT;
        panel.style.transform = tf(0, 26 * (1 - spr(b, 0.6, 12)), null, 0);
        panel.style.opacity = String(r3(clamp(b / 0.25)));
        panelIn.style.transform = tf(0, th * 1.15 * (1 - spr(b - 0.4, 0.55, 13)), null, 0);
      }
      paintSparks(t);
    };

    const ups = [...el.querySelectorAll<HTMLElement>(".qr-up")];
    const msg = el.querySelector<HTMLElement>(".qr-msg");
    if (still) {
      paint(END);
      paintSparks(-1);
      ups.forEach((u) => gsap.set(u, { opacity: 1, y: 0, scale: 1 }));
      if (msg) gsap.set(msg, { opacity: 1 });
      return;
    }
    const clock = { t: 0 };
    const tl = gsap.timeline();
    // the reference's .up: 900 ms on its --pop curve, the line 100 ms after the kick
    ups.forEach((u) =>
      tl.fromTo(u, { opacity: 0, y: 22, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: gsapEase("refPop") }, Number(u.dataset.d || 0)),
    );
    tl.to(clock, { t: END, duration: END, ease: "none", onUpdate: () => paint(clock.t) }, 0);
    // refined layouts: the nudge follows the landing as a caption (Reference Motion: soft fade, 0.7 s)
    if (msg && msg.classList.contains("qr-msg-text")) tl.fromTo(msg, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: gsapEase("refSoft") }, LAND + 0.5);
    paint(0);
    return () => {
      tl.kill();
    };
  }, [still, slide.count, layout]);

  if (refined) return <QuizActivitiesRefined slide={slide} layout={layout} rootRef={root} />;

  return (
    <div ref={root} className="slide qr" style={numSize(slide.count)}>
      <div className="qr-wrap">
        <p className="qr-sr">{COPY.quiz.heroLine(slide.count)}</p>
        <h1 className="qr-kick qr-up" data-d="0">
          {COPY.quiz.headline}
        </h1>
        <div className="qr-head" aria-hidden="true">
          <div className="qr-lead qr-up" data-d="0">
            এই বছর
          </div>
          <div className="qr-nw">
            <div className="qr-hn">
              <i className="qr-fl" />
              <span className="qr-v">
                <span className="qr-t">{bn(slide.count)}</span>
                <span className="qr-g">{bn(slide.count)}</span>
              </span>
              <span className="qr-u">টি কুইজ</span>
            </div>
          </div>
          <div className="qr-line qr-up" data-d="0.1">
            শেষ করেছ
          </div>
        </div>
        <div className="qr-stage" aria-hidden="true">
          {Array.from({ length: N }, (_, i) => {
            const sj = SUBJECTS[CARD_SUBJECTS[i % 4]];
            const ok = (i * 7 + 1) % 4;
            return (
              <div key={i} className="qr-card">
                <div className="qr-sj">
                  <i style={{ background: sj.color }} />
                  {sj.name}
                </div>
                <div className="qr-q" />
                <div className="qr-q qr-q-s" />
                {[0, 1, 2, 3].map((q) => (
                  <span key={q} className={`qr-o${q === ok ? " qr-ok" : ""}`}>
                    <i />
                    <b style={{ width: `${50 + ((i + q * 3) % 4) * 12}%` }} />
                  </span>
                ))}
              </div>
            );
          })}
        </div>
        {hasPanel ? (
          <div className="qr-panel">
            <div className="qr-panel-in">
              {slide.nudge ? <p className="qr-nudge">{COPY.quiz.nudge(slide.nudge.gap, slide.nudge.milestone)}</p> : slide.badge ? <BadgePill id={slide.badge} landAt={PANEL_AT + 0.15} /> : null}
            </div>
          </div>
        ) : null}
      </div>
      <canvas className="qr-fx" aria-hidden="true" />
    </div>
  );
}

/** A and B: the refined compositions (same cards, painter and clock as the reference layout). */
function QuizActivitiesRefined({
  slide,
  layout,
  rootRef,
}: {
  slide: ScreenProps<"quiz">["slide"];
  layout: Exclude<QuizActivitiesLayout, "c3">;
  rootRef: React.RefObject<HTMLDivElement | null>;
}) {
  // PRD headline unchanged, broken before its last two words (as the Answer Parade): "কুইজে কেমন কাটল / তোমার বছর?"
  const words = COPY.quiz.headline.split(" ");
  const head = [words.slice(0, -2).join(" "), words.slice(-2).join(" ")];
  const number = (
    <div className="qr-hn">
      <i className="qr-fl" />
      <span className="qr-v">
        <span className="qr-t">{bn(slide.count)}</span>
      </span>
    </div>
  );
  return (
    <div ref={rootRef} className={`slide qr qr-refined qr-${layout}`} style={heroSize(slide.count)}>
      <div className="qr-wrap">
        <p className="qr-sr">
          {COPY.quiz.headline} {COPY.quiz.heroLine(slide.count)}
        </p>
        <h1 className="qr-title qr-up" data-d="0" aria-hidden="true">
          {head[0]}
          <br />
          {head[1]}
        </h1>
        {/* one statement: এই বছর / [X] / টি কুইজ শেষ করেছ — the ending arrives as the number lands */}
        <div className="qr-statement" aria-hidden="true">
          <div className="qr-lead qr-up" data-d="0.1">
            এই বছর
          </div>
          {layout === "centered" ? (
            <>
              {number}
              <div className="qr-tail qr-up" data-d={String(LAND_AT + 0.05)}>
                টি কুইজ শেষ করেছ
              </div>
            </>
          ) : (
            <div className="qr-figure">
              {number}
              <div className="qr-tail qr-up" data-d={String(LAND_AT + 0.05)}>
                <span>টি কুইজ</span>
                <span>শেষ করেছ</span>
              </div>
            </div>
          )}
        </div>
        <div className="qr-stage" aria-hidden="true">
          {Array.from({ length: N }, (_, i) => {
            const sj = SUBJECTS[CARD_SUBJECTS[i % 4]];
            const ok = (i * 7 + 1) % 4;
            return (
              <div key={i} className="qr-card">
                <div className="qr-sj">
                  <i style={{ background: sj.color }} />
                  {sj.name}
                </div>
                <div className="qr-q" />
                <div className="qr-q qr-q-s" />
                {[0, 1, 2, 3].map((q) => (
                  <span key={q} className={`qr-o${q === ok ? " qr-ok" : ""}`}>
                    <i />
                    <b style={{ width: `${50 + ((i + q * 3) % 4) * 12}%` }} />
                  </span>
                ))}
              </div>
            );
          })}
        </div>
        {slide.nudge ? (
          <p className="qr-msg qr-msg-text">{COPY.quiz.nudge(slide.nudge.gap, slide.nudge.milestone)}</p>
        ) : slide.badge ? (
          <div className="qr-msg qr-msg-badge">
            <BadgePill id={slide.badge} landAt={LAND_AT + 0.5} />
          </div>
        ) : null}
      </div>
      <canvas className="qr-fx" aria-hidden="true" />
    </div>
  );
}
