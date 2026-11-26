import { createContext, useContext, type ReactNode } from "react";
import type { JourneyMode } from "../journey/journeyMode";

/**
 * Screen-level effect variations ("facets"): independent axes per screen, so
 * effects combine instead of each combination being its own screen component
 * or journey. Example: Study Time's character choreography (original clock /
 * the Timekeeper bird) and, separately, its background effect.
 *
 * Each axis resolves, highest first:
 *   1. the URL                `?study.character=timekeeper`
 *   2. a dev-panel override   (persisted with the dev settings; "auto" = no override)
 *   3. the journey preset     (Bird-led ⇒ study.character = timekeeper)
 *   4. the axis default       ("original": the approved screen)
 * The defaults reproduce the approved Wrap exactly, and each journey mode is
 * now a preset over these axes — it behaves as it did before.
 *
 * Add an axis only when an experiment needs it (no speculative switches).
 */
export const FACETS = {
  study: {
    character: { label: "Character", options: { original: "Original clock", timekeeper: "Timekeeper (bird)" }, default: "original" },
    sky: { label: "Background", options: { original: "Original" }, default: "original" },
  },
} as const;

type Facets = typeof FACETS;
export type FacetScreen = keyof Facets;
export type FacetAxis<S extends FacetScreen> = keyof Facets[S] & string;
/** "study.character" … */
export type FacetKey = { [S in FacetScreen]: `${S}.${FacetAxis<S>}` }[FacetScreen];
export type FacetMap = Partial<Record<FacetKey, string>>;

const axisDef = (key: FacetKey) => {
  const [s, a] = key.split(".") as [FacetScreen, string];
  return (FACETS[s] as Record<string, { label: string; options: Record<string, string>; default: string }>)[a];
};
export const FACET_KEYS = (Object.keys(FACETS) as FacetScreen[]).flatMap((s) => Object.keys(FACETS[s]).map((a) => `${s}.${a}` as FacetKey));
export const facetOptions = (key: FacetKey) => axisDef(key).options;
export const facetLabel = (key: FacetKey) => axisDef(key).label;
const valid = (key: FacetKey, v: string | null | undefined): v is string => !!v && v in axisDef(key).options;

/** What each journey mode implies. Bird-led: the Timekeeper on Study Time (its cover and closing are chosen by the journey itself). */
export const JOURNEY_PRESETS: Record<JourneyMode, FacetMap> = {
  current: {},
  bird: {},
  birdled: { "study.character": "timekeeper" },
};

/** Facet values given in the URL (`?study.character=timekeeper`). */
export function facetsFromUrl(): FacetMap {
  if (typeof location === "undefined") return {};
  const q = new URLSearchParams(location.search);
  const out: FacetMap = {};
  for (const k of FACET_KEYS) {
    const v = q.get(k);
    if (valid(k, v)) out[k] = v;
  }
  return out;
}

/** Resolve every axis: URL, then dev overrides, then the journey preset, then the default. */
export function resolveFacets(journey: JourneyMode, overrides: FacetMap = {}, url: FacetMap = facetsFromUrl()): Record<FacetKey, string> {
  const preset = JOURNEY_PRESETS[journey] ?? {};
  return Object.fromEntries(
    FACET_KEYS.map((k) => {
      const v = [url[k], overrides[k], preset[k]].find((x) => valid(k, x)) ?? axisDef(k).default;
      return [k, v];
    }),
  ) as Record<FacetKey, string>;
}

const FacetCtx = createContext<Record<FacetKey, string>>(resolveFacets("current", {}, {}));

export function FacetProvider({ value, children }: { value: Record<FacetKey, string>; children: ReactNode }) {
  return <FacetCtx.Provider value={value}>{children}</FacetCtx.Provider>;
}

/** The resolved value of one axis, e.g. useFacet("study", "character") → "original" | "timekeeper". */
export function useFacet<S extends FacetScreen, A extends FacetAxis<S>>(screen: S, axis: A): string {
  return useContext(FacetCtx)[`${screen}.${axis}` as FacetKey];
}
