import { createContext, useContext } from "react";

/**
 * Development-only comparison of three Wrap versions (the student-facing default
 * is always "current"):
 *   "current"  the approved Wrap (original Cover and Closing)
 *   "bird"     Bird Journey — the bird on the Cover and the sky-flight Closing only
 *              (ExperimentalBirdJourneyCover / ExperimentalBirdJourneyClosingSky)
 *   "birdled"  Bird-led Storytelling (version 2 experiment) — Bird Journey's Cover and
 *              Closing, and the bird takes part in the screens between, one screen at a
 *              time (so far: 02 "The Timekeeper"); every other screen is the original
 * Set from the dev panel (persisted with the other dev settings) or `?journey=bird|birdled`.
 */
export type JourneyMode = "current" | "bird" | "birdled";
/** The bird Cover and Closing (Bird Journey and Bird-led Storytelling). */
export const isBirdJourney = (m: JourneyMode) => m === "bird" || m === "birdled";
/** The bird takes part in the screens between Cover and Closing. */
export const isBirdLed = (m: JourneyMode) => m === "birdled";
export const JourneyCtx = createContext<JourneyMode>("current");
export const useJourney = () => useContext(JourneyCtx);
export const journeyFromUrl = (): JourneyMode | null => {
  const v = typeof location !== "undefined" ? new URLSearchParams(location.search).get("journey") : null;
  // (`sky` was a short-lived separate option; it is now Bird Journey)
  return v === "bird" || v === "sky" ? "bird" : v === "birdled" ? "birdled" : v === "current" ? v : null;
};
