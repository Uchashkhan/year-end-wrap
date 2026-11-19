import { useEffect, useRef, useState } from "react";
import { animate } from "motion/react";
import { bn } from "../lib/bangla";
import { usePrefs } from "../lib/prefs";
import { MOTION } from "../lib/motion";

/**
 * Motion tier T2 (content): the number reveal.
 * Reduced motion / repeat view → final value immediately.
 * Width is reserved with the final value so layout never shifts while counting.
 */
export function CountUp({ to, run, duration = MOTION.content.countUp }: { to: number; run: boolean; duration?: number }) {
  const { reduced, repeatView } = usePrefs();
  const instant = reduced || repeatView;
  const [v, setV] = useState(instant ? to : 0);
  const done = useRef(false);

  useEffect(() => {
    if (instant) {
      setV(to);
      return;
    }
    if (!run || done.current) return;
    const c = animate(0, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (x) => setV(Math.round(x)),
      onComplete: () => (done.current = true),
    });
    return () => c.stop();
  }, [run, to, instant, duration]);

  return (
    <span className="countup">
      <span className="countup-ghost" aria-hidden="true">
        {bn(to)}
      </span>
      <span className="countup-live" aria-label={bn(to)}>
        {bn(v)}
      </span>
    </span>
  );
}
