import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { BADGES, CAPSTONE, COPY, LEARNER_TYPES, SUBJECTS } from "../data/copy";
import type { MarksheetFacts } from "../data/compose";
import { MONTHS, bn } from "../lib/bangla";
import { LearnerBadge } from "../components/LearnerBadge";
import { SUBJECT_ICON } from "../screens/subjectArt";
import { CalendarArt, ClockArt, HallArt, PlayerArt, RailsArt } from "./art";
import "../styles/bento.css";

/** The card's native size: the share export. The in-app view scales the same card. */
export const CARD_W = 1080;
export const CARD_H = 1920;

export type BentoVariant = "a" | "b" | "c";

export type TileId = "study" | "live" | "quiz" | "video" | "subject" | "peak" | "teacher";

/** Which chapter tiles this student has, in story order. */
export function tilesOf(f: MarksheetFacts): TileId[] {
  const out: TileId[] = [];
  if (f.study) out.push("study");
  if (f.live) out.push("live");
  if (f.teacher) out.push("teacher");
  if (f.quiz) out.push("quiz");
  if (f.video) out.push("video");
  if (f.subject) out.push("subject");
  if (f.peak) out.push("peak");
  return out;
}

const ROW = COPY.marksheet.rows;

const CODE: Record<TileId, string> = { study: "st", live: "lv", quiz: "qz", video: "vd", subject: "sb", peak: "pk", teacher: "tc" };
const MAJOR: TileId[] = ["live", "quiz", "video"];

/**
 * Direction A's grid for whatever chapters this student has (no empty tiles,
 * no fillers). Six columns:
 *   identity   the first row; it takes every pixel the chapters don't (1fr),
 *              and a tall identity tile becomes the centred medal layout
 *   stickers   a strip, only when badges were genuinely earned
 *   hero       study (the clock) tall on the left beside two major chapters,
 *              or beside one, or across the row when it's alone
 *   pairs      the rest, two to a row; the subject is happy narrow (2 + 4),
 *              everything else splits 3 + 3; a lone tile spans the row
 */
export function layoutA(tiles: TileId[], strip: boolean) {
  const rows: { areas: string; h: number; kind: "hero" | "pair" }[] = [];
  const rowOf = {} as Record<TileId, "hero" | "pair">;
  let rest = tiles.filter((t) => t !== "study");
  const line = (cells: string[]) => `"${cells.join(" ")}"`;
  if (tiles.includes("study")) {
    const ms = rest.filter((t) => MAJOR.includes(t)).slice(0, 2);
    rest = rest.filter((t) => !ms.includes(t));
    rowOf.study = "hero";
    ms.forEach((m) => (rowOf[m] = "hero"));
    if (ms.length === 2) {
      rows.push({ areas: line(["st", "st", "st", CODE[ms[0]], CODE[ms[0]], CODE[ms[0]]]), h: 310, kind: "hero" });
      rows.push({ areas: line(["st", "st", "st", CODE[ms[1]], CODE[ms[1]], CODE[ms[1]]]), h: 310, kind: "hero" });
    } else if (ms.length === 1) {
      rows.push({ areas: line(["st", "st", "st", CODE[ms[0]], CODE[ms[0]], CODE[ms[0]]]), h: 360, kind: "hero" });
    } else {
      rows.push({ areas: line(Array(6).fill("st")), h: 360, kind: "hero" });
    }
  }
  while (rest.length) {
    const a = rest.shift()!;
    const b = rest.shift();
    rowOf[a] = "pair";
    if (!b) {
      rows.push({ areas: line(Array(6).fill(CODE[a])), h: 236, kind: "pair" });
      break;
    }
    rowOf[b] = "pair";
    const [wa, wb] = a === "subject" ? [2, 4] : b === "subject" ? [4, 2] : [3, 3];
    rows.push({ areas: line([...Array(wa).fill(CODE[a]), ...Array(wb).fill(CODE[b])]), h: 236, kind: "pair" });
  }
  const areas = [line(Array(6).fill("id")), ...(strip ? [line(Array(6).fill("bd"))] : []), ...rows.map((r) => r.areas), line(Array(6).fill("ft"))];
  // The identity absorbs what the chapters leave (its contents scale with it);
  // the sticker strip takes one or two lines as the earned badges need.
  const heights = ["minmax(380px, 1fr)", ...(strip ? ["auto"] : []), ...rows.map((r) => `${r.h}px`), "60px"];
  return { gridTemplateAreas: areas.join(" "), gridTemplateRows: heights.join(" "), rowOf };
}

/**
 * Words that must stay on one line (a subject, a name, a date, a type) are
 * fitted to their box: measured at their design size and scaled down only if
 * they would overflow. Runs again once the Bengali face has loaded.
 */
export function useFitWords(root: React.RefObject<HTMLDivElement | null>, key: string) {
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const fit = () =>
      el.querySelectorAll<HTMLElement>("[data-fit]").forEach((w) => {
        w.style.fontSize = "";
        const box = w.parentElement!;
        const max = box.clientWidth - parseFloat(getComputedStyle(box).paddingLeft) - parseFloat(getComputedStyle(box).paddingRight);
        const need = w.scrollWidth;
        if (need > max && max > 0) w.style.fontSize = `${Math.floor(parseFloat(getComputedStyle(w).fontSize) * (max / need) * 0.98)}px`;
      });
    fit();
    document.fonts?.ready.then(fit);
  }, [root, key]);
}

/**
 * Screen 10's card — "তোমার ২০২৬, এক খাতায়" — as a bento of the year's chapters.
 * Each tile brings back its chapter's own illustration (art.tsx) and figure; the
 * learner identity is the centrepiece. Built from MarksheetFacts only: it has
 * no name / photo / school / rank input, so the export cannot carry them.
 * Tiles exist only for chapters the student's story actually had.
 */
