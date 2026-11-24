import { useRef, type CSSProperties, type ReactNode } from "react";
import { BADGES, CAPSTONE, COPY, LEARNER_TYPES, SUBJECTS } from "../data/copy";
import type { MarksheetFacts, MarksheetOwner } from "../data/compose";
import { MONTHS, bn } from "../lib/bangla";
import { LearnerBadge } from "../components/LearnerBadge";
import { SUBJECT_ICON } from "../screens/subjectArt";
import { Silhouette } from "../screens/TeacherSpotlight";
import { ClockArt, RailsArt } from "./art";
import { SeatsArt, WatchArt, WeekArt } from "./art2";
import { CARD_H, CARD_W, tilesOf, useFitWords, type TileId } from "./Bento";
import "../styles/bento-v2.css";

/**
 * Marksheet V2 — "Refined Bento" (Nov 24). Two looks on one architecture:
 *   a  Bold Graphic       deep navy ground, confident flat colour per tile
 *   b  Refined Editorial  pale paper ground, light tinted tiles, one dark anchor
 *
 * 1080 × 1920, a six-column grid: 42 outer margin, 21 gutter, 42 radius,
 * 36 tile padding (14 / 7 / 14 / 12 at a 360-wide card). Reading order:
 *   identity header → learner type (featured) → study (tall) beside live +
 *   quiz → video (wide) → subject + peak day → teacher (wide) → footer.
 * Absent chapters are never shown as holes: the rows rebalance (see layoutV2).
 *
 * PRIVACY: `owner` (photo, name, class, group) is for the private in-app card
 * only. The export renders this card WITHOUT `owner` — the header becomes the
 * Wrap ২০২৬ title; nothing personal, no empty avatar.
 */
export type V2Look = "a" | "b";

/** One chapter tile's shape in the grid — each tile composes itself for it. */
type Shape = "tall" | "box" | "wide";
type Row = { areas: string[]; w: number };

const ROW = COPY.marksheet.rows;
const AREA: Record<TileId, string> = { study: "st", live: "lv", quiz: "qz", video: "vd", subject: "sb", peak: "pk", teacher: "tc" };

const HEAD_H = 156;
const FOOT_H = 58;
/** Outer margin and gutter per look (kept in step with bento-v2.css). */
const SPACING: Record<V2Look, { pad: number; gap: number }> = { a: { pad: 42, gap: 21 }, b: { pad: 46, gap: 24 } };
/** The most a chapter row grows per unit of weight; what's left goes to the learner-type tile. */
const MAX_PER_W = 380;

/**
 * Grid rows for exactly the chapters this student has. Each row has a weight;
 * rows share the card's height by weight, up to MAX_PER_W each, and the
 * featured learner-type tile absorbs the rest — so a short story gets larger
 * tiles and a bigger identity moment, never empty slots or filler.
 *   cluster   study + live + quiz: study tall on the left, the two stacked;
 *             with two of them, a 3 + 3 row; with one, it goes wide
 *   video     always wide
 *   pair      subject + peak, 3 + 3; alone, it goes wide
 *   teacher   always wide
 */
