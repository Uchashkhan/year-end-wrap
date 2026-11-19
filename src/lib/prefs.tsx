import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { MotionConfig } from "motion/react";

export type MotionPref = "system" | "reduce" | "full";

interface ViewPrefs {
  /** Resolved: true when motion should be minimised. */
  reduced: boolean;
  /** Repeat viewing — calmer entry, learner type already revealed. */
  repeatView: boolean;
}

const Ctx = createContext<ViewPrefs>({ reduced: false, repeatView: false });

function useSystemReduced() {
  const [r, setR] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const on = () => setR(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return r;
}

export function PrefsProvider({ motion, repeatView, children }: { motion: MotionPref; repeatView: boolean; children: ReactNode }) {
  const system = useSystemReduced();
  const reduced = motion === "reduce" || (motion === "system" && system);
  return (
    <Ctx.Provider value={{ reduced, repeatView }}>
      <MotionConfig reducedMotion={reduced ? "always" : "never"}>{children}</MotionConfig>
    </Ctx.Provider>
  );
}

export const usePrefs = () => useContext(Ctx);
