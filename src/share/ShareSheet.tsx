import { motion } from "motion/react";
import { EXPORT_H, EXPORT_W, ExportCard, type ExportCardProps } from "./ExportCard";

/**
 * Stand-in for the Android OS share sheet (save-image lives inside the real one).
 * Its only job in the prototype is to preview exactly what leaves the app.
 */
export function ShareSheet({ card, onClose }: { card: ExportCardProps; onClose: () => void }) {
  const previewH = 360;
  const scale = previewH / EXPORT_H;
  return (
    <div className="share-layer" data-no-nav>
      <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="sheet-bottom share-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Share"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
      >
        <span className="sheet-grip" />
        <p className="share-os-label">Android share sheet (mock) · export {EXPORT_W}×{EXPORT_H}</p>
        <div className="share-preview" style={{ width: EXPORT_W * scale, height: previewH }}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
            <ExportCard {...card} />
          </div>
        </div>
        <div className="share-targets" aria-hidden="true">
          {["Messenger", "WhatsApp", "Instagram", "Save image"].map((t) => (
            <span key={t} className="share-target">
              <span className="share-target-icon" />
              {t}
            </span>
          ))}
        </div>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      </motion.div>
    </div>
  );
}
