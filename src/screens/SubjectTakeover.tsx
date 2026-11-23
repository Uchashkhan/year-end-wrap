import { Fragment, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useAnimate, usePresence } from "motion/react";
import gsap from "gsap";
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
/** Deck lanes (reference: five). Names per lane, so each lane overfills the screen at every moment. */
const LANES = 5;
const LANE_NAMES = 12;
/** The selected lane: names before the student's subject (enough to cover the left edge at the stop). */
const SEL_BEFORE = 2;
const smooth = (x: number) => {
  x = Math.max(0, Math.min(1, x));
  return x * x * (3 - 2 * x);
};
const easeOut = (x: number) => 1 - (1 - Math.max(0, Math.min(1, x))) ** 3;
const easeInOut = (x: number) => {
  x = Math.max(0, Math.min(1, x));
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};
/** Lane text colour (reference) → Shikho yellow. */
const LANE_INK = [244, 237, 255];
const YELLOW = [249, 197, 49];

/**
 * 07 Subject of the year — "Subject Takes Over" (prototype, Nov 22).
 * Copy (PRD Screen 7, exact): headline "তোমার বছরের বিষয়"; reveal [বিষয়ের নাম];
 * support "এই বিষয়েই তুমি সবচেয়ে বেশি সময় দিয়েছ এই বছর।". The subject is the
 * most-ACTIVE one (time), from compose.ts — which omits the slide when there is
 * no subject data or the top two are effectively tied. No ranking language.
 *
 * Many subjects shuffle → the lanes slow → the student's subject stops in
 * view → the other lanes clear → that subject moves into the title → its world:
 *   deck    the "Subject Shuffle Deck" (shikho_subject_shuffle_comparison.html):
 *           five wide, tilted, alternating lanes of the student's OWN subjects
 *           (never invented) drifting left/right on a cubic ease-out; each lane
 *           stops at a slightly offset time while they straighten and contract.
 *           The middle lane's stop is computed so the student's subject comes
 *           to rest exactly at the title's left edge — not a random stop.
 *   select the other lanes (and the rest of the middle lane) clear; the word
 *           stays. The real title (.sb-title) is placed over it at the same
 *           position and size and the word hides in the same frame (same text,
 *           weight, spacing and colour — no visible swap), then the title moves
 *           into its headline position, turning Shikho yellow only now; its
 *           underbar draws left → right once it has arrived
 *   world   the headline, the subject's Shikho icon, the support line
 * From Screen 06, 06's watchline leaves with 06's text.
 * Timings: TAKEOVER in entry.ts. Reduced motion / repeat view: the final frame.
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
  // The deck: the student's OWN subjects — their subject first, then the
  // others — cycled per lane (each lane starts at a different subject). The
  // middle lane holds the slot for the student's subject (.sb-slot).
  const list = [slide.subject, ...slide.others.filter((id) => id !== slide.subject)];
  const hasReel = list.length > 1;
  const lanes = hasReel
    ? Array.from({ length: LANES }, (_, i) => {
        if (i === TAKEOVER.deck.sel) {
          const others = list.slice(1);
          const before = Array.from({ length: SEL_BEFORE }, (_, k) => others[(k + 1) % others.length]);
          const after = Array.from({ length: LANE_NAMES - SEL_BEFORE - 1 }, (_, k) => list[(k + 1) % list.length]);
          return [...before, null, ...after];
        }
        return Array.from({ length: LANE_NAMES }, (_, k) => list[(k + i * 2 + 1) % list.length]);
      })
    : [];

  // One line, always: the name's size is fitted to the available width (never
  // larger than the design size). The deck's word is scaled up to it, so it
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

    // ── the Subject Shuffle Deck ──
    const deck = q(".sb-deck") as HTMLElement | null;
    const laneEls = [...root.querySelectorAll<HTMLElement>(".sb-lane")];
    const slot = q(".sb-slot") as HTMLElement | null;
    const span = nameEl?.firstElementChild as HTMLElement | null;
    const D = T.deck;
    if (deck && laneEls.length === LANES && slot && title && nameEl && span) {
      const W = root.clientWidth;
      const inners = laneEls.map((l) => l.querySelector<HTMLElement>(".sb-lane-in")!);
      const bgs = laneEls.map((l) => l.querySelector<HTMLElement>(".sb-lane-bg")!);
      const selIn = inners[D.sel];
      const SC = 0.88; // the lanes' contracted scale (reference)
      // Reference lane drift (px at 390 wide): start, direction, travel.
      const dir = (i: number) => (i % 2 ? -1 : 1);
      const travel = (i: number) => (140 + (i + 2) * 18) * u;
      const base = (i: number) => (i % 2 ? -180 : -110) * u;
      // The middle lane's end is computed from the student's subject: its word
      // stops at the title's left edge. Lane box: 160% wide from -30%, centred.
      const copy = title.offsetParent as HTMLElement;
      const target = copy.offsetLeft + title.offsetLeft;
      const slotOff = slot.offsetLeft; // within the lane's text row
      const selEnd = 0.8 * W + (target - 0.5 * W) / SC - slotOff;
      const laneX = (i: number, t: number) => {
        const k = easeOut(t / D.stopAt[i]);
        if (i === D.sel) return selEnd - dir(i) * travel(i) * (1 - k);
        return base(i) + dir(i) * travel(i) * k;
      };
      title.style.transformOrigin = "0 0";
      let flip: { dx: number; dy: number; s: number } | null = null;
      const frame = (t: number) => {
        const fade = Math.min(1, t / D.fadeIn);
        const align = smooth((t - D.align.at) / D.align.dur);
        const out = smooth((t - D.out.at) / D.out.dur);
        const swapped = t >= T.swap;
        laneEls.forEach((lane, i) => {
          const tilt = (i % 2 ? 1 : -1) * (-2.5 + i * 0.8);
          const spread = (1 - align) * ((i - 2) * 1.1);
          lane.style.transform = `translateY(${spread.toFixed(3)}%) rotate(${(tilt * (1 - align)).toFixed(3)}deg) scale(${(1 - 0.12 * align).toFixed(4)})`;
          const o = 0.68 + i * 0.08;
          inners[i].style.transform = `translateX(${laneX(i, t).toFixed(2)}px)`;
          const blurIn = t < 0.38 ? (1 - smooth(t / 0.38)) * 1.3 : 0;
          if (i === D.sel) {
            // The lane clears around the word; the word itself stays.
            lane.style.opacity = fade.toFixed(3);
            bgs[i].style.opacity = (o * (1 - out)).toFixed(3);
            selIn.style.setProperty("--sb-rest", (o * (1 - out)).toFixed(3));
            slot.style.opacity = swapped ? "0" : String(o);
            inners[i].style.filter = blurIn > 0.01 ? `blur(${blurIn.toFixed(2)}px)` : "none";
          } else {
            lane.style.opacity = (fade * (1 - out) * o).toFixed(3);
            const blur = blurIn + smooth((t - 1.27) / 0.33) * 1.8;
            inners[i].style.filter = blur > 0.01 ? `blur(${blur.toFixed(2)}px)` : "none";
          }
        });
        if (!swapped) {
          title.style.opacity = "0";
          return;
        }
        // Selection: the title takes the word's exact place (measured once,
        // after the lane has stopped and straightened), then moves home.
        if (!flip) {
          title.style.transform = "none";
          const sr = slot.getBoundingClientRect();
          const nr = span.getBoundingClientRect();
          const tr = title.getBoundingClientRect();
          const sc = sr.width / nr.width;
          flip = {
            s: sc,
            dx: sr.left - tr.left - (nr.left - tr.left) * sc,
            dy: sr.top + sr.height / 2 - tr.top - (nr.top + nr.height / 2 - tr.top) * sc,
          };
          nameEl.style.opacity = "1";
        }
        const m = easeInOut((t - T.lift.at) / T.lift.dur);
        const sc = flip.s + (1 - flip.s) * m;
        title.style.transform = `translate3d(${(flip.dx * (1 - m)).toFixed(2)}px, ${(flip.dy * (1 - m)).toFixed(2)}px, 0) scale(${sc.toFixed(4)})`;
        const lo = 0.68 + D.sel * 0.08; // the word's lane opacity → full
        title.style.opacity = (lo + (1 - lo) * m).toFixed(3);
        const c = Math.max(0, Math.min(1, (t - T.accent.at) / T.accent.dur));
        nameEl.style.color = `rgb(${LANE_INK.map((v, k) => Math.round(v + (YELLOW[k] - v) * c)).join(",")})`;
      };
      frame(0);
      const end = T.lift.at + T.lift.dur;
      const clock = { t: 0 };
      const tw = gsap.to(clock, {
        t: end,
        duration: end,
        delay: at(0),
        ease: "none",
        onUpdate: () => frame(clock.t),
        onComplete: () => {
          Object.assign(title.style, { transform: "none", opacity: "1" });
          nameEl.style.color = "";
          deck.style.display = "none";
        },
      });
      stops.push({ stop: () => tw.kill() });
      // The underbar draws left → right once the title has arrived.
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
        animate(".sb-deck", { opacity: 0 }, done);
        const title = scope.current.querySelector<HTMLElement>(".sb-title");
        if (title) Object.assign(title.style, { transform: "none", opacity: "1" });
        const nm = scope.current.querySelector<HTMLElement>(".sb-name");
        if (nm) nm.style.color = "";
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

      {/* The Subject Shuffle Deck (entrance only): five lanes of the
          student's subjects; the middle lane's slot is their subject. */}
      {!still && hasReel && (
        <div className="sb-deck" aria-hidden="true">
          {lanes.map((names, i) => (
            <div key={i} className={`sb-lane sb-lane-${i}`} style={{ top: `${16 + i * 14.7}%` }}>
              <div className="sb-lane-bg" />
              <div className="sb-lane-in">
                {names.map((id, k) => (
                  <Fragment key={k}>
                    {k > 0 && <span className="sb-sep">✧</span>}
                    {id ? <span className="sb-word">{SUBJECTS[id].name}</span> : <span className="sb-word sb-slot">{subject.name}</span>}
                  </Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* The subject's original Shikho icon (Figma "Subject Icon" set). */}
      <div className="sb-art" aria-hidden="true">
        <img src={icon.src} alt="" width={40} height={40} draggable={false} />
      </div>

      <div className="sb-copy" aria-hidden="true">
        <p className="sb-head">{COPY.subject.prdHeadline}</p>
        {/* The title: it takes the deck word's place, then moves here; with its underbar. */}
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
