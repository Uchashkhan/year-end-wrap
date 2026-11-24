import { useRef, type CSSProperties, type ReactNode } from "react";
import { BADGES, CAPSTONE, COPY, LEARNER_TYPES, SUBJECTS } from "../data/copy";
import type { MarksheetFacts, MarksheetOwner } from "../data/compose";
import { MONTHS, bn } from "../lib/bangla";
import { LearnerBadge } from "../components/LearnerBadge";
import { SUBJECT_ICON } from "../screens/subjectArt";
import { Silhouette } from "../screens/TeacherSpotlight";
import { CalendarArt, ClockArt, HallArt, PlayerArt, RailsArt } from "./art";
import { tilesOf, useFitWords, type TileId } from "./Bento";
import "../styles/marksheet-card.css";

/**
 * Screen 10's card — Figma "10 Marksheet — 10 / 11" (th2CA9ugtc2BZixN4UBH3Z,
 * node 120:2007; the card is 121:4364). 385 × 558 at the 412 × 915 frame:
 * #0f1f59, radius 15, padding 16, two 174 columns, 5 gap.
 *
 *   identity (121:4365)       badge | label · type · earned tags
 *   study (121:4387, tall)    | live (121:4417)
 *                             | quiz (121:4470)
 *   video (121:4509)          | subject (121:4530)
 *   teacher (121:4547)        | best day (121:4552)
 *
 * Every illustration is the project's own asset at the Figma size (art.tsx,
 * LearnerBadge, the subject icon, the teacher portrait). The card carries no
 * name, photo, class or school, so the in-app card and the export are one.
 *
 * Class hooks `.bento`, `.bt-id`, `.bn-badge`, `.bn-type` and
 * `.bt-slot[data-row]` are what the 09 → 10 assembly (MarksheetBento) animates.
 */
// Enlarged from the Figma frame to use the screen (Nov 24): the 385 card →
// 392 (10 px side margins), every row taller, type and art up in proportion.
export const MS_W = 392;
const PAD = 12;
const GAP = 6;
const ROW_H = { id: 128, box: 126, pair: 104 };

const AREA: Record<TileId, string> = { study: "st", live: "lv", quiz: "qz", video: "vd", subject: "sb", peak: "pk", teacher: "tc" };
/** How a tile is composed in the space it was given (the Figma state is tall / box). */
type Shape = "tall" | "box" | "wide";

/**
 * The grid for exactly the chapters this student has. The full story is the
 * Figma arrangement; when chapters are absent the rows close up (never a
 * hole): study's partner grows to its full height; live + quiz share a row
 * without study; a lone card spans the row; the smaller cards pair up in
 * order and an odd one out goes wide.
 */
export function marksheetLayout(facts: MarksheetFacts) {
  const tiles = tilesOf(facts);
  const has = (t: TileId) => tiles.includes(t);
  const rows: { cells: [string, string]; h: number }[] = [];
  const shape = {} as Record<TileId, Shape>;
  const rowOf = {} as Record<TileId, "hero" | "pair">;

  const cluster = (["study", "live", "quiz"] as TileId[]).filter(has);
  cluster.forEach((t) => (rowOf[t] = "hero"));
  if (cluster.length === 3) {
    rows.push({ cells: ["st", "lv"], h: ROW_H.box }, { cells: ["st", "qz"], h: ROW_H.box });
    shape.study = "tall";
    shape.live = shape.quiz = "box";
  } else if (cluster.length === 2 && cluster[0] === "study") {
    const o = AREA[cluster[1]];
    rows.push({ cells: ["st", o], h: ROW_H.box }, { cells: ["st", o], h: ROW_H.box });
    shape.study = shape[cluster[1]] = "tall";
  } else if (cluster.length === 2) {
    rows.push({ cells: ["lv", "qz"], h: ROW_H.box });
    shape.live = shape.quiz = "box";
  } else if (cluster.length === 1) {
    rows.push({ cells: [AREA[cluster[0]], AREA[cluster[0]]], h: ROW_H.box });
    shape[cluster[0]] = "wide";
  }
  const small = (["video", "subject", "teacher", "peak"] as TileId[]).filter(has);
  small.forEach((t) => (rowOf[t] = "pair"));
  for (let i = 0; i < small.length; i += 2) {
    const [a, b] = [small[i], small[i + 1]];
    if (b) {
      rows.push({ cells: [AREA[a], AREA[b]], h: ROW_H.pair });
      shape[a] = shape[b] = "box";
    } else {
      rows.push({ cells: [AREA[a], AREA[a]], h: ROW_H.pair });
      shape[a] = "wide";
    }
  }

  // more than three earned tags wrap to a second line: the identity grows by that line
  const nTags = facts.badges.length + (facts.capstone ? 1 : 0);
  const all = [{ cells: ["id", "id"], h: ROW_H.id + (nTags > 3 ? 24 : 0) }, ...rows];
  const height = 2 * PAD + all.reduce((a, r) => a + r.h, 0) + GAP * (all.length - 1);
  return {
    tiles,
    shape,
    rowOf,
    height,
    gridTemplateAreas: all.map((r) => `"${r.cells.join(" ")}"`).join(" "),
    gridTemplateRows: all.map((r) => `${r.h}px`).join(" "),
  };
}

