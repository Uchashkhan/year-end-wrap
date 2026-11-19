import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { COPY, LEARNER_TYPES } from "../data/copy";
import { usePrefs } from "../lib/prefs";
import { Actions, Stamp } from "../components/primitives";
import { MOTION } from "../lib/motion";
import type { ScreenProps } from "./types";

/**
 * 09 — the peak. States (V2/PRD): pre-reveal · reveal · revealed · repeat-view · fallback.
 *   fallback  = "balanced" type (the honest default), same layout.
 *   repeat    = lands revealed, no build-up.
 *   reduced   = lands revealed, no stamp motion.
 *
 * Motion tier T3 (hero): the stamp lands once. Composition is still M1;
 * the full 09 design is Milestone 3.
 * A tap during pre-reveal reveals instead of skipping the peak.
 */
export function LearnerType({ slide, actions, active }: ScreenProps<"learnerType">) {
  const { reduced, repeatView } = usePrefs();
  const skipBuild = reduced || repeatView;
  const [revealed, setRevealed] = useState(skipBuild);
  const t = LEARNER_TYPES[slide.type];

  useEffect(() => {
    if (skipBuild) return setRevealed(true);
    if (!active || revealed) return;
    const id = setTimeout(() => setRevealed(true), MOTION.hero.holdMs);
    return () => clearTimeout(id);
  }, [active, revealed, skipBuild]);

  return (
    <div className="slide slide-split">
      <div className="slide-body">
        <AnimatePresence mode="wait" initial={false}>
          {!revealed ? (
            <motion.div key="pre" className="stack-center" exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <p className="display">{COPY.learnerType.headline}</p>
              <p className="support">{COPY.learnerType.setup}</p>
            </motion.div>
          ) : (
            <motion.div key="post" className="stack-center" initial={false}>
              <p className="eyebrow">{COPY.learnerType.label}</p>
              <motion.div
                initial={skipBuild ? false : MOTION.hero.from}
                animate={MOTION.hero.to}
                transition={MOTION.hero.spring}
              >
                <Stamp name={t.name} />
              </motion.div>
              <p className="support">{t.reason({ activeDays: slide.activeDays })}</p>
              {slide.streak && <p className="note">{COPY.learnerType.streak(slide.streak)}</p>}
              {t.verify && <p className="dev-flag">VERIFY: night-owl needs confirmed hour-band data</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!revealed && (
        <button type="button" className="reveal-catcher" aria-label="Reveal" onClick={() => setRevealed(true)} />
      )}

      <motion.div
        className="slide-foot"
        initial={false}
        animate={{ opacity: revealed ? 1 : 0 }}
        transition={{ delay: revealed && !skipBuild ? MOTION.hero.actionsDelay : 0, duration: 0.25 }}
        style={{ pointerEvents: revealed ? "auto" : "none" }}
      >
        <Actions
          primary={{ label: COPY.learnerType.primary, onClick: actions.next }}
          secondary={{ label: COPY.learnerType.secondary, onClick: () => actions.share("type") }}
        />
      </motion.div>
    </div>
  );
}
