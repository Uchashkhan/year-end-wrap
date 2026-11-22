import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useAnimate, usePresence } from "motion/react";
import { COPY, SUBJECTS } from "../data/copy";
import { usePrefs } from "../lib/prefs";
import { TAKEOVER, useEntry } from "../story/entry";
import { SUBJECT_ICON } from "./subjectArt";
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
 *   scroll  0–0.95 s: the student's OWN other subjects (cycled, never padded)
 *           move up through a focus zone at the frame's vertical centre, with
 *           a shallow arc and swivel; scale and opacity fall off with distance
 *   lock    0.95–1.35 s: the reel decelerates onto their subject; the others fade
 *   lift    1.25–1.65 s: that same element (.sb-title — no swap, no copy) rises
 *           into the headline, turning Shikho yellow; its underbar draws left →
 *           right at the lock and travels with it
 *   world   1.45–1.9 s: the headline, the subject's Shikho icon, the support line
 * From Screen 06, 06's watchline leaves with 06's text (no underline mid-scroll).
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
  const icon = SUBJECT_ICON[slide.subject];
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

  // One line, always: the name's size is fitted to the available width (never
  // larger than the design size). The reel's subject uses the same size, so it
  // settles as the final name without reflowing.
  const [fit, setFit] = useState<number | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const name = scope.current?.querySelector<HTMLElement>(".sb-name");
      const text = name?.firstElementChild as HTMLElement | null;
      if (!name || !text) return;
      // Always measure at the design size (not a previously fitted one).
      name.style.fontSize = "var(--sb-base)";
      const base = parseFloat(getComputedStyle(name).fontSize);
      const avail = name.clientWidth;
      const w = text.getBoundingClientRect().width;
      name.style.fontSize = "";
      setFit(w > avail ? Math.floor(((base * avail) / w) * 0.98 * 10) / 10 : null);
    };
    measure();
    document.fonts?.ready.then(measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    // ── from 06: its watchline leaves with 06's text (no underline while scrolling) ──
    const line = fromVideo ? root.closest(".story")?.querySelector<HTMLElement>(".slide.vw .vw-line") : null;
    if (line) add(line, { opacity: [1, 0] }, T.lineOut.at, T.lineOut.dur, "linear");

    const title = q(".sb-title") as HTMLElement | null;
    const nameEl = q(".sb-name") as HTMLElement | null;
    const bar = q(".sb-bar") as HTMLElement | null;
    const stops: { stop: () => void }[] = [];

    // ── the Subject Reel ──
    // One persistent element: the final title (.sb-title — the name with its
    // underbar) IS the reel's selected slot. It scrolls with the other names
    // through a focus zone at the frame's vertical centre, decelerates, locks,
    // and lifts into its headline position. Nothing is swapped or duplicated.
    const reelEl = q(".sb-reel") as HTMLElement | null;
    const items = [...root.querySelectorAll<HTMLElement>(".sb-ri")];
    const R = T.reel;
    if (reelEl && title && nameEl && items.length) {
      const copy = title.offsetParent as HTMLElement;
      const left = copy.offsetLeft + title.offsetLeft;
      const titleTop = copy.offsetTop + title.offsetTop;
      const lineH = nameEl.offsetHeight;
      // Focus zone: the line's centre at the frame's vertical centre.
      const focusTop = Math.round(root.clientHeight * 0.48 - lineH / 2);
      reelEl.style.left = `${left}px`;
      reelEl.style.top = `${focusTop}px`;
      const liftY = focusTop - titleTop; // focus zone → final place
      const P = lineH * 1.02; // pitch
      // Distance from the focus zone → pose. Controlled: a shallow arc (≤ 10px
      // at two lines out), a gentle swivel, scale and opacity falling off so
      // about three or four names read at once.
      const pose = (d: number) => {
        const ad = Math.abs(d);
        const c = Math.min(ad, 2.5);
        return {
          x: 2.5 * u * c * c,
          y: d * P,
          rx: -13 * Math.max(-2.5, Math.min(2.5, d)),
          s: 1 - 0.13 * Math.min(ad, 2.5),
          o: Math.max(0, 1 - 0.42 * ad - 0.04 * ad * ad),
        };
      };
      const tf = (x: number, y: number, rx: number, s: number) =>
        `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) perspective(700px) rotateX(${rx.toFixed(2)}deg) scale(${s.toFixed(4)})`;

      const p0 = sel - R.travel;
      // Cruise at constant speed, then decelerate (velocity-continuous) and lock.
      const v = R.travel / (R.cruise + R.settle / 2);
      const pos = (tc: number) => {
        if (tc <= 0) return p0;
        if (tc <= R.cruise) return p0 + v * tc;
        const k = Math.min(1, (tc - R.cruise) / R.settle);
        return p0 + v * R.cruise + ((v * R.settle) / 2) * (1 - (1 - k) * (1 - k));
      };
      // The lift (focus zone → headline): smooth in-out, overlapping the lock.
      const L = T.lift;
      const liftK = (tc: number) => {
        const k = Math.min(1, Math.max(0, (tc - L.at) / L.dur));
        return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      };
      const frame = (tc: number) => {
        const p = pos(tc);
        items.forEach((el) => {
          const f = pose(Number(el.dataset.i) - p);
          el.style.transform = tf(f.x, f.y, f.rx, f.s);
          el.style.opacity = f.o.toFixed(3);
        });
        const f = pose(sel - p);
        const m = liftK(tc);
        title.style.transform = tf(f.x, liftY * (1 - m) + f.y, f.rx, f.s);
        title.style.opacity = f.o.toFixed(3);
        nameEl.style.opacity = "1";
      };
      frame(0);
      const end = Math.max(R.cruise + R.settle, L.at + L.dur);
      const startAt = at(R.at);
      stops.push(
        (animate as unknown as (a: number, b: number, o: object) => { stop: () => void })(0, end, {
          duration: end,
          delay: startAt,
          ease: "linear",
          onUpdate: (tc: number) => frame(tc),
          onComplete: () => {
            title.style.transform = "none";
            title.style.opacity = "1";
          },
        }),
      );
      reelEl.style.opacity = "1";
      // The others fade away as the subject locks; it turns Shikho yellow as it lifts.
      add(reelEl, { opacity: [1, 0] }, at(T.othersOut.at), T.othersOut.dur, "linear");
      add(nameEl, { color: ["#ffffff", "#f9c531"] }, at(T.accent.at), T.accent.dur, "linear");
      add(bar, { opacity: [0, 1], scaleX: [0, 1] }, at(T.bar.at), T.bar.dur, OUT);
    } else {
      add(nameEl, { opacity: [0, 1], y: [30, 0], scale: [0.92, 1] }, at(T.name.at), T.name.dur, OUT);
      add(bar, { opacity: [0, 1], scaleX: [0, 1] }, at(T.name.at + 0.2), T.bar.dur, OUT);
    }

    // ── the reveal and the subject's world ──
    add(q(".sb-head"), { opacity: [0, 1], y: [14, 0] }, at(T.head.at), T.head.dur, OUT);
    // The subject's own Shikho icon comes in beneath it (a calm rise; no spin).
    add(q(".sb-art"), { opacity: [0, 1], y: [28 * u, 0], scale: [0.88, 1] }, at(T.art.at), T.art.dur, OUT);
    add(q(".sb-support"), { opacity: [0, 1], y: [14, 0] }, at(T.support.at), T.support.dur, OUT);

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
        animate(".sb-name", { color: "#f9c531" }, done);
        animate(".sb-reel", { opacity: 0 }, done);
        const title = scope.current.querySelector<HTMLElement>(".sb-title");
        if (title) Object.assign(title.style, { transform: "none", opacity: "1" });
      }
      return;
    }
    wasLeaving.current = true;
    ctl.current?.stop();
    safeToRemove?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  return (
    <div
      ref={scope}
      className={`slide sb ${still ? "" : "is-pre"}`}
      style={{ "--sb-color": subject.color, ...(fit ? { "--sb-fs": `${fit}px` } : {}) } as CSSProperties}
    >
      <p className="sb-sr">
        {COPY.subject.prdHeadline}: {subject.name}। {COPY.subject.prdSupport}
      </p>

      {/* The Subject Reel (entrance only): the student's other subjects scroll
          through the focus slot and settle on their own subject. */}
      {!still && hasReel && (
        <div className="sb-reel" aria-hidden="true">
          {reel.map((id, i) =>
            id ? (
              <div key={i} className="sb-ri" data-i={i} style={{ color: TINTS[i % TINTS.length] }}>
                {SUBJECTS[id].name}
              </div>
            ) : null,
          )}
        </div>
      )}

      {/* The subject's original Shikho icon (Figma "Subject Icon" set). */}
      <div className="sb-art" aria-hidden="true">
        <img src={icon.src} alt="" width={40} height={40} draggable={false} />
      </div>

      <div className="sb-copy" aria-hidden="true">
        <p className="sb-head">{COPY.subject.prdHeadline}</p>
        {/* The title: the reel's selected subject itself, with its underbar. */}
        <div className="sb-title">
          <h1 className="sb-name">
            <span>{subject.name}</span>
          </h1>
          <i className="sb-bar" />
        </div>
      </div>
      <p className="sb-support" aria-hidden="true">
        {COPY.subject.prdSupport}
      </p>
    </div>
  );
}
