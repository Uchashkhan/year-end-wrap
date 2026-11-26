import { useRef, type CSSProperties, type ReactNode } from "react";
import { COPY, LEARNER_TYPES, SUBJECTS } from "../data/copy";
import type { MarksheetFacts, MarksheetOwner } from "../data/compose";
import { MONTHS, bn } from "../lib/bangla";
import { LearnerBadge } from "../components/LearnerBadge";
import { SUBJECT_ICON } from "../screens/subjectArt";
import { Silhouette } from "../screens/TeacherSpotlight";
import { CalendarArt, ClockArt, HallArt, PlayerArt, RailsArt } from "./art";
import { BADGE_ART, type BadgeArtId } from "../data/badgeArt";
import { BadgeReveal } from "../components/primitives";
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

// ── earned badges (finalized artwork, data/badgeArt.ts) ──
/** Height of each badge's artwork in the identity tile (card px; ≈ 120 px in the 1080 export). */
const TAG_ART_H = 44;
const TAG_GAP = 4;
/** Story: the earned badges land one after another (s). */
const TAG_STAGGER = 0.24;
/** The type column's width in card px (identity tile minus the learner badge), where the badges wrap. */
const TAG_COL_W = 221;
/** One line of the former text chips (the identity row was sized for it). */
const TAG_TEXT_LINE = 22;
function earnedArt(f: MarksheetFacts): BadgeArtId[] {
  return [...(f.capstone ? (["capstone"] as const) : []), ...f.badges];
}
/** Extra identity height for the badge lines (greedy wrap at the art's own widths). */
function tagGrowth(ids: BadgeArtId[]): number {
  if (!ids.length) return 0;
  let lines = 1;
  let x = 0;
  for (const id of ids) {
    const w = (BADGE_ART[id].width / BADGE_ART[id].height) * TAG_ART_H;
    if (x > 0 && x + TAG_GAP + w > TAG_COL_W) {
      lines++;
      x = w;
    } else x += (x > 0 ? TAG_GAP : 0) + w;
  }
  return lines * TAG_ART_H + (lines - 1) * TAG_GAP - TAG_TEXT_LINE;
}
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

  // the earned badges' artwork wraps under the type; the identity grows by the lines beyond one text line
  const all = [{ cells: ["id", "id"], h: ROW_H.id + tagGrowth(earnedArt(facts)) }, ...rows];
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

export function MarksheetCard({
  facts,
  className = "",
  style,
  badgesLandAt,
}: {
  facts: MarksheetFacts;
  owner?: MarksheetOwner | null;
  className?: string;
  style?: CSSProperties;
  /** Story only: when the first earned badge lands (s from mount); the rest follow one by one. The export omits it (static art). */
  badgesLandAt?: number;
}) {
  const L = marksheetLayout(facts);
  const ref = useRef<HTMLDivElement>(null);
  useFitWords(ref, `ms3|${L.tiles.join()}|${facts.type.id}`);
  const ROW = COPY.marksheet.rows;
  const type = LEARNER_TYPES[facts.type.id];

  const tags = earnedArt(facts);
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
          <ul className="ms3-tags ms3-tags-art" data-count={tags.length} aria-label={tags.map((t) => BADGE_ART[t].name).join(", ")}>
            {tags.map((t, i) => (
              <li key={t}>
                <BadgeReveal id={t} height={TAG_ART_H} decorative landAt={badgesLandAt == null ? undefined : badgesLandAt + i * TAG_STAGGER} amplitude={2} />
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
