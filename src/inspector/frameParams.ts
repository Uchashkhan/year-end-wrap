/**
 * Motion Inspector — how the preview frame was asked to start (development only).
 * The frame is the real prototype at `/?motionFrame=1&…`; App reads these so the
 * frame shows only the phone, starts where the inspector asks, and never reads or
 * writes the developer's saved dev-panel settings.
 *
 *   start=<slide id>   open the story at that screen (Mode A: its stand-alone entrance;
 *                      Mode B: the screen before the one inspected)
 *   (no start)         the home banner (Mode C, and Mode B into 01)
 *   p=<profile>        a fixture profile (data/profiles.ts)
 *   rm=1               reduced motion
 *   noProgram=1        the student has no recommended next program
 *   journey, cover, ms, live, quiz, …   the existing dev variants, unchanged
 */
export interface FrameParams {
  start: string | null;
  reduced: boolean;
  noProgram: boolean;
}

export function inspectorFrameParams(): FrameParams | null {
  if (!import.meta.env.DEV || typeof location === "undefined") return null;
  const q = new URLSearchParams(location.search);
  if (!q.has("motionFrame")) return null;
  return { start: q.get("start"), reduced: q.get("rm") === "1", noProgram: q.get("noProgram") === "1" };
}
