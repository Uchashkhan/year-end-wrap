import { usePrefs } from "../lib/prefs";

/**
 * Allowed ambient motion: loops that may keep running in a screen's settled
 * reading state. They are never counted in a screen's finite settle time.
 * (This replaces lib/motion.ts's earlier "never idle loops" rule, which the
 * shipped screens had outgrown.)
 *
 * `essential` loops carry information and keep a non-animated form under
 * reduced motion (the live clock still shows the time, stepping once a second);
 * every other loop is nonessential and stops under reduced motion.
 */
export const AMBIENT = {
  coverDigitFloat: { where: "01 Cover, Bird cover", essential: false, note: "two sine axes per digit, periods 6.4–9.7 s" },
  coverArrowNudge: { where: "01 Cover, Bird cover", essential: false, note: "1.1 s nudge, 0.7 s rest; subtle" },
  backgroundTwinkle: { where: "every screen (StoryBackground)", essential: false, note: "star + two particles, 4.6 / 5.4 / 6.2 s" },
  liveClock: { where: "02 Study time", essential: true, note: "ticks once a second; reduced motion: steps without a tween" },
  birdIdle: { where: "Bird cover", essential: false, note: "the resting bird's idle movement" },
  birdFlight: { where: "Bird closing", essential: false, note: "wingbeat, airflow and clouds" },
} as const;
export type AmbientLoop = keyof typeof AMBIENT;

/** Whether an ambient loop may run, given the viewer's motion preference. */
export function ambientAllowed(loop: AmbientLoop, reduced: boolean): boolean {
  return !reduced || AMBIENT[loop].essential;
}

/** Hook form, for components. */
export function useAmbientAllowed(loop: AmbientLoop): boolean {
  return ambientAllowed(loop, usePrefs().reduced);
}