export function layoutV2(tiles: TileId[], typeAssigned: boolean, look: V2Look = "a") {
  const { pad: PAD, gap: GAP } = SPACING[look];
  const has = (t: TileId) => tiles.includes(t);
  const rows: Row[] = [];
  const shape = {} as Record<TileId, Shape>;
  const six = (a: string) => Array(6).fill(a);
  const pair = (a: TileId, b: TileId) => [...Array(3).fill(AREA[a]), ...Array(3).fill(AREA[b])];

  const cluster = (["study", "live", "quiz"] as TileId[]).filter(has);
  if (cluster.length === 3) {
    rows.push({ areas: [...Array(3).fill("st"), ...Array(3).fill("lv")], w: 1.1 });
    rows.push({ areas: [...Array(3).fill("st"), ...Array(3).fill("qz")], w: 1.1 });
    shape.study = "tall";
    shape.live = shape.quiz = "box";
  } else if (cluster.length === 2) {
    rows.push({ areas: pair(cluster[0], cluster[1]), w: cluster[0] === "study" ? 1.45 : 1.15 });
    cluster.forEach((t) => (shape[t] = "box"));
  } else if (cluster.length === 1) {
    rows.push({ areas: six(AREA[cluster[0]]), w: 0.95 });
    shape[cluster[0]] = "wide";
  }
  if (has("video")) {
    rows.push({ areas: six("vd"), w: 0.8 });
    shape.video = "wide";
  }
  if (has("subject") && has("peak")) {
    rows.push({ areas: pair("subject", "peak"), w: 1.08 });
    shape.subject = shape.peak = "box";
  } else {
    for (const t of ["subject", "peak"] as TileId[])
      if (has(t)) {
        rows.push({ areas: six(AREA[t]), w: 0.78 });
        shape[t] = "wide";
      }
  }
  if (has("teacher")) {
    rows.push({ areas: six("tc"), w: 0.86 });
    shape.teacher = "wide";
  }

  const nRows = rows.length + 3; // + header, type, footer
  const free = CARD_H - 2 * PAD - HEAD_H - FOOT_H - (nRows - 1) * GAP;
  const typeW = typeAssigned ? 1.36 : 0.8;
  const totalW = rows.reduce((a, r) => a + r.w, 0) + typeW;
  const per = Math.min(free / totalW, MAX_PER_W);
  const line = (cells: string[]) => `"${cells.join(" ")}"`;
  return {
    shape,
    gridTemplateAreas: [line(six("hd")), line(six("lt")), ...rows.map((r) => line(r.areas)), line(six("ft"))].join(" "),
    gridTemplateRows: [`${HEAD_H}px`, "minmax(0, 1fr)", ...rows.map((r) => `${Math.round(r.w * per)}px`), `${FOOT_H}px`].join(" "),
  };
}

/** The first written character of a Bengali (or any) name — a whole grapheme, with its vowel signs. */
function initialOf(name: string) {
  const seg = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter("bn", { granularity: "grapheme" }) : null;
  return seg ? ([...seg.segment(name)][0]?.segment ?? "") : [...name][0] ?? "";
}

