import { RELATION } from "./reference";

const playback = { at: 1.02, duration: 2.6 };
const land = playback.at + playback.duration + RELATION.landAfterDriver;

export const VIDEO_BEYOND = {
  play: { at: 0.05, duration: 0.55 },
  expand: { at: 0.38, duration: 0.72 },
  playback,
  land,
  comparison: land + RELATION.captionAfterLand,
  badge: land + RELATION.panelAfterLand,
  end: land + 1.2,
  ambientPeriod: 6.4,
} as const;
