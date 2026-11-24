import { createContext, useContext } from "react";

/**
 * Development-only comparison: "current" = the approved Cover and Closing;
 * "bird" = the experimental Bird Journey cover and its sky-flight closing
 * (ExperimentalBirdJourneyClosingSky). Set from the
 * dev panel (persisted with the other dev settings) or `?journey=bird`.
 * The student-facing default is always "current".
 */
export type JourneyMode = "current" | "bird";
export const isBirdJourney = (m: JourneyMode) => m === "bird";
export const JourneyCtx = createContext<JourneyMode>("current");
export const useJourney = () => useContext(JourneyCtx);
export const journeyFromUrl = (): JourneyMode | null => {
  const v = typeof location !== "undefined" ? new URLSearchParams(location.search).get("journey") : null;
  // (`sky` was a short-lived separate option; it is now Bird Journey)
  return v === "bird" || v === "sky" ? "bird" : v === "current" ? v : null;
};