export function MarksheetCard({ facts, className = "", style }: { facts: MarksheetFacts; owner?: MarksheetOwner | null; className?: string; style?: CSSProperties }) {
  const L = marksheetLayout(facts);
  const ref = useRef<HTMLDivElement>(null);
  useFitWords(ref, `ms3|${L.tiles.join()}|${facts.type.id}`);
  const ROW = COPY.marksheet.rows;
  const type = LEARNER_TYPES[facts.type.id];

  const tags = [...(facts.capstone ? [{ id: "cap", name: CAPSTONE.name }] : []), ...facts.badges.map((b) => ({ id: b, name: BADGES[b].name }))];
  const identity = (
    <section className={`bt bt-id ms3-id ${facts.type.assigned ? "" : "is-plain"}`} data-tile="id" style={{ gridArea: "id" }}>
      {facts.type.assigned && (
        <div className="bn-badge ms3-badge">
          <LearnerBadge type={facts.type.id} />
        </div>
      )}
      <div className="bn-type ms3-type">
        <div className="ms3-type-head">
          <p className="ms3-type-label">{COPY.learnerType.label}</p>
          <p className="ms3-type-name">
            <span data-fit>{type.name}</span>
          </p>
        </div>
        {tags.length > 0 && (
          <ul className="ms3-tags" data-count={tags.length}>
            {tags.map((t) => (
              <li key={t.id} className={t.id === "cap" ? "is-cap" : ""}>
                {t.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );

  const card = (id: TileId, copy: ReactNode, art: ReactNode) => (
    <div key={id} className="bt-slot" data-row={L.rowOf[id]}>
      <section className={`bt ms3-t ms3-${id}`} data-tile={id} data-shape={L.shape[id]} style={{ gridArea: AREA[id] }}>
        <div className="ms3-copy">{copy}</div>
        {art && <div className="ms3-art">{art}</div>}
      </section>
    </div>
  );
  const stat = (n: string, label: string) => (
    <>
      <p className="ms3-num">
        <span data-fit>{n}</span>
      </p>
      <p className="ms3-label">{label}</p>
    </>
  );

  const render: Record<TileId, () => ReactNode> = {
    study: () => card("study", stat(bn(facts.study!.hours), `ঘণ্টা ${ROW.study}`), <ClockArt />),
    live: () => card("live", stat(`${bn(facts.live!.attended)}টি`, ROW.live), <HallArt aura={false} fromRow={2} />),
    quiz: () => card("quiz", stat(`${bn(facts.quiz!.count)}টি`, ROW.quiz), <RailsArt />),
    video: () => card("video", stat(bn(facts.video!.minutes), `মিনিট ${ROW.video}`), <PlayerArt />),
    subject: () =>
      card("subject", stat(SUBJECTS[facts.subject!.id].name, COPY.subject.prdHeadline), <img src={SUBJECT_ICON[facts.subject!.id].src} alt="" draggable={false} />),
    teacher: () =>
      card(
        "teacher",
        stat(facts.teacher!.name, COPY.teacher.framing),
        // Screen 04's chain: the cleared portrait, else its neutral bust (never a guessed face)
        facts.teacher!.portraitUrl ? <img src={facts.teacher!.portraitUrl} alt="" draggable={false} /> : <Silhouette />,
      ),
    peak: () => {
      const [, m, d] = facts.peak!.date.split("-").map(Number);
      return card("peak", stat(`${bn(d)} ${MONTHS[m - 1]}`, COPY.peakDay.prdHeadline), <CalendarArt date={facts.peak!.date} />);
    },
  };

  return (
    <div
      ref={ref}
      className={`bento ms3 ${className}`}
      data-tiles={L.tiles.join(" ")}
      style={{ width: MS_W, height: L.height, gridTemplateAreas: L.gridTemplateAreas, gridTemplateRows: L.gridTemplateRows, ...style }}
    >
      {identity}
      {L.tiles.map((id) => render[id]())}
    </div>
  );
}

/**
 * The share image (1080 × 1920): the screen's title and the card on the
 * card's own navy — nothing personal, no story controls.
 */
export const EXPORT_FRAME = { w: 1080, h: 1920 };
export function MarksheetExport({ facts }: { facts: MarksheetFacts }) {
  const s = (EXPORT_FRAME.w - 2 * 48) / MS_W;
  return (
    <div className="ms3-export" style={{ width: EXPORT_FRAME.w, height: EXPORT_FRAME.h }}>
      <div className="ms3-export-in" style={{ width: MS_W, transform: `scale(${s})` }}>
        <p className="ms3-export-title">{COPY.marksheet.title}</p>
        <MarksheetCard facts={facts} />
      </div>
    </div>
  );
}
