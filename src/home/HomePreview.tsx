import { AnimatePresence, motion } from "motion/react";
import { COPY } from "../data/copy";
import { Button, ShikhoMark } from "../components/primitives";

/**
 * 00 — Home entry banner, sitting in the existing Year-Review slot.
 * The surrounding home is neutral skeleton on purpose: we're designing the
 * banner, not a new home (PRD).
 */
export function HomePreview({
  name,
  seen,
  comingSoonOpen,
  onOpen,
  onDismissSheet,
}: {
  name: string | null;
  seen: boolean;
  comingSoonOpen: boolean;
  onOpen: () => void;
  onDismissSheet: () => void;
}) {
  return (
    <div className="home">
      <header className="home-top">
        <ShikhoMark size={30} />
        <span className="sk sk-pill" />
      </header>

      <div className="home-feed">
        <div className="sk sk-line" style={{ width: "46%" }} />

        <section className={`banner ${seen ? "banner-seen" : ""}`} aria-label="Wrap ২০২৬">
          {!seen && <span className="banner-cue">{COPY.banner.newCue}</span>}
          <h2 className="banner-title">{name ? COPY.banner.headline(name) : COPY.banner.headlineNoName}</h2>
          <p className="banner-support">{COPY.banner.support}</p>
          <Button kind="primary" onClick={onOpen}>
            {COPY.banner.cta}
          </Button>
        </section>

        <div className="sk sk-card" />
        <div className="sk-row">
          <div className="sk sk-tile" />
          <div className="sk sk-tile" />
        </div>
        <div className="sk sk-card" />
      </div>

      <AnimatePresence>
        {comingSoonOpen && (
          <>
            <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onDismissSheet} />
            <motion.div
              className="sheet-bottom"
              role="dialog"
              aria-modal="true"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
            >
              <span className="sheet-grip" />
              <p className="sheet-bottom-text">{COPY.banner.comingSoon}</p>
              <Button kind="primary" onClick={onDismissSheet}>
                {COPY.banner.comingSoonDismiss}
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
