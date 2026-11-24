import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { StoryPlan } from "../data/compose";
import { HAS_ACTIONS, SLIDE_LABEL, SURFACE, renderSlide } from "../screens/registry";
import type { ScreenActions } from "../screens/types";
import { usePrefs } from "../lib/prefs";
import { ProgressBar } from "./ProgressBar";
import { MOTION } from "../lib/motion";
import { coverSurface, useCoverVariant } from "../explore/variant";
import { isBirdJourney, useJourney } from "../journey/journeyMode";
import { useMarksheetDesign } from "../marksheet/design";
import { ANSWER, WATCH, TAKEOVER, DAYLINE, ASSEMBLE, ONWARD, EntryCtx, FLOW, FOCUS, NavCtx, SKY_HANDOFF, type Entry } from "./entry";
import { StoryBackground } from "./StoryBackground";
import { COVER_BG, SCREEN_BACKGROUND, bgTransition } from "./background";

const TAP_BACK_ZONE = 0.3; // left 30% = back (Stories convention)
const SWIPE_X = 48;
const SWIPE_DOWN_CLOSE = 90;
const HOLD_MS = 250;

// Motion tier T1 (nav). MotionConfig drops the x-shift under reduced motion.
const D = MOTION.nav.distance;
// Background: one persistent Gentle Atmosphere layer (StoryBackground) behind every
// slide, never remounted; its variant follows the active screen (SCREEN_BACKGROUND
// in background.ts) and changes colour in place during the screen transition.
// Slides on it are transparent. Only the archived cover explorations (?cover=…)
// still paint their own ground over it.
// Screens 01–03 additionally share the bespoke hand-overs below.
// 02 → 03 (forward, full motion) is "flow": Screen 02 runs its own exit (StudyClock,
// via usePresence) while Screen 03 rises in on top. Any other step between two
// sky slides (e.g. going back) cross-fades in place: no sideways page slide.
// Cover → Screen 02 (forward, full motion) is the bespoke hand-over: the cover's
// four corner digits assemble into one ২০২৬ and leave (CoverFigma, via
// usePresence) while Screen 02 — transparent, on top — waits to reveal its
// content; the incoming slide itself does not move. Every other step keeps T1.
interface NavCustom extends Entry {
  d: number;
}
const SLIDE_VARIANTS = {
  enter: (c: NavCustom) =>
    c.kind === "sky" || c.kind === "flow" || c.kind === "focus" || c.kind === "answer" || c.kind === "watch" || c.kind === "takeover" || c.kind === "dayline" || c.kind === "assemble" || c.kind === "onward" ? { opacity: 1, x: 0 } : c.kind === "fade" ? { opacity: 0, x: 0 } : { opacity: 0, x: c.d * D },
  center: { opacity: 1, x: 0 },
  exit: (c: NavCustom) =>
    // A real keyframe (1 → .99) so the exit lasts while the cover runs its own exit.
    c.kind === "sky"
      ? { opacity: [1, 0.99], x: 0, transition: { duration: SKY_HANDOFF.coverOut, ease: "linear" as const } }
      : c.kind === "flow"
        ? { opacity: [1, 0.99], x: 0, transition: { duration: FLOW.out, ease: "linear" as const } }
        : c.kind === "focus"
          ? { opacity: [1, 0.99], x: 0, transition: { duration: FOCUS.out, ease: "linear" as const } }
        : c.kind === "answer"
          ? { opacity: [1, 0.99], x: 0, transition: { duration: ANSWER.out, ease: "linear" as const } }
        : c.kind === "takeover"
          ? { opacity: [1, 0.99], x: 0, transition: { duration: TAKEOVER.out, ease: "linear" as const } }
        : c.kind === "watch"
          ? { opacity: [1, 0.99], x: 0, transition: { duration: WATCH.out, ease: "linear" as const } }
        : c.kind === "dayline"
          ? { opacity: [1, 0.99], x: 0, transition: { duration: DAYLINE.out, ease: "linear" as const } }
        : c.kind === "assemble"
          ? { opacity: [1, 0.99], x: 0, transition: { duration: ASSEMBLE.out, ease: "linear" as const } }
        : c.kind === "onward"
          ? { opacity: [1, 0.99], x: 0, transition: { duration: ONWARD.out, ease: "linear" as const } }
        : c.kind === "fade"
          ? { opacity: 0, x: 0 }
          : { opacity: 0, x: c.d * -D },
};

