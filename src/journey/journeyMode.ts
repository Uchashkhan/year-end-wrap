import { createContext, useContext } from "react";

/**
 * Development-only comparison: "current" = the approved Cover and Closing;
 * "bird" = the experimental Bird Journey cover and 2027 closing. Set from the
 * dev panel (persisted with the other dev settings) or `?journey=bird`.
 * The student-facing default is always "current".
 */
export type JourneyMode = "current" | "bird";
export const JourneyCtx = createContext<JourneyMode>("current");
export const useJourney = () => useContext(JourneyCtx);
export const journeyFromUrl = (): JourneyMode | null => {
  const v = typeof location !== "undefined" ? new URLSearchParams(location.search).get("journey") : null;
  return v === "bird" || v === "current" ? v : null;
};
