import { useEffect, type CSSProperties, type ReactNode } from "react";
import { useAnimate } from "motion/react";
import { usePrefs } from "../lib/prefs";
import { EASE_OUT, MOTION } from "../lib/motion";

const E = MOTION.entrance;

// Vertical inset is negative so Bangla matras / vowel signs are never clipped.
const WRITE_FROM = "inset(-30% 100% -30% 0%)";
const WRITE_TO = "inset(-30% -4% -30% 0%)";

/**
 * One beat of a T2 entrance sequence.
 *   rise  — fades in while travelling up a few px (structural elements)
 *   fade  — opacity only (secondary detail)
 *   write — revealed left→right, like ink going onto paper (identity text)
 *
 * `at` is the beat's start time in seconds (take it from MOTION.entrance.*).
 * Started imperatively on mount, so it plays even when the slide is the first
 * child of an `AnimatePresence initial={false}` (the story viewer's opening slide).
 * Reduced motion / repeat view: final state, no animation.
 * Purely visual — never holds up navigation.
 */
export function Entrance({
  at,
  kind = "rise",
  className,
  children,
}: {
  at: number;
  kind?: "rise" | "fade" | "write";
  className?: string;
  children: ReactNode;
}) {
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const [scope, animate] = useAnimate<HTMLDivElement>();

  useEffect(() => {
    if (still || !scope.current) return;
    const c =
      kind === "write"
        ? animate(scope.current, { clipPath: [WRITE_FROM, WRITE_TO] }, { delay: at, duration: E.writeDuration, ease: E.writeEase })
        : animate(
            scope.current,
            { opacity: [0, 1], y: [kind === "rise" ? E.rise : 0, 0] },
            { delay: at, duration: E.duration, ease: EASE_OUT },
          );
    return () => c.stop();
  }, [still, kind, at, animate, scope]);

  // Pre-hide in the first paint so nothing flashes before its beat.
  const style: CSSProperties | undefined = still
    ? undefined
    : kind === "write"
      ? { clipPath: WRITE_FROM }
      : { opacity: 0, transform: kind === "rise" ? `translateY(${E.rise}px)` : undefined };

  return (
    <div ref={scope} className={className} style={style}>
      {children}
    </div>
  );
}
