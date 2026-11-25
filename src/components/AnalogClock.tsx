import { useEffect } from "react";
import { animate, motion, useMotionValue, type AnimationPlaybackControls, type MotionValue } from "motion/react";
import "../styles/analog-clock.css";

/**
 * Large analog clock (Screen 02). Face, ticks and hub are one static SVG; each
 * hand is its own full-size SVG layer rotated about the clock's centre, so the
 * pivot is exact at every size and rotation stays a compositor transform.
 *
 * Angles are cumulative seconds since local midnight of the mount day (never
 * wrapped), so neither the entrance nor live time ever winds a hand backwards:
 *   second = s × 6°,  minute = s × 0.1°,  hour = s / 120°
 *
 * Entrance (full motion): from `delay`, the hands spin and decelerate together
 * for `spin` seconds — second hand ~5 turns, minute hand 2 turns, hour hand 2
 * hours' worth — and land exactly on the real time at that moment. Then live:
 * the second hand ticks once per second (a 160 ms step, no bounce); minute and
 * hour advance proportionally on the same tick. Motion values only: no React
 * re-renders while the clock runs.
 * `still` (reduced motion): hands placed at the current time, updated per second
 * without animation.
 */

const TRAVEL = { s: 1800, m: 720, h: 60 } as const;
/** Gentle start, long deceleration. */
const SPIN_EASE = [0.45, 0, 0.12, 1] as const;
const TICK = { duration: 0.16, ease: [0.25, 0.9, 0.3, 1] as const };

function secondsSinceMidnight(base: number, t: number) {
  return Math.floor((t - base) / 1000);
}

function Hand({ cls, rotate, children }: { cls: string; rotate: MotionValue<number>; children: React.ReactNode }) {
  return (
    <motion.div className={`clk-hand ${cls}`} style={{ rotate }}>
      <svg viewBox="0 0 1000 1000">{children}</svg>
    </motion.div>
  );
}

export function AnalogClock({ still, delay = 0.3, spin = 3.2 }: { still: boolean; delay?: number; spin?: number }) {
  const sec = useMotionValue(0);
  const min = useMotionValue(0);
  const hour = useMotionValue(0);

  useEffect(() => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const base = midnight.getTime();
    const place = (s: number) => {
      min.set(s * 0.1);
      hour.set(s / 120);
    };

    const anims: AnimationPlaybackControls[] = [];
    let timer = 0;
    const tick = () => {
      const s = secondsSinceMidnight(base, Date.now() + 15);
      const target = s * 6;
      // After a long background pause, don't sweep through minutes of seconds: jump.
      if (still || Math.abs(target - sec.get()) > 12) sec.set(target);
      else anims.push(animate(sec, target, TICK));
      place(s);
      timer = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    };

    if (still) {
      tick();
      return () => clearTimeout(timer);
    }

    const landAt = Date.now() + (delay + spin) * 1000;
    const s = secondsSinceMidnight(base, landAt);
    const to = { s: s * 6, m: s * 0.1, h: s / 120 };
    sec.set(to.s - TRAVEL.s);
    min.set(to.m - TRAVEL.m);
    hour.set(to.h - TRAVEL.h);
    const opts = { duration: spin, delay, ease: SPIN_EASE };
    anims.push(animate(sec, to.s, opts), animate(min, to.m, opts), animate(hour, to.h, opts));
    // First live tick on the next whole second after landing.
    timer = window.setTimeout(tick, landAt - Date.now() + (1000 - (landAt % 1000)));

    return () => {
      clearTimeout(timer);
      anims.forEach((a) => a.stop());
    };
  }, [still, delay, spin, sec, min, hour]);

  return <ClockDial sec={sec} min={min} hour={hour} />;
}

/**
 * The clock as drawn (face, ticks, three hands, hub), its hands driven by the
 * given motion values. Shared by AnalogClock and the Bird-led Timekeeper, which
 * drives the same hands from its own timeline — one clock design.
 */
export function ClockDial({ sec, min, hour }: { sec: MotionValue<number>; min: MotionValue<number>; hour: MotionValue<number> }) {
  return (
    <div className="clk" aria-hidden="true">
      <svg className="clk-face" viewBox="0 0 1000 1000">
        <circle cx="500" cy="500" r="500" className="clk-rim" />
        <circle cx="500" cy="500" r="462" className="clk-dial-edge" />
        <circle cx="500" cy="500" r="440" className="clk-dial" />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="500" y1="70" x2="500" y2="118" className="clk-tick" transform={`rotate(${i * 30} 500 500)`} />
        ))}
      </svg>
      <Hand cls="clk-hour" rotate={hour}>
        <rect x="486" y="250" width="28" height="275" rx="14" />
      </Hand>
      <Hand cls="clk-min" rotate={min}>
        <rect x="490" y="120" width="20" height="405" rx="10" />
      </Hand>
      <Hand cls="clk-sec" rotate={sec}>
        <rect x="496.5" y="92" width="7" height="488" rx="3.5" />
      </Hand>
      <svg className="clk-hub" viewBox="0 0 1000 1000">
        <circle cx="500" cy="500" r="22" className="clk-hub-outer" />
        <circle cx="500" cy="500" r="8" className="clk-hub-inner" />
      </svg>
    </div>
  );
}
