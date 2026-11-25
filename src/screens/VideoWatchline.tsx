import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useAnimate, usePresence } from "motion/react";
import { COPY } from "../data/copy";
import { bn } from "../lib/bangla";
import { usePrefs } from "../lib/prefs";
import { CountUp } from "../components/CountUp";
import { BadgePill } from "../components/primitives";
import { TAKEOVER, WATCH, useEntry, useNav } from "../story/entry";
import { VideoCard } from "./VideoPlayer";
import { watchSequence } from "./watchHandoff";
import type { ScreenProps } from "./types";
import "../styles/video-watchline.css";
import { devRegister, fromMotion } from "../motion/timeline";
import type { AnimationPlaybackControls } from "motion/react";


/** The minutes step down with digit count so number + "মিনিট" keep one row. */
function numSize(n: number): CSSProperties {
  const len = bn(n).length;
  return { "--vw-num": len <= 3 ? "min(33cqw, 15.5cqh)" : "min(26cqw, 12.5cqh)" } as CSSProperties;
}

const Tri = () => (
  <svg className="vw-tri" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5.2c0-.8.9-1.3 1.6-.9l10 6.4c.6.4.6 1.4 0 1.8l-10 6.4c-.7.4-1.6 0-1.6-.9z" />
  </svg>
);

/**
 * 06 Video — "The Watchline", reproduced from the V3 reference (22 Nov):
 * three connected states in one DOM, one continuous Motion sequence.
 * Copy is PRD only (Screen 6): the heading "ভিডিও দেখে শিখেছ" stays from the
 * first state; the minutes complete "ভিডিও দেখে শিখেছ [X] মিনিট"; the comparison
 * "১২০ মিনিটের সিনেমা ধরলে, প্রায় [Y]টি!" when meaningful; then the earned
 * recognition. PRD hierarchy: minutes → comparison → recognition.
 *   01 play        the lesson player card in focus
 *   02 accumulate  three lesson cards, tilted and overlapping, on one shared
 *                  watch line
 *   03 reveal      the minutes (yellow hero) + "মিনিট"; the watchline; four
 *                  playback tiles; the comparison; the badge (if earned)
 * Shared elements: each video is ONE card (VideoCard) that morphs continuously
 * — the player becomes the first lesson card and then a tile; the other two
 * cards become tiles — so no design swaps mid-move; the shared line rises to
 * become the year's watchline. Background: the section's Gentle Atmosphere
 * variant (Signature Blue, background.ts) — no screen-level ground.
 * Data is real (minutes, film count).
 * Final state is CSS (states 01–02 elements are hidden at rest); the sequence is
 * in watchHandoff.ts. Reduced motion / repeat view: state 03, still.
 */
export function VideoWatchline({ slide }: ScreenProps<"video">) {
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const fromQuiz = useEntry().kind === "watch";
  const shift = fromQuiz ? 0 : -WATCH.s1.head;
  const [counting, setCounting] = useState(still);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const [isPresent, safeToRemove] = usePresence();
  const ctlRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (still) return;
    const root = scope.current;
    if (!root) return;
    const from = fromQuiz ? root.closest(".story")?.querySelector<HTMLElement>(".slide.qa") ?? null : null;
    const segs = watchSequence(root, { from, shift });
    const c = segs.length ? (animate as unknown as (seq: unknown) => { stop: () => void; pause: () => void; time: number })(segs) : null;
    ctlRef.current = c;
    const t = window.setTimeout(() => setCounting(true), Math.max(0, WATCH.to3.stat.at + shift) * 1000);
    // Dev review only: ?freeze=<s> holds the sequence at that moment.
    const freeze = import.meta.env.DEV ? Number(new URLSearchParams(location.search).get("freeze") ?? NaN) : NaN;
    if (c && !Number.isNaN(freeze)) {
      c.time = freeze;
      c.pause();
    }
    // dev only (no-op in production): the Motion Inspector reads this sequence
    const unregister = devRegister("06 Video · sequence (Motion)", c ? fromMotion(c as unknown as AnimationPlaybackControls) : null);
    return () => {
      unregister();
      c?.stop();
      clearTimeout(t);
    };
    // entry is fixed for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, animate, scope]);

  // Leaving: stop the sequence. To Screen 07 ("Subject Takes Over") everything
  // but the yellow watchline clears — 07 carries the line on as its underbar;
  // any other exit is immediate.
  const nav = useNav();
  useEffect(() => {
    if (isPresent) return;
    ctlRef.current?.stop();
    if (nav.kind !== "takeover" || !scope.current) {
      safeToRemove?.();
      return;
    }
    const c = animate(
      ".vw-head, .vw-stat, .vw-tiles, .vw-cmp, .vw-badge, .vv",
      { opacity: 0, y: -8 },
      { duration: TAKEOVER.textOut, ease: [0.4, 0, 0.2, 1] },
    );
    const t = window.setTimeout(() => safeToRemove?.(), TAKEOVER.out * 1000);
    return () => {
      c.stop();
      clearTimeout(t);
    };
    // nav is read at the moment Screen 06 starts leaving
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  const films = slide.films !== null ? COPY.video.films(slide.films) : null;

  return (
    <div ref={scope} className={`slide vw ${still ? "" : "is-pre"}`} style={numSize(slide.minutes)}>

      <p className="vw-sr">
        {COPY.video.lead} {bn(slide.minutes)} {COPY.video.unit}
        {films ? `। ${films.line1} ${films.lead} ${films.count}` : ""}
      </p>

      {!still && (
        <div aria-hidden="true">
          {/* ── 01 play ── */}
          {/* Where each look sits: the player (01) and the three lesson cards (02).
              Invisible boxes; the morphing cards measure them. */}
          <i className="vw-slot vw-slot-player" />

          {/* ── 02 accumulate ── */}
          {[0, 1, 2].map((i) => (
            <i key={i} className={`vw-slot vw-slot-u${i}`} />
          ))}
        </div>
      )}

      {/* ── 03 reveal (the resting state) ── */}
      <h1 className="vw-head" aria-hidden="true">
        <span>{COPY.video.lead}</span>
      </h1>
      <div className="vw-stat" aria-hidden="true">
        <span className="vw-mask">
          <span className="vw-num">
            <CountUp to={slide.minutes} run={counting} duration={WATCH.to3.stat.count} />
          </span>
        </span>
        <span className="vw-mask">
          <span className="vw-unit-word">{COPY.video.unit}</span>
        </span>
      </div>
      <div className="vw-line" aria-hidden="true">
        <i className="vw-line-track" />
        <i className="vw-line-fill" />
        <i className="vw-line-knob" />
      </div>
      {/* One card per video, morphing player → lesson card → tile (entrance only). */}
      {!still && [2, 1, 0].map((i) => <VideoCard key={i} index={i} />)}
      <div className="vw-tiles" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`vw-tile vw-tile-${i}`}>
            <Tri />
          </span>
        ))}
      </div>
      {films && (
        <div className="vw-cmp" aria-hidden="true">
          <p>
            {films.line1}
            <br />
            {films.lead} <strong>{films.count}</strong>
          </p>
        </div>
      )}
      {slide.badge && (
        <div className="vw-badge">
          <BadgePill id={slide.badge} />
        </div>
      )}
    </div>
  );
}
