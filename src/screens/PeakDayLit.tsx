import { calendarMonth } from "../lib/calendar";
import { useEffect, useRef, type CSSProperties } from "react";
import { usePresence } from "motion/react";
import { COPY } from "../data/copy";
import { MONTHS, bn } from "../lib/bangla";
import { usePrefs } from "../lib/prefs";
import { DAYLINE, useEntry } from "../story/entry";
import type { ScreenProps } from "./types";
import "../styles/peak-day.css";
import { devRegister, observeOnly } from "../motion/timeline";

const smooth = (x: number) => {
  x = Math.max(0, Math.min(1, x));
  return x * x * (3 - 2 * x);
};
const easeInOut = (x: number) => {
  x = Math.max(0, Math.min(1, x));
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};
const easeOut = (x: number) => 1 - (1 - Math.max(0, Math.min(1, x))) ** 3;
const mix = (a: number[], b: number[], k: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(",")})`;

/** Colours (reference): chip ink, cell ink on yellow, white. */
const CHIP_INK = [228, 221, 255];
const CELL_DARK = [34, 32, 102];
const WHITE = [255, 255, 255];

/** Longest clock step (s): a long frame slows the entrance for a moment instead of skipping ahead. */
const MAX_STEP = 1 / 40;
/** The month chips: two years' worth, so a pass of DAYLINE.months.pass never runs out. */
const CHIP_COUNT = 24;

/**
 * 08 Most-active day — "The Day That Lit Up" (shikho_most_active_day.html).
 * Copy (PRD Screen 8, exact): headline "তোমার বছরের সেরা দিন"; [তারিখ];
 * support "এই দিনেই তুমি সবচেয়ে বেশি সময় কাটিয়েছ শিখোতে।"; optional
 * "সেদিন [X] ঘণ্টা শিখেছ।" only when that day's time is known (≥ 1 h).
 * The date is the single day of most time (compose.ts omits the slide when
 * there is no clear peak). The calendar is built from the real month and year.
 *
 * Many months → one month → one date → the date is the hero. One entrance:
 *   months  the year's months ride a rail (from 07: its underbar, stretched);
 *           a steady pass, then a velocity-continuous settle on the month
 *   header  the other months fade back; the month's card fades; its NAME stays
 *           and glides into the calendar's header (one name throughout: the
 *           header takes the chip label's exact place, measured, same frame)
 *   cal     the calendar opens downward beneath its header (one clip edge
 *           sweeps the card and its dates; no rise, tilt or scale)
 *   day     the date lights up in its own cell, where it stays
 *   reveal  the large date — day, then month — rises in its masks; the
 *           underline draws; the support line and the time pill come in
 * One clock (rAF, step-capped)
 * drives the whole entrance (one clock; killed on leave). Reduced motion /
 * repeat view: the final frame.
 */
export function PeakDayLit({ slide }: ScreenProps<"peakDay">) {
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const fromSubject = useEntry().kind === "dayline";
  const scope = useRef<HTMLDivElement>(null);
  const [isPresent, safeToRemove] = usePresence();
  const ctl = useRef<{ stop: () => void; finish: () => void } | null>(null);

  const { year: y, month: m, day: d, cells } = calendarMonth(slide.date);
  const monthName = MONTHS[m - 1];
  const rows = Math.ceil(cells.length / 7);
  const selChip = m - 1 + 12; // the month, in the second year of chips

  useEffect(() => {
    const root = scope.current;
    if (!root || still) return;
    const q = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s);
    const T = DAYLINE;
    const W = root.clientWidth;
    const u = W / 390;
    const head = q(".pd-head")!;
    const dayIn = q(".pd-day-in")!;
    const monthIn = q(".pd-month-in")!;
    const bar = q(".pd-bar")!;
    const win = q(".pd-months")!;
    const track = q(".pd-track")!;
    const chips = [...root.querySelectorAll<HTMLElement>(".pd-chip")];
    const rail = q(".pd-rail")!;
    const calBg = q(".pd-cal-bg")!;
    const calShadow = q(".pd-cal-shadow")!;
    const calBody = q(".pd-cal-body")!;
    const calMonth = q(".pd-cal-month")!;
    const calYear = q(".pd-cal-year")!;
    const selFill = q(".pd-cell.is-sel .pd-fill")!;
    const selNum = q(".pd-cell.is-sel .pd-n")!;
    const support = q(".pd-support")!;
    const chip = chips[selChip];
    const chipLabel = chip.querySelector<HTMLElement>(".pd-chip-label")!;
    const chipBody = [chip.querySelector<HTMLElement>(".pd-chip-num")!];

    // ── months: centre the month's chip. Already moving, the speed eases
    // down along one smooth curve — v(t) = v0·(1 − smoothstep(t/T)) — so there
    // is no brake point and the chip lands with zero speed and zero jerk.
    const pitch = chips[1].offsetLeft - chips[0].offsetLeft;
    const chipW = chip.offsetWidth;
    const M = T.months;
    const at = (t: number) => {
      const k = Math.max(0, Math.min(1, t / M.dur));
      // ∫ (1 − 3u² + 2u³) du = k − k³ + k⁴/2, which is 1/2 at k = 1
      return selChip - M.pass + 2 * M.pass * (k - k ** 3 + k ** 4 / 2);
    };
    const trackX = (c: number) => W / 2 - (c * pitch + chipW / 2);

    // The rail under the chips (from 07: its underbar).
    rail.style.top = `${win.offsetTop + track.offsetTop + chip.offsetTop + chip.offsetHeight + 12 * u}px`;
    const fromBar = fromSubject ? root.closest(".story")?.querySelector<HTMLElement>(".slide.sb .sb-bar") : null;
    let barFrom: { dx: number; dy: number; sx: number; sy: number } | null = null;
    if (fromBar) {
      const br = fromBar.getBoundingClientRect();
      const rr = rail.getBoundingClientRect();
      barFrom = { dx: rr.left - br.left, dy: rr.top + rr.height / 2 - (br.top + br.height / 2), sx: rr.width / br.width, sy: rr.height / br.height };
      fromBar.style.transformOrigin = "0 50%";
    }

    // The month: ONE name. At the hand-over the calendar's header month takes
    // the chip label's exact place (same text; the label hides in that frame)
    // and glides into the header — a short move, ≈ 0.8× scale, no recolour.
    let monthFrom: { dx: number; dy: number; s: number } | null = null;
    calMonth.style.transformOrigin = "0 0";

    // The calendar opens downward under its header: one soft edge sweeps the
    // card and its dates (the header itself is never masked).
    const cardH = calBg.offsetHeight;
    const strip = calBody.offsetTop; // the header band
    const bodyTop = calBody.offsetTop;
    const FEATHER = 28;

    const frame = (t: number) => {
      // 07's underbar → the rail
      if (fromBar && barFrom) {
        const k = easeInOut((t - T.bar.at) / T.bar.dur);
        fromBar.style.transform = `translate(${(barFrom.dx * k).toFixed(2)}px, ${(barFrom.dy * k).toFixed(2)}px) scale(${(1 + (barFrom.sx - 1) * k).toFixed(4)}, ${(1 + (barFrom.sy - 1) * k).toFixed(4)})`;
        fromBar.style.opacity = String(1 - 0.4 * k);
        fromBar.style.visibility = t >= T.bar.at + T.bar.dur ? "hidden" : "visible";
      }
      const railIn = fromBar ? (t >= T.bar.at + T.bar.dur ? 1 : 0) : smooth((t - M.fadeIn.at) / M.fadeIn.dur);
      const others = 1 - smooth((t - M.othersOut.at) / M.othersOut.dur);
      rail.style.opacity = (0.6 * railIn * others).toFixed(3);

      // headline
      const h = easeOut((t - T.head.at) / T.head.dur);
      head.style.opacity = h.toFixed(3);
      head.style.transform = `translateY(${(12 * (1 - h)).toFixed(2)}px)`;

      // months: pass and settle; the others fade back; the month stays
      const c = at(t);
      track.style.transform = `translateX(${trackX(c).toFixed(2)}px)`;
      const own = 1 - smooth((t - M.chipOut.at) / M.chipOut.dur);
      chips.forEach((el, i) => {
        const near = Math.max(0, 1 - Math.abs((i - c) * pitch) / (1.9 * W));
        el.style.opacity = (near * (i === selChip ? 1 : others)).toFixed(3);
      });
      // the month's chip: its card and number fade back; its name moves on
      chip.style.background = `rgba(255,255,255,${(0.08 * own).toFixed(3)})`;
      chip.style.borderColor = `rgba(255,255,255,${(0.16 * own).toFixed(3)})`;
      chipBody.forEach((el) => (el.style.opacity = (0.32 * own).toFixed(3)));
      win.style.opacity = smooth((t - M.fadeIn.at) / M.fadeIn.dur).toFixed(3);

      // the month name → the calendar header (same element from here on)
      if (t >= T.month.at) {
        if (!monthFrom) {
          calMonth.style.transform = "none";
          const a = chipLabel.getBoundingClientRect();
          const b = calMonth.getBoundingClientRect();
          const s0 = a.height / b.height;
          monthFrom = { s: s0, dx: a.left - b.left, dy: a.top + a.height / 2 - (b.top + (b.height * s0) / 2) };
        }
        chipLabel.style.visibility = "hidden";
        const k = easeInOut((t - T.month.at) / T.month.dur);
        const s1 = monthFrom.s + (1 - monthFrom.s) * k;
        calMonth.style.transform = `translate(${(monthFrom.dx * (1 - k)).toFixed(2)}px, ${(monthFrom.dy * (1 - k)).toFixed(2)}px) scale(${s1.toFixed(4)})`;
        calMonth.style.color = mix(CHIP_INK, WHITE, k);
        calMonth.style.opacity = "1";
      } else {
        chipLabel.style.visibility = "visible";
        calMonth.style.opacity = "0";
      }
      const yr = smooth((t - T.year.at) / T.year.dur);
      calYear.style.opacity = yr.toFixed(3);

      // the calendar opens beneath its header
      const band = smooth((t - T.cal.at) / T.cal.band);
      const p = easeInOut((t - T.cal.at - T.cal.band * 0.5) / T.cal.dur);
      const edge = strip + FEATHER + (cardH - strip) * p; // reveal line from the card's top (fully opaque above edge − FEATHER)
      // A soft edge (FEATHER px) rather than a hard wipe; the card's shadow is
      // its own layer and only fades in as the card completes (cheap opacity).
      calBg.style.opacity = band.toFixed(3);
      const bgMask = p >= 1 ? "none" : `linear-gradient(#000 ${(edge - FEATHER).toFixed(1)}px, transparent ${edge.toFixed(1)}px)`;
      calBg.style.maskImage = bgMask;
      calBg.style.webkitMaskImage = bgMask;
      const be = edge - bodyTop; // the edge, in the dates' own box
      const bodyMask = p >= 1 ? "none" : `linear-gradient(#000 ${(be - FEATHER).toFixed(1)}px, transparent ${be.toFixed(1)}px)`;
      calBody.style.maskImage = bodyMask;
      calBody.style.webkitMaskImage = bodyMask;
      calBody.style.opacity = p > 0 ? "1" : "0";
      calShadow.style.opacity = smooth((p - 0.6) / 0.4).toFixed(3);

      // the day lights up in its cell (where it stays)
      const pk = smooth((t - T.pick.at) / T.pick.dur);
      selFill.style.opacity = pk.toFixed(3);
      selFill.style.transform = `scale(${(0.9 + 0.1 * pk).toFixed(4)})`;
      selNum.style.color = mix([245, 237, 255], CELL_DARK, pk);

      // the large date: a masked reveal (day, then month), then the underline
      const dk = easeOut((t - T.day.at) / T.day.dur);
      dayIn.style.transform = `translateY(${(150 * (1 - dk)).toFixed(2)}%)`;
      const mk = easeOut((t - T.heroMonth.at) / T.heroMonth.dur);
      monthIn.style.transform = `translateY(${(150 * (1 - mk)).toFixed(2)}%)`;
      const ul = easeOut((t - T.underline.at) / T.underline.dur);
      bar.style.transform = `scaleX(${ul.toFixed(4)})`;
      bar.style.opacity = ul > 0 ? "1" : "0";
      const sp = easeOut((t - T.support.at) / T.support.dur);
      support.style.opacity = sp.toFixed(3);
      support.style.transform = `translateY(${(12 * (1 - sp)).toFixed(2)}px)`;
    };

    const finish = () => {
      // The resting frame is CSS: clear every inline style the entrance set.
      [head, dayIn, monthIn, bar, calBg, calShadow, calBody, calMonth, calYear, support, selFill, selNum].forEach((el) => el.removeAttribute("style"));
      win.style.display = "none";
      rail.style.display = "none";
      root.classList.remove("is-pre");
    };
    frame(0);
    root.classList.remove("is-pre");
    // The clock: real time, but one step never exceeds MAX_STEP — so the long
    // first frame (mounting the slide) or a dropped frame never makes the
    // motion jump ahead; it simply continues from where it was.
    let t = 0;
    let last = 0;
    let raf = requestAnimationFrame(function tick(now) {
      if (last) t += Math.max(0, Math.min(MAX_STEP, (now - last) / 1000));
      last = now;
      if (t >= T.end) {
        frame(T.end);
        finish();
        return;
      }
      frame(t);
      raf = requestAnimationFrame(tick);
    });
    const stop = () => cancelAnimationFrame(raf);
    ctl.current = { stop, finish };
    // dev only (no-op in production): lets the Motion Inspector read this clock
    const unregister = devRegister("08 Peak day · rAF clock", observeOnly({ duration: T.end, time: () => t, finish, stop }));
    return () => {
      unregister();
      stop();
    };
    // entry is fixed for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still]);

  // Leaving: stop the entrance; removal is immediate. Revived before removal
  // (rapid back/forward taps): snap to the final frame.
  const wasLeaving = useRef(false);
  useEffect(() => {
    if (isPresent) {
      if (wasLeaving.current) {
        wasLeaving.current = false;
        ctl.current?.finish();
      }
      return;
    }
    wasLeaving.current = true;
    ctl.current?.stop();
    safeToRemove?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  return (
    <div ref={scope} className={`slide pd ${still ? "" : "is-pre"}`} style={{ "--pd-rows": rows } as CSSProperties}>
      <p className="pd-sr">
        {COPY.peakDay.prdHeadline}: {bn(d)} {monthName} {bn(y)}। {COPY.peakDay.prdSupport}
        {slide.hours ? ` ${COPY.peakDay.timeThatDay(slide.hours)}` : ""}
      </p>

      <p className="pd-head" aria-hidden="true">
        {COPY.peakDay.prdHeadline}
      </p>

      {/* The months (entrance only): two years of chips on one track. */}
      {!still && (
        <>
          <div className="pd-months" aria-hidden="true">
            <div className="pd-track">
              {Array.from({ length: CHIP_COUNT }, (_, i) => (
                <div key={i} className="pd-chip">
                  <span className="pd-chip-num">{bn(String((i % 12) + 1).padStart(2, "0"))}</span>
                  <span className="pd-chip-label">{MONTHS[i % 12]}</span>
                </div>
              ))}
            </div>
          </div>
          <i className="pd-rail" aria-hidden="true" />
        </>
      )}

      {/* The month's calendar (the real month and year). */}
      <div className="pd-cal" aria-hidden="true">
        <i className="pd-cal-shadow" />
        <i className="pd-cal-bg" />
        <div className="pd-cal-title">
          <span className="pd-cal-month">{monthName}</span> <span className="pd-cal-year">{bn(y)}</span>
        </div>
        <div className="pd-cal-body">
        <div className="pd-wk">
          {COPY.peakDay.weekHeads.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="pd-grid">
          {cells.map((n, i) => (
            <span key={i} className={`pd-cell ${n === d ? "is-sel" : ""} ${n ? "" : "is-blank"}`} data-r={Math.floor(i / 7)}>
              {n === d && <i className="pd-fill" />}
              {n ? <span className="pd-n">{bn(n)}</span> : null}
            </span>
          ))}
        </div>
        </div>
      </div>

      {/* The hero date: revealed in masks once the day is lit in its cell. */}
      <div className="pd-hero" aria-hidden="true">
        <span className="pd-mask">
          <span className="pd-day pd-day-in">{bn(d)}</span>
        </span>
        <span className="pd-mask">
          <span className="pd-month pd-month-in">{monthName}</span>
        </span>
        <i className="pd-bar" />
      </div>

      <div className="pd-support" aria-hidden="true">
        <p>{COPY.peakDay.prdSupport}</p>
        {slide.hours ? (
          <span className="pd-time">
            <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
              <circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M8 4.6V8l2.3 1.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            {COPY.peakDay.timeThatDay(slide.hours)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
