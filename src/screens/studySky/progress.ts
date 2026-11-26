import { createContext, useContext } from "react";

/**
 * The passage of time on Study Time, 0 (the clock at rest, day) → 1 (the hours
 * counted, night). Published by whichever character choreography is on screen
 * (the original clock's spin, or the Timekeeper's hand), read by a background
 * effect (the day/night sky). Effects never know which character drives them.
 * Absent (null) when no effect listens: the characters then publish nothing.
 */
export interface SkyProgress {
  set(p: number): void;
  get(): number;
  subscribe(fn: (p: number) => void): () => void;
}

export function createSkyProgress(): SkyProgress {
  let value = 0;
  const subs = new Set<(p: number) => void>();
  return {
    set(p) {
      const v = Math.max(0, Math.min(1, p));
      if (v === value) return;
      value = v;
      subs.forEach((f) => f(v));
    },
    get: () => value,
    subscribe(fn) {
      subs.add(fn);
      fn(value);
      return () => void subs.delete(fn);
    },
  };
}

export const SkyProgressCtx = createContext<SkyProgress | null>(null);
/** The progress channel for this screen, when a background effect is listening. */
export const useSkyProgress = () => useContext(SkyProgressCtx);
