import { STAGGER_REF, TEXT } from "./reference";

const climb = 3.6;
const headline = climb + 0.53;
const year = headline + STAGGER_REF.line;
const support = year + 0.16;
const cta = support + 0.16;

export const BIRD_COVER = {
  climb,
  cornerDigits: { at: climb, duration: 0.78 },
  headline: { at: headline, duration: TEXT.up.dur },
  year: { at: year, duration: TEXT.up.dur },
  support: { at: support, duration: TEXT.fade.dur },
  cta: { at: cta, duration: TEXT.fade.dur },
  end: cta + TEXT.fade.dur,
  hover: { amplitude: 1.5, period: 5.8 },
} as const;

const rampEnd = 0.17;
const cruiseEnd = 0.58;
const entrySpeed = 0.24;
const surge = 0.12;
const rampDistance = rampEnd * (entrySpeed + 1) / 2;
const cruiseDistance = (cruiseEnd - rampEnd) * (1 + 2 * surge / Math.PI);
const totalDistance = rampDistance + cruiseDistance + (1 - cruiseEnd) / 2;

export const unit = (value: number) => Math.max(0, Math.min(1, value));
export const smooth = (value: number) => {
  const t = unit(value);
  return t * t * (3 - 2 * t);
};

// The integral of the speed curve gives camera travel, so seeking to a time always paints the same frame.
export function flightAt(progress: number) {
  const u = unit(progress);
  if (u < rampEnd) {
    const t = u / rampEnd;
    return {
      velocity: entrySpeed + (1 - entrySpeed) * smooth(t),
      distance: rampEnd * (entrySpeed * t + (1 - entrySpeed) * (t ** 3 - t ** 4 / 2)) / totalDistance,
    };
  }
  if (u < cruiseEnd) {
    const t = (u - rampEnd) / (cruiseEnd - rampEnd);
    const angle = Math.PI * t;
    return {
      velocity: 1 + surge * Math.sin(angle),
      distance: (rampDistance + (cruiseEnd - rampEnd) * (t + surge * (1 - Math.cos(angle)) / Math.PI)) / totalDistance,
    };
  }
  const t = (u - cruiseEnd) / (1 - cruiseEnd);
  return {
    velocity: 1 - smooth(t),
    distance: (rampDistance + cruiseDistance + (1 - cruiseEnd) * (t - t ** 3 + t ** 4 / 2)) / totalDistance,
  };
}
