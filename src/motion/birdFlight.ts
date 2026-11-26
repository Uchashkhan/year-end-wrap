const rampEnd = 0.17;
const cruiseEnd = 0.58;
const surge = 0.12;
const cruiseDistance = (cruiseEnd - rampEnd) * (1 + 2 * surge / Math.PI);

export const unit = (value: number) => Math.max(0, Math.min(1, value));
export const smooth = (value: number) => {
  const t = unit(value);
  return t * t * (3 - 2 * t);
};

// The integral of the speed curve gives camera travel, so seeking to a time always paints the same frame.
export function flightAt(progress: number, entrySpeed = 0.24) {
  const u = unit(progress);
  const rampDistance = rampEnd * (entrySpeed + 1) / 2;
  const totalDistance = rampDistance + cruiseDistance + (1 - cruiseEnd) / 2;
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

export function flightPose(progress: number, ratio: number, entrySpeed?: number) {
  const { distance, velocity } = flightAt(progress, entrySpeed);
  const pace = Math.min(velocity, 1);
  const phase = distance * Math.PI * 3.1;
  const inertia = velocity - flightAt(progress - 0.045, entrySpeed).velocity;
  return {
    distance, velocity, phase,
    drift: (5.2 * Math.sin(phase + 0.4) + 2 * Math.sin(0.55 * phase)) * pace * ratio,
    lift: (-8 * Math.sin(phase + 0.2) + 16 * inertia) * pace * ratio,
    bank: (2.7 * Math.sin(phase + 0.65) - 8 * inertia) * pace,
    scale: 0.023 * pace,
  };
}

export const BIRD_HOVER = { amplitude: 1.5, period: 5.8 } as const;
