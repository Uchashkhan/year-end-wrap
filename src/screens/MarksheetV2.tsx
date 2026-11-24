import { useLayoutEffect, useRef, useState } from "react";
import { COPY, LEARNER_TYPES } from "../data/copy";
import { BentoV2Card, type V2Look } from "../marksheet/BentoV2";
import { CARD_H, CARD_W } from "../marksheet/Bento";
import type { ScreenProps } from "./types";
import "../styles/marksheet-screen.css";

/**
 * 10 Marksheet — V2 "Refined Bento" (dev comparison: V2-A Bold Graphic /
 * V2-B Refined Editorial; the approved Chapter Bento stays the default).
 *
 * STATIC for this iteration (the brief: design first, no new entrance motion):
 * the screen shows the settled card. The card here is the PRIVATE version —
 * it carries the student's photo, name, class and group (MarksheetOwner).
 * "শেয়ার করো" opens the share sheet, whose export is the same design without
 * the owner (ExportCard): the header becomes the Wrap ২০২৬ title. The privacy
 * note and actions stay outside the card.
 */
export function MarksheetV2({ slide, actions, look }: ScreenProps<"marksheet"> & { look: V2Look }) {
  const stage = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(0);
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const fit = () => setS(Math.min(el.clientWidth / CARD_W, el.clientHeight / CARD_H));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const f = slide.facts;
  return (
    <div className={`slide ms ms-v2 ms-v2-${look}`}>
      <p className="ms-sr">
        {COPY.marksheet.headline}। {COPY.learnerType.label}: {LEARNER_TYPES[f.type.id].name}। {slide.rows.map((r) => `${COPY.marksheet.rows[r.key]} ${r.value}`).join("। ")}
      </p>
      <div ref={stage} className="ms-stage" aria-hidden="true">
        {s > 0 && (
          <div className="ms-card" style={{ width: CARD_W * s, height: CARD_H * s }}>
            <BentoV2Card facts={f} owner={slide.owner} look={look} style={{ position: "absolute", left: 0, top: 0, transform: `scale(${s})`, transformOrigin: "0 0" }} />
          </div>
        )}
      </div>
      <div className="ms-foot">
        <p className="ms-privacy">{COPY.marksheet.privacy}</p>
        <button type="button" className="ms-primary" onClick={() => actions.share("marksheet")}>
          {COPY.marksheet.primary}
        </button>
        <button type="button" className="ms-secondary" onClick={actions.next}>
          {COPY.marksheet.secondary}
        </button>
      </div>
    </div>
  );
}
