import { COPY } from "../data/copy";
import { AssetPlaceholder, ShikhoMark } from "../components/primitives";
import { Entrance } from "../components/Entrance";
import { JournalField, JournalFieldRow, JournalLabel } from "../components/JournalLabel";
import { MOTION } from "../lib/motion";
import type { ScreenProps } from "./types";

const T = MOTION.entrance.cover;

/** Name length (in grapheme-ish code points) at which the label steps the name down. */
const LONG = 16;
const VERY_LONG = 28;

/**
 * 01 — Personalised cover. "This is theirs — the name is the hero." (V2)
 *
 * Composition: mark top-left; the mascot fills the open band above the
 * title; the headline and a large gold ২০২৬ carry the year; the student's
 * journal label carries the name. Two focal points by two different means: the year by scale,
 * the name by being the only paper surface on the board.
 *
 * Edges (V2): no name → no name field (never "null"); class/group are
 * separate fields and an empty one is omitted; no fields at all → no label.
 * No buttons (01–08 rule).
 */
export function Cover({ slide }: ScreenProps<"cover">) {
  const { name, className, group } = slide;
  const len = name ? [...name].length : 0;
  const nameSize = len > VERY_LONG ? "cover-name-xs" : len > LONG ? "cover-name-sm" : "";
  const hasLabel = Boolean(name || className || group);
  const L = COPY.cover.labels;

  return (
    <div className="slide cover">
      <div className="cover-top">
        <ShikhoMark size={40} />
      </div>

      {/* Mascot owns the open band above the title; it shrinks first on short screens
          and never overlaps text. Missing asset → labelled placeholder, never a drawing. */}
      <div className="cover-figure">
        <div className="cover-figure-slot">
          <AssetPlaceholder label="Shikho 3D mascot · cover pose" />
        </div>
      </div>

      <div className="cover-main">
        <Entrance at={T.year} className="cover-title">
          <p className="cover-headline">{COPY.cover.headline}</p>
          <p className="cover-year" aria-label={COPY.cover.year}>
            {COPY.cover.year}
          </p>
        </Entrance>

        {hasLabel && (
          <Entrance at={T.label}>
            <JournalLabel className="cover-label">
              {name && (
                <JournalField label={L.name} size="xl">
                  <Entrance at={T.name} kind="write" className={`cover-name ${nameSize}`}>
                    {name}
                  </Entrance>
                </JournalField>
              )}
              {(className || group) && (
                <Entrance at={name ? T.details : T.label} kind="fade">
                  <JournalFieldRow>
                    {className && <JournalField label={L.className}>{className}</JournalField>}
                    {group && <JournalField label={L.group}>{group}</JournalField>}
                  </JournalFieldRow>
                </Entrance>
              )}
            </JournalLabel>
          </Entrance>
        )}
      </div>

      <Entrance at={T.details} kind="fade" className="cover-foot">
        <p className="cover-support">{COPY.cover.support}</p>
      </Entrance>
    </div>
  );
}
