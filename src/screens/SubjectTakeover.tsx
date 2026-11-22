import { useEffect, useRef, type CSSProperties } from "react";
import { useAnimate, usePresence } from "motion/react";
import { COPY, SUBJECTS } from "../data/copy";
import { usePrefs } from "../lib/prefs";
import { TAKEOVER, useEntry } from "../story/entry";
import { SUBJECT_VISUAL } from "./subjectArt";
import type { ScreenProps } from "./types";
import "../styles/subject.css";

type Seg = [Element, Record<string, unknown>, { at: number; duration: number; ease?: unknown }];

/** The prototype's curves: smoothstep in, a long settle out. */
const SMOOTH = [0.45, 0, 0.55, 1] as const;
const OUT = [0.22, 1, 0.36, 1] as const;
/** Reel name tints (from the prototype's field), cycled. */
const TINTS = ["#b6c6ff", "#76deea", "#ffd8f7", "#d5deff", "#c6d2ff"];
/** Reel layout: names before the student's subject, after it. */
const LEAD = 7;
const TRAIL = 2;

/**
 * 07 Subject of the year — "Subject Takes Over" (prototype, Nov 22).
 * Copy (PRD Screen 7, exact): headline "তোমার বছরের বিষয়"; reveal [বিষয়ের নাম];
 * support "এই বিষয়েই তুমি সবচেয়ে বেশি সময় দিয়েছ এই বছর।". The subject is the
 * most-ACTIVE one (time), from compose.ts — which omits the slide when there is
 * no subject data or the top two are effectively tied. No ranking language.
 *
 * Many subjects → one takes focus → its visual world takes over:
 *   reel    the Subject Reel: the student's OWN other subjects (cycled, never
 *           padded with others) scroll up through one focus slot — the final
 *           name's first line — along a gently curved, swivelling path, then
 *           decelerate onto their subject; the others fade; its last part turns
 *           yellow and slides under the first; the final name takes over in
 *           place (it is the same text, continued)
 *   reveal  the headline above, the yellow underbar below
 *   world   the subject's illustration (SUBJECT_VISUAL; Physics = the atom)
 *   settle  the supporting line. Then still.
 * From Screen 06, 06's yellow watchline slides into place as the underbar.
 * One Motion sequence. Reduced motion / repeat view: the final frame.
 */