/** Slides joined by the bespoke 01 → 02 → 03 hand-overs and in-place cross-fades. */
// The Bird Journey cover (dev-only) shares the approved cover's hand-over to 02.
const onSky = (id: string, coverVariant: string) => id === "study" || id === "live" || (id === "cover" && (coverVariant === "current" || coverVariant === "bird"));
/** Slides drawn over the shared background: all of them except archived cover explorations. */
const onBg = (id: string, coverVariant: string) => id !== "cover" || coverVariant === "current" || coverVariant === "bird";

interface Props {
  plan: StoryPlan;
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  actions: Omit<ScreenActions, "next">;
  /** Seconds per slide; null = tap-paced (prototype default). */
  autoAdvance: number | null;
  paused: boolean;
}

export function StoryViewer({ plan, index, onIndex, onClose, actions, autoAdvance, paused }: Props) {
  const { reduced } = usePrefs();
  const journey = useJourney();
  // Marksheet V2 (dev comparison) is static for now: 09 → 10 is an ordinary step, not the badge assembly.
  const marksheetDesign = useMarksheetDesign();
  const chosenCover = useCoverVariant();
  // Bird Journey (dev-only): its own cover, so the approved cover's hand-over is not used.
  const coverVariant = isBirdJourney(journey) ? "bird" : chosenCover;
  const slides = plan.slides;
  const slide = slides[index];
  // Chrome tone only: a light-ground cover exploration needs dark progress/close.
  const surface = slide.id === "cover" ? (isBirdJourney(journey) ? "cover" : coverSurface(chosenCover)) : SURFACE[slide.id];
  const last = slides.length - 1;

  // Direction + entry kind are derived from the index change itself, so taps,
  // keys, swipes and dev-panel jumps all get the same transition logic.
  const frameRef = useRef<HTMLDivElement>(null);
  const prevIndex = useRef(index);
  const nav = useRef<NavCustom>({ d: 1, kind: "normal", frame: { W: 0, H: 0 } });
  // Taps during the bespoke transition are ignored, so transitions never overlap.
  const lockUntil = useRef(0);
  if (prevIndex.current !== index) {
    const from = slides[prevIndex.current];
    const r = frameRef.current?.getBoundingClientRect();
    const frame = { W: r?.width ?? 0, H: r?.height ?? 0 };
    const step = index === prevIndex.current + 1 && !reduced;
    const bothSky = !!from && onSky(from.id, coverVariant) && onSky(slide.id, coverVariant);
    const kind: Entry["kind"] =
      bothSky && step && from.id === "cover" && slide.id === "study"
        ? "sky"
        : bothSky && step && from.id === "study" && slide.id === "live"
          ? "flow"
          : step && from?.id === "live" && slide.id === "teacher" && onBg("live", coverVariant)
            ? "focus"
            : step && from?.id === "teacher" && slide.id === "quiz"
              ? "answer"
            : step && from?.id === "quiz" && slide.id === "video"
              ? "watch"
            : step && from?.id === "video" && slide.id === "subject"
              ? "takeover"
            : step && from?.id === "subject" && slide.id === "peakDay"
              ? "dayline"
            : step && from?.id === "learnerType" && slide.id === "marksheet" && marksheetDesign === "current"
              ? "assemble"
            : step && from?.id === "marksheet" && slide.id === "close" && isBirdJourney(journey)
              ? "onward"
            : bothSky
              ? "fade"
              : "normal";
    nav.current = { d: index > prevIndex.current ? 1 : -1, kind, frame };
    if (kind === "sky") lockUntil.current = performance.now() + SKY_HANDOFF.lockMs;
    if (kind === "flow") lockUntil.current = performance.now() + FLOW.lockMs;
    if (kind === "focus") lockUntil.current = performance.now() + FOCUS.lockMs;
    if (kind === "answer") lockUntil.current = performance.now() + ANSWER.lockMs;
    if (kind === "watch") lockUntil.current = performance.now() + WATCH.lockMs;
    if (kind === "takeover") lockUntil.current = performance.now() + TAKEOVER.lockMs;
    if (kind === "dayline") lockUntil.current = performance.now() + DAYLINE.lockMs;
    if (kind === "assemble") lockUntil.current = performance.now() + ASSEMBLE.lockMs;
    if (kind === "onward") lockUntil.current = performance.now() + ONWARD.lockMs;
    prevIndex.current = index;
  }

  const go = useCallback(
    (delta: number) => {
      const n = Math.max(0, Math.min(last, index + delta));
      if (n === index || performance.now() < lockUntil.current) return;
      onIndex(n);
    },
    [index, last, onIndex],
  );

  // ── auto-advance (optional; paused while holding) ─────────────────
  const [held, setHeld] = useState(false);
  const [progress, setProgress] = useState(0);
  const stopsHere = HAS_ACTIONS.includes(slide.id); // never auto-skip a slide that offers a choice
  useEffect(() => setProgress(0), [index]);
  useEffect(() => {
    if (!autoAdvance || stopsHere || held || paused) return;
    let raf = 0;
    let lastT = performance.now();
    const tick = (t: number) => {
      const dt = (t - lastT) / 1000;
      lastT = t;
      setProgress((p) => {
        const np = p + dt / autoAdvance;
        if (np >= 1) {
          queueMicrotask(() => go(1));
          return 1;
        }
        return np;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoAdvance, stopsHere, held, paused, go, index]);

  // ── keyboard (desktop review convenience) ─────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (paused) return;
      if (e.key === "ArrowRight" || e.key === " ") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose, paused]);

  // ── tap / swipe / hold ────────────────────────────────────────────
  const start = useRef<{ x: number; y: number; t: number; holdTimer: number } | null>(null);
  const isInteractive = (el: EventTarget | null) =>
    el instanceof Element && !!el.closest("button, a, input, [data-no-nav]");

  const onPointerDown = (e: RPointerEvent) => {
    if (isInteractive(e.target)) return;
    const holdTimer = window.setTimeout(() => setHeld(true), HOLD_MS);
    start.current = { x: e.clientX, y: e.clientY, t: performance.now(), holdTimer };
  };
  const onPointerUp = (e: RPointerEvent<HTMLDivElement>) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    clearTimeout(s.holdTimer);
    const wasHold = held || performance.now() - s.t > HOLD_MS;
    setHeld(false);
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (dy > SWIPE_DOWN_CLOSE && Math.abs(dy) > Math.abs(dx)) return onClose();
    if (Math.abs(dx) > SWIPE_X && Math.abs(dx) > Math.abs(dy)) return go(dx < 0 ? 1 : -1);
    if (wasHold) return; // a hold is a pause, not a tap
    const rect = e.currentTarget.getBoundingClientRect();
    go(e.clientX - rect.left < rect.width * TAP_BACK_ZONE ? -1 : 1);
  };
  const onPointerCancel = () => {
    if (start.current) clearTimeout(start.current.holdTimer);
    start.current = null;
    setHeld(false);
  };

  const screenActions: ScreenActions = { ...actions, next: () => go(1) };

  return (
    <div
      ref={frameRef}
      className="story"
      data-surface={surface}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      role="region"
      aria-roledescription="story"
      aria-label={`${SLIDE_LABEL[slide.id]} — ${index + 1} / ${slides.length}`}
    >
      <div className="story-chrome">
        <ProgressBar count={slides.length} index={index} progress={autoAdvance && !stopsHere ? progress : 1} />
        <button type="button" className="story-close" aria-label="বন্ধ করো" onClick={onClose}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {/* Persistent background: never unmounts while the story is open, so its twinkle never restarts. */}
      <div className="story-bg">
        <StoryBackground variant={isBirdJourney(journey) && slide.id === "cover" ? COVER_BG : SCREEN_BACKGROUND[slide.id]} transition={bgTransition(nav.current.kind, reduced)} still={reduced} />
      </div>

      <NavCtx.Provider value={nav.current}>
      <AnimatePresence initial={false} custom={nav.current} mode="popLayout">
        <motion.div
          key={`${slide.id}-${index}`}
          className="story-slide"
          data-surface={surface}
          data-bg={onBg(slide.id, coverVariant) || undefined}
          custom={nav.current}
          variants={SLIDE_VARIANTS}
          initial="enter"
          animate="center"
          exit="exit"
          transition={reduced ? MOTION.navReduced : { duration: MOTION.nav.duration, ease: MOTION.nav.ease }}
        >
          <EntryCtx.Provider value={nav.current}>{renderSlide(slide, screenActions, true)}</EntryCtx.Provider>
        </motion.div>
      </AnimatePresence>
      </NavCtx.Provider>
    </div>
  );
}