export function BentoCard({ facts, variant = "a", className = "", style }: { facts: MarksheetFacts; variant?: BentoVariant; className?: string; style?: CSSProperties }) {
  const tiles = tilesOf(facts);
  const ref = useRef<HTMLDivElement>(null);
  useFitWords(ref, `${variant}|${tiles.join()}|${facts.type.id}`);
  const t = LEARNER_TYPES[facts.type.id];
  const hasBadges = facts.capstone || facts.badges.length > 0;
  const year = (
    <h1 className="bn-head">
      <span className="bn-head-a">তোমার</span>
      <span className="bn-head-year">২০২৬,</span>
      <span className="bn-head-b">এক খাতায়</span>
    </h1>
  );
  const badges = hasBadges ? (
    <div className="bn-stickers">
      {facts.capstone && <span className="bn-sticker bn-sticker-cap">{CAPSTONE.name}</span>}
      {facts.badges.map((b) => (
        <span key={b} className="bn-sticker">
          {BADGES[b].name}
        </span>
      ))}
    </div>
  ) : null;
  const identity = (
    <section className={`bt bt-id ${facts.type.assigned ? "" : "is-plain"}`} data-tile="id">
      {variant !== "b" && year}
      {facts.type.assigned && (
        <div className="bn-badge">
          <LearnerBadge type={facts.type.id} />
        </div>
      )}
      <div className="bn-type">
        <span className="bn-type-name" data-fit>
          {t.name}
        </span>
        <span className="bn-type-label">{COPY.learnerType.label}</span>
      </div>
      {variant === "b" && badges}
    </section>
  );
  const grid = variant === "a" ? layoutA(tiles, !!badges) : null;

  const tile: Record<TileId, () => ReactNode> = {
    study: () => (
      <Tile id="study" art={<ClockArt />}>
        <Figure n={bn(facts.study!.hours)} unit={`ঘণ্টা ${ROW.study}`} />
      </Tile>
    ),
    live: () => (
      <Tile id="live" art={<HallArt />}>
        <Figure n={`${bn(facts.live!.attended)}টি`} unit={ROW.live} />
      </Tile>
    ),
    quiz: () => (
      <Tile id="quiz" art={<RailsArt />}>
        <Figure n={`${bn(facts.quiz!.count)}টি`} unit={ROW.quiz} />
      </Tile>
    ),
    video: () => (
      <Tile id="video" art={<PlayerArt />}>
        <Figure n={bn(facts.video!.minutes)} unit={`মিনিট ${ROW.video}`} />
      </Tile>
    ),
    subject: () => (
      <Tile id="subject" art={<img src={SUBJECT_ICON[facts.subject!.id].src} alt="" draggable={false} />}>
        <Figure n={SUBJECTS[facts.subject!.id].name} unit={COPY.subject.prdHeadline} word />
      </Tile>
    ),
    peak: () => {
      const [, m, d] = facts.peak!.date.split("-").map(Number);
      return (
        <Tile id="peak" art={<CalendarArt date={facts.peak!.date} />}>
          <Figure n={`${bn(d)} ${MONTHS[m - 1]}`} unit={COPY.peakDay.prdHeadline} word />
        </Tile>
      );
    },
    teacher: () => (
      <Tile id="teacher" art={facts.teacher!.portraitUrl ? <img src={facts.teacher!.portraitUrl} alt="" draggable={false} /> : null}>
        <Figure n={facts.teacher!.name} unit={COPY.teacher.framing} word />
      </Tile>
    ),
  };

  return (
    <div
      ref={ref}
      className={`bento bento-${variant} ${className}`}
      data-tiles={tiles.join(" ")}
      data-count={tiles.length}
      style={{ width: CARD_W, height: CARD_H, ...(grid ? { gridTemplateAreas: grid.gridTemplateAreas, gridTemplateRows: grid.gridTemplateRows } : {}), ...style }}
    >
      {variant === "c" && <i className="bn-rules" aria-hidden="true" />}
      {variant === "b" && (
        <header className="bn-top">
          <img className="bn-logo" src="/assets/brand/shikho-logo-white.png" alt="Shikho" />
          {year}
        </header>
      )}
      {identity}
      {variant === "a" && badges && (
        <div className="bn-strip" data-tile="stickers">
          {badges}
        </div>
      )}
      {tiles.map((id) => (
        <div key={id} className="bt-slot" data-row={grid?.rowOf[id] ?? ""} style={{ gridArea: CODE[id] }}>
          {tile[id]()}
        </div>
      ))}
      {variant === "c" && badges && <section className="bt bt-stickers" data-tile="stickers">{badges}</section>}
      <footer className="bn-foot">
        {variant !== "b" && <img className="bn-logo" src={variant === "c" ? "/assets/brand/shikho-logo.svg" : "/assets/brand/shikho-logo-white.png"} alt="Shikho" />}
        <span className="bn-close">{COPY.marksheet.closing}</span>
      </footer>
    </div>
  );
}


function Tile({ id, art, children }: { id: TileId; art: ReactNode; children: ReactNode }) {
  return (
    <section className={`bt bt-${id}`} data-tile={id} style={{ gridArea: CODE[id] }}>
      {art && <div className="bt-art">{art}</div>}
      <div className="bt-copy">{children}</div>
    </section>
  );
}

/** The figure first, then what it counts (no label above it). */
function Figure({ n, unit, word = false }: { n: string; unit: string; word?: boolean }) {
  return (
    <>
      <span className={word ? "bt-word" : "bt-num"} data-fit>
        {n}
      </span>
      <span className="bt-unit">{unit}</span>
    </>
  );
}