export function SubjectTakeover({ slide }: ScreenProps<"subject">) {
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const fromVideo = useEntry().kind === "takeover";
  const shift = fromVideo ? 0 : -0.1;
  const at = (t: number) => Math.max(0, t + shift);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const [isPresent, safeToRemove] = usePresence();
  const ctl = useRef<{ stop: () => void } | null>(null);

  const subject = SUBJECTS[slide.subject];
  const visual = SUBJECT_VISUAL[slide.subject];
  // The reel: the student's OWN other subjects, cycled, then their subject.
  const others = slide.others;
  const hasReel = others.length > 0;
  const reel = hasReel
    ? [
        ...Array.from({ length: LEAD }, (_, k) => others[(LEAD - 1 - k) % others.length]),
        null, // the student's subject
        ...Array.from({ length: TRAIL }, (_, k) => others[k % others.length]),
      ]
    : [];
  const sel = LEAD;
  const headLines = visual.lines.slice(0, -1);
  const lastLine = visual.lines[visual.lines.length - 1];
  const joiner = visual.lines.join("") === subject.name ? "" : " ";

  useEffect(() => {
    if (still) return;
    const root = scope.current;
    if (!root) return;
    const q = (s: string) => root.querySelector(s);
    const T = TAKEOVER;
    const segs: Seg[] = [];
    const add = (el: Element | null, kf: Record<string, unknown>, t: number, d: number, ease: unknown = SMOOTH) => {
      if (el) segs.push([el, kf, { at: t, duration: d, ease }]);
    };
    const u = root.clientWidth / 390; // prototype px → frame px

    // ── from 06: its watchline becomes the underbar ──
    const bar = q(".sb-bar") as HTMLElement | null;
    const line = fromVideo ? root.closest(".story")?.querySelector<HTMLElement>(".slide.vw .vw-line") : null;
    if (line && bar) {
      const lr = line.getBoundingClientRect();
      const br = bar.getBoundingClientRect();
      const fill = line.querySelector(".vw-line-fill");
      const fillW = fill ? fill.getBoundingClientRect().width : lr.width;
      add(line.querySelector(".vw-line-track"), { opacity: [1, 0] }, 0, 0.16, "linear");
      add(line.querySelector(".vw-line-knob"), { opacity: [1, 0], scale: [1, 0.4] }, 0, 0.16, "linear");
      add(
        line,
        {
          x: [0, br.left - lr.left],
          y: [0, br.top + br.height / 2 - (lr.top + lr.height / 2)],
          scaleX: [1, br.width / fillW],
          scaleY: [1, br.height / lr.height],
          transformOrigin: ["0% 50%", "0% 50%"],
        },
        T.bar.at,
        T.bar.dur,
        [0.55, 0, 0.25, 1],
      );
      add(bar, { opacity: [0, 1] }, T.bar.at + T.bar.dur - 0.04, 0.04, "linear");
      add(line, { opacity: [1, 0] }, T.bar.at + T.bar.dur, 0.04, "linear");
    } else if (bar) {
      add(bar, { opacity: [0, 1], scaleX: [0, 1] }, at(T.name.at), T.name.dur, OUT);
    }

    // ── the Subject Reel ──
    const stops: { stop: () => void }[] = [];
    const reelEl = q(".sb-reel") as HTMLElement | null;
    const nameEl = q(".sb-name") as HTMLElement | null;
    const items = [...root.querySelectorAll<HTMLElement>(".sb-ri")];
    const R = T.reel;
    if (reelEl && nameEl && items.length) {
      // The focus slot is the final name's first line.
      reelEl.style.left = `${nameEl.offsetLeft + (nameEl.offsetParent as HTMLElement).offsetLeft}px`;
      reelEl.style.top = `${nameEl.offsetTop + (nameEl.offsetParent as HTMLElement).offsetTop}px`;
      const lineH = items[0].offsetHeight;
      const P = lineH * 1.08; // pitch
      const place = (pos: number) =>
        items.forEach((el, i) => {
          const d = i - pos;
          const ad = Math.min(Math.abs(d), 3);
          el.style.transform = `translate3d(${(22 * u * d * d).toFixed(2)}px, ${(d * P).toFixed(2)}px, 0) perspective(700px) rotateX(${(-15 * d).toFixed(2)}deg) scale(${(1 - 0.1 * ad).toFixed(4)})`;
          el.style.opacity = String(Math.max(0, 1 - 0.42 * Math.abs(d)));
        });
      // Measure the hand-over first: where the subject's last part sits in the
      // reel at rest vs in the final name.
      place(sel);
      const b0 = items[sel].querySelector(".sb-ri-b")?.getBoundingClientRect();
      const nameSpans = nameEl.querySelectorAll("span");
      const b1 = nameSpans[nameSpans.length - 1]?.getBoundingClientRect();
      const p0 = sel - R.travel;
      place(p0);
      // Cruise at constant speed, then decelerate (velocity-continuous) onto the subject.
      const v = R.travel / (R.cruise + R.settle / 2);
      const total = R.cruise + R.settle;
      const pos = (t: number) => {
        const tc = t * total;
        if (tc <= R.cruise) return p0 + v * tc;
        const k = (tc - R.cruise) / R.settle;
        return p0 + v * R.cruise + ((v * R.settle) / 2) * (1 - (1 - k) * (1 - k));
      };
      stops.push(
        (animate as unknown as (a: number, b: number, o: object) => { stop: () => void })(0, 1, {
          duration: total,
          delay: at(R.at),
          ease: "linear",
          onUpdate: (t: number) => place(pos(t)),
        }),
      );
      add(reelEl, { opacity: [0, 1] }, at(R.at), 0.25, "linear");
      // The others fade away; the subject's accent turns yellow …
      items.forEach((el, i) => {
        if (i !== sel) add(el.firstElementChild, { opacity: [1, 0] }, at(T.othersOut.at), T.othersOut.dur, "linear");
      });
      add(items[sel].querySelector(".sb-ri-b"), { color: ["#ffffff", "#f9c531"] }, at(T.accent.at), T.accent.dur, "linear");
      // … and settles into its final form: the last part slides under the first,
      // exactly onto the final name, which then takes over in place.
      if (b0 && b1)
        add(
          items[sel].querySelector(".sb-ri-b"),
          { x: [0, b1.left - b0.left], y: [0, b1.top - b0.top] },
          at(T.morph.at),
          T.morph.dur,
          [0.55, 0, 0.25, 1],
        );
      add(nameEl, { opacity: [0, 1] }, at(T.morph.at + T.morph.dur), 0.001, "linear");
      add(reelEl, { opacity: [1, 0] }, at(T.morph.at + T.morph.dur), 0.001, "linear");
    } else {
      add(nameEl, { opacity: [0, 1], y: [30, 0], scale: [0.92, 1] }, at(T.name.at), T.name.dur, OUT);
    }

    // ── the reveal and the subject's world ──
    add(q(".sb-head"), { opacity: [0, 1], y: [21, 0] }, at(T.head.at), T.head.dur, OUT);
    add(q(".sb-art"), { opacity: [0, 1], y: [88 * u, 0], scale: [0.72, 1], rotate: [-13, 0] }, at(T.art.at), T.art.dur, OUT);
    add(q(".sb-support"), { opacity: [0, 1], y: [17, 0] }, at(T.support.at), T.support.dur, OUT);

    const c = (animate as unknown as (s: unknown) => { stop: () => void })(segs);
    const all = { stop: () => [c, ...stops].forEach((x) => x.stop()) };
    ctl.current = all;
    return () => all.stop();
    // entry is fixed for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, animate, scope]);

  // Leaving: stop the entrance; removal is immediate. If the slide is brought
  // back before it is removed (rapid back/forward taps), the stopped entrance
  // would leave it half-drawn — snap to the final frame instead.
  const wasLeaving = useRef(false);
  useEffect(() => {
    if (isPresent) {
      if (wasLeaving.current && scope.current) {
        wasLeaving.current = false;
        const done = { duration: 0 };
        animate(".sb-head, .sb-name, .sb-bar, .sb-art, .sb-support", { opacity: 1, x: 0, y: 0, scale: 1, scaleX: 1, rotate: 0 }, done);
        animate(".sb-reel", { opacity: 0 }, done);
      }
      return;
    }
    wasLeaving.current = true;
    ctl.current?.stop();
    safeToRemove?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  const { Art } = visual;
  return (
    <div
      ref={scope}
      className={`slide sb ${still ? "" : "is-pre"}`}
      style={{ "--sb-color": subject.color } as CSSProperties}
    >
      <p className="sb-sr">
        {COPY.subject.prdHeadline}: {subject.name}। {COPY.subject.prdSupport}
      </p>

      {/* The Subject Reel (entrance only): the student's other subjects scroll
          through the focus slot and settle on their own subject. */}
      {!still && hasReel && (
        <div className="sb-reel" aria-hidden="true">
          {reel.map((id, i) => (
            <div key={i} className="sb-ri" style={{ color: id ? TINTS[i % TINTS.length] : "#fff" }}>
              <div className="sb-ri-in">
                {id ? (
                  SUBJECTS[id].name
                ) : (
                  <>
                    {headLines.length > 0 && <span className="sb-ri-a">{headLines.join(joiner)}{joiner}</span>}
                    <span className="sb-ri-b">{lastLine}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="sb-art" aria-hidden="true">
        <Art color={subject.color} />
      </div>

      <div className="sb-copy" aria-hidden="true">
        <p className="sb-head">{COPY.subject.prdHeadline}</p>
        <h1 className={`sb-name ${visual.lines.length > 1 ? "" : "sb-name-one"}`}>
          {visual.lines.map((l, i) => (
            <span key={i} className={i === visual.lines.length - 1 ? "sb-accent" : ""}>
              {l}
            </span>
          ))}
        </h1>
        <i className="sb-bar" />
      </div>
      <p className="sb-support" aria-hidden="true">
        {COPY.subject.prdSupport}
      </p>
    </div>
  );
}