export function BentoV2Card({
  facts,
  owner,
  look,
  className = "",
  style,
}: {
  facts: MarksheetFacts;
  /** In-app only. Leave out for the export. */
  owner?: MarksheetOwner | null;
  look: V2Look;
  className?: string;
  style?: CSSProperties;
}) {
  const tiles = tilesOf(facts);
  const ref = useRef<HTMLDivElement>(null);
  const who = owner?.name ? owner : null;
  useFitWords(ref, `v2${look}|${tiles.join()}|${facts.type.id}|${who?.name ?? ""}`);
  const grid = layoutV2(tiles, facts.type.assigned, look);
  const t = LEARNER_TYPES[facts.type.id];
  const logo = look === "b" ? "/assets/brand/shikho-logo.svg" : "/assets/brand/shikho-logo-white.png";

  const classLine = who ? [who.className && `${who.className} শ্রেণি`, who.group && `${who.group} বিভাগ`].filter(Boolean).join(", ") : "";
  const header = who ? (
    <header className="v2-hd is-owner" style={{ gridArea: "hd" }}>
      <div className="v2-ava">
        {who.photoUrl ? <img src={who.photoUrl} alt="" draggable={false} /> : <span className="v2-ava-initial">{initialOf(who.name!)}</span>}
      </div>
      <div className="v2-who">
        {/* a long name wraps to two lines at a smaller size instead of shrinking to fit one */}
        {[...who.name!].length > 16 ? (
          <p className="v2-name is-long">{who.name}</p>
        ) : (
          <p className="v2-name">
            <span data-fit>{who.name}</span>
          </p>
        )}
        {classLine && <p className="v2-class">{classLine}</p>}
      </div>
      <div className="v2-brand">
        <img className="v2-logo" src={logo} alt="Shikho" draggable={false} />
        <span className="v2-wrap">
          Wrap <b>২০২৬</b>
        </span>
      </div>
    </header>
  ) : (
    <header className="v2-hd is-brand" style={{ gridArea: "hd" }}>
      <h1 className="v2-title">
        তোমার <b>২০২৬</b>, এক খাতায়
      </h1>
      <div className="v2-brand">
        <img className="v2-logo" src={logo} alt="Shikho" draggable={false} />
        <span className="v2-wrap">Wrap</span>
      </div>
    </header>
  );

  const earned = facts.capstone || facts.badges.length > 0;
  const typeTile = (
    <section className={`v2-t v2-type ${facts.type.assigned ? "" : "is-plain"}`} data-tile="type" style={{ gridArea: "lt" }}>
      <div className="v2-type-in">
      {facts.type.assigned && (
        <div className="v2-badge">
          <LearnerBadge type={facts.type.id} />
        </div>
      )}
      <div className="v2-type-copy">
        <p className="v2-type-name">
          <span data-fit>{t.name}</span>
        </p>
        <p className="v2-type-label">{COPY.learnerType.label}</p>
        {earned && (
          <ul className="v2-chips" aria-label={ROW.badges}>
            {facts.capstone && <li className="v2-chip is-cap">{CAPSTONE.name}</li>}
            {facts.badges.map((b) => (
              <li key={b} className="v2-chip">
                {BADGES[b].name}
              </li>
            ))}
          </ul>
        )}
      </div>
      </div>
    </section>
  );

  const tile = (id: TileId, copy: ReactNode, art: ReactNode) => (
    <section key={id} className={`v2-t v2-${id}`} data-tile={id} data-shape={grid.shape[id]} style={{ gridArea: AREA[id] }}>
      <div className="v2-copy">{copy}</div>
      {art && <div className="v2-art">{art}</div>}
    </section>
  );
  /** A figure: the number, its unit (টি sits tight), then what it counts. */
  const fig = (n: string, unit: string, label: string) => (
    <>
      <p className="v2-fig">
        <span className="v2-n">{n}</span>
        <span className={`v2-u ${unit === "টি" ? "is-tight" : ""}`}>{unit}</span>
      </p>
      <p className="v2-l">{label}</p>
    </>
  );
  /** A word figure (a subject, a date, a name): one line, fitted. */
  const word = (w: string, label: string) => (
    <>
      <p className="v2-w">
        <span data-fit>{w}</span>
      </p>
      <p className="v2-l">{label}</p>
    </>
  );

  const render: Record<TileId, () => ReactNode> = {
    study: () => tile("study", fig(bn(facts.study!.hours), "ঘণ্টা", ROW.study), <ClockArt />),
    live: () => tile("live", fig(bn(facts.live!.attended), "টি", ROW.live), <SeatsArt />),
    quiz: () => tile("quiz", fig(bn(facts.quiz!.count), "টি", ROW.quiz), <RailsArt />),
    video: () => tile("video", fig(bn(facts.video!.minutes), "মিনিট", ROW.video), <WatchArt />),
    subject: () =>
      tile("subject", word(SUBJECTS[facts.subject!.id].name, COPY.subject.prdHeadline), <img src={SUBJECT_ICON[facts.subject!.id].src} alt="" draggable={false} />),
    peak: () => {
      const [, m, d] = facts.peak!.date.split("-").map(Number);
      return tile("peak", word(`${bn(d)} ${MONTHS[m - 1]}`, COPY.peakDay.prdHeadline), <WeekArt date={facts.peak!.date} />);
    },
    teacher: () =>
      tile(
        "teacher",
        word(facts.teacher!.name, COPY.teacher.framing),
        // Screen 04's fallback chain: the cleared portrait, else its neutral bust (never a guessed face)
        <>
          <i className="v2-beam" />
          {facts.teacher!.portraitUrl ? (
            <img className="v2-portrait" src={facts.teacher!.portraitUrl} alt="" draggable={false} />
          ) : (
            <div className="v2-portrait is-bust">
              <Silhouette />
            </div>
          )}
        </>,
      ),
  };

  return (
    <div
      ref={ref}
      className={`v2 v2-${look} ${who ? "is-private" : "is-export"} ${className}`}
      data-tiles={tiles.join(" ")}
      style={{ width: CARD_W, height: CARD_H, gridTemplateAreas: grid.gridTemplateAreas, gridTemplateRows: grid.gridTemplateRows, ...style }}
    >
      {header}
      {typeTile}
      {tiles.map((id) => render[id]())}
      <footer className="v2-ft" style={{ gridArea: "ft" }}>
        {COPY.marksheet.closing}
      </footer>
    </div>
  );
}
