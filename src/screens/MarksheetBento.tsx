import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAnimate, usePresence } from "motion/react";
import { COPY, LEARNER_TYPES } from "../data/copy";
import { usePrefs } from "../lib/prefs";
import { ASSEMBLE, useEntry } from "../story/entry";
import { BentoCard, CARD_H, CARD_W } from "../marksheet/Bento";
import type { ScreenProps } from "./types";
import "../styles/marksheet-screen.css";

type Seg = [Element | Element[], Record<string, unknown>, { at: number; duration: number; ease?: unknown }];
const OUT = [0.22, 1, 0.36, 1] as const;
const INOUT = [0.65, 0, 0.35, 1] as const;

/**
 * 10 Marksheet — "তোমার ২০২৬, এক খাতায়", the year as a bento card (Direction A,
 * "Chapter Bento"; explorations in BentoLab, `?view=bento`).
 *
 * The card on screen IS the export card (marksheet/Bento.tsx) at its native
 * 1080 × 1920, scaled to the space above the actions — one design, two sizes.
 * It is built from MarksheetFacts only, so it can't carry the student's name,
 * photo, school or rank; the in-app view adds nothing personal to it either.
 * Actions (PRD): "শেয়ার করো" → the share sheet with the export card;
 * "এগিয়ে যাও" → Screen 11. The privacy note sits above them.
 *
 * Assembling the year (≈ 1.2 s, ASSEMBLE): from 09 the badge is the shared
 * element — it leaves 09's place and lands in the identity tile, which
 * establishes around it; the chapters follow in three groups (stickers + the
 * hero block, the pairs, the foot); the actions last. Other entries: the same
 * assembly with the badge settling in place. Reduced motion / repeat view: the
 * final frame.
 */
export function MarksheetBento({ slide, actions }: ScreenProps<"marksheet">) {
  const { reduced, repeatView } = usePrefs();
  const still = reduced || repeatView;
  const fromType = useEntry().kind === "assemble";
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const [isPresent, safeToRemove] = usePresence();
  const stage = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(0);
  const ctl = useRef<{ stop: () => void } | null>(null);

  // The card's scale: as large as the stage allows, at 9 : 16.
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const fit = () => setS(Math.min(el.clientWidth / CARD_W, el.clientHeight / CARD_H));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const root = scope.current;
    if (still || !root || !s) return;
    const q = (sel: string) => [...root.querySelectorAll<HTMLElement>(sel)];
    const A = ASSEMBLE;
    const card = root.querySelector<HTMLElement>(".bento")!;
    const id = root.querySelector<HTMLElement>(".bt-id")!;
    const art = root.querySelector<HTMLElement>(".bn-badge .lt-badge-art");
    const segs: Seg[] = [];
    const add = (el: Element | Element[] | null, kf: Record<string, unknown>, at: number, d: number, ease: unknown = OUT) => {
      if (el && (!Array.isArray(el) || el.length)) segs.push([el, kf, { at, duration: d, ease }]);
    };

    add(card, { backgroundColor: ["rgba(11, 15, 74, 0)", "rgba(11, 15, 74, 1)"] }, A.ground.at, A.ground.dur, "linear");
    add(root.querySelector(".ms-card"), { boxShadow: ["0 18px 40px rgba(10, 12, 60, 0)", "0 18px 40px rgba(10, 12, 60, 0.35)"] }, A.ground.at, A.ground.dur + 0.1, "linear");

    // the badge: out of 09's place (when there), into the identity tile
    const from = fromType ? root.closest(".story")?.querySelector<HTMLElement>(".slide.lt .lt-badge") : null;
    if (art) {
      const to = art.getBoundingClientRect();
      if (from) {
        const f = from.getBoundingClientRect();
        from.style.visibility = "hidden";
        art.style.transformOrigin = "0 0";
        add(art, { x: [(f.left - to.left) / s, 0], y: [(f.top - to.top) / s, 0], scale: [f.width / to.width, 1] }, A.badge.at, A.badge.dur, INOUT);
      } else {
        art.style.transformOrigin = "50% 50%";
        add(art, { opacity: [0, 1], scale: [0.86, 1] }, A.badge.at + 0.1, A.badge.dur, OUT);
      }
    }
    // the identity tile establishes around it; its words settle
    // (the tile's own gradient is lent to a layer that can grow without moving the badge)
    id.style.overflow = "visible";
    id.style.zIndex = "3";
    id.style.background = "none";
    add(q(".bt-id > .bn-head, .bt-id > .bn-type"), { opacity: [0, 1], y: [24, 0] }, A.words.at, A.words.dur);
    const ground = document.createElement("i");
    ground.className = "ms-id-ground";
    id.prepend(ground);
    add(ground, { opacity: [0, 1], scale: [0.94, 1] }, A.identity.at, A.identity.dur);
    // the chapters, in three groups
    const g1 = [...q(".bn-strip"), ...q('.bt-slot[data-row="hero"] > .bt')];
    const g2 = q('.bt-slot[data-row="pair"] > .bt');
    const g3 = q(".bn-foot");
    [g1, g2, g3].forEach((g, i) => add(g, { opacity: [0, 1], y: [36, 0] }, A.groups[i].at, A.groups[i].dur));
    add(q(".ms-foot"), { opacity: [0, 1], y: [16, 0] }, A.actions.at, A.actions.dur);

    root.classList.remove("is-pre");
    const c = (animate as unknown as (x: unknown) => { stop: () => void; then: (f: () => void) => void })(segs);
    const done = () => {
      id.style.overflow = "";
      id.style.zIndex = "";
      id.style.background = "";
      ground.remove();
    };
    c.then(done);
    ctl.current = c;
    return () => {
      c.stop();
      done();
    };
    // entry is fixed for this mount; runs once the card has its scale
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, !!s]);

  // Leaving: stop; removal is immediate. Revived before removal (rapid taps): the final frame.
  const wasLeaving = useRef(false);
  useEffect(() => {
    if (isPresent) {
      if (wasLeaving.current && scope.current) {
        wasLeaving.current = false;
        const done = { duration: 0 };
        animate(".bento", { backgroundColor: "rgba(11, 15, 74, 1)" }, done);
        animate(".bt, .bn-strip, .bn-foot, .bn-head, .bn-type, .ms-foot, .ms-id-ground", { opacity: 1, x: 0, y: 0, scale: 1 }, done);
        animate(".lt-badge-art", { opacity: 1, x: 0, y: 0, scale: 1 }, done);
      }
      return;
    }
    wasLeaving.current = true;
    ctl.current?.stop();
    safeToRemove?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  const f = slide.facts;
  return (
    <div ref={scope} className={`slide ms ${still ? "" : "is-pre"}`}>
      <p className="ms-sr">
        {COPY.marksheet.headline}। {COPY.learnerType.label}: {LEARNER_TYPES[f.type.id].name}। {slide.rows.map((r) => `${COPY.marksheet.rows[r.key]} ${r.value}`).join("। ")}
      </p>
      <div ref={stage} className="ms-stage" aria-hidden="true">
        {s > 0 && (
          <div className="ms-card" style={{ width: CARD_W * s, height: CARD_H * s }}>
            <BentoCard facts={f} variant="a" style={{ transform: `scale(${s})`, transformOrigin: "0 0" }} />
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
