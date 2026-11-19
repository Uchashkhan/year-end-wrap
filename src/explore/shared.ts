import type { Slide } from "../data/compose";

type CoverSlide = Extract<Slide, { id: "cover" }>;

/**
 * Name length tier, by grapheme-ish code points. Each exploration maps tiers to
 * its own sizes so a long name steps down instead of truncating mid-word.
 *   l ≤ 8 · m ≤ 14 · s ≤ 24 · xs > 24
 */
export function nameTier(name: string | null): "l" | "m" | "s" | "xs" {
  const n = name ? [...name].length : 0;
  return n <= 8 ? "l" : n <= 14 ? "m" : n <= 24 ? "s" : "xs";
}

/** V2: class · group line; an empty part is simply absent. */
export function classLine(s: CoverSlide): string | null {
  return [s.className, s.group].filter(Boolean).join(" · ") || null;
}
