import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { usePresence } from "motion/react";
import { usePrefs } from "../lib/prefs";
import { registerTimeline, type TimelineHandle } from "./timeline";

/**
 * The screen lifecycle every animated screen repeats today, in one place
 * (adopted screen by screen; no screen uses it yet):
 *
 *   still (reduced motion / repeat view)   → final(root); nothing animates
 *   mount                                  → build(root) returns the screen's handle
 *   leaving (usePresence)                  → leave(root): stop, hand borrowed elements
 *                                            back, run an exit; returns how long the
 *                                            screen must stay mounted (s), then removal
 *   revived before removal (rapid taps)    → handle.finish(): the final frame
 *   unmount                                → handle.stop(), unregister
 *
 * `build` runs in a layout effect (before paint), as the GSAP screens do today,
 * so the first painted frame is already the timeline's first frame.
 */
export interface ScreenTimelineOptions {
  build: (root: HTMLElement) => TimelineHandle | null | undefined;
  /** The settled frame, applied directly (still mode, and as a fallback). */
  final?: (root: HTMLElement) => void;
  /**
   * Called when the screen starts leaving. Stop or hand back what it borrowed and
   * run its own exit; return the seconds it must stay mounted (0 = remove now).
   */
  leave?: (root: HTMLElement, handle: TimelineHandle | null) => number;
}

export function useScreenTimeline<T extends HTMLElement>(opts: ScreenTimelineOptions): {
  ref: RefObject<T | null>;
  handle: RefObject<TimelineHandle | null>;
} {
  const ref = useRef<T | null>(null);
  const handle = useRef<TimelineHandle | null>(null);
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const [isPresent, safeToRemove] = usePresence();

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (still) {
      optsRef.current.final?.(root);
      return;
    }
    const h = optsRef.current.build(root) ?? null;
    handle.current = h;
    const unregister = h ? registerTimeline(h) : undefined;
    return () => {
      unregister?.();
      h?.stop();
      handle.current = null;
    };
  }, [still]);

  const wasLeaving = useRef(false);
  useEffect(() => {
    const root = ref.current;
    if (isPresent) {
      if (wasLeaving.current) {
        wasLeaving.current = false;
        handle.current?.finish();
        if (root && !handle.current) optsRef.current.final?.(root);
      }
      return;
    }
    wasLeaving.current = true;
    const stay = root && optsRef.current.leave ? optsRef.current.leave(root, handle.current) : (handle.current?.stop(), 0);
    if (!stay) {
      safeToRemove?.();
      return;
    }
    const t = window.setTimeout(() => safeToRemove?.(), stay * 1000);
    return () => window.clearTimeout(t);
  }, [isPresent, safeToRemove]);

  return { ref, handle };
}
