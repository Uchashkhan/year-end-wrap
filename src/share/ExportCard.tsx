import { COPY, LEARNER_TYPES } from "../data/copy";
import type { BadgeId, MarksheetRow } from "../data/compose";
import type { LearnerTypeId } from "../data/types";
import { BadgePill, CapstonePill, ShikhoMark } from "../components/primitives";

/**
 * Exported share image, 1080×1920. Rendered at native size and scaled for preview.
 *
 * PRIVACY (V2 rule 5, PRD fixed): this component has no name / photo / school /
 * rank props — it physically can't render them. Do not add them.
 */
export type ExportCardProps =
  | { kind: "type"; type: LearnerTypeId; reason: string }
  | { kind: "marksheet"; type: LearnerTypeId; rows: MarksheetRow[]; badges: BadgeId[]; capstone: boolean };

export const EXPORT_W = 1080;
export const EXPORT_H = 1920;

export function ExportCard(props: ExportCardProps) {
  return (
    <div className="export" style={{ width: EXPORT_W, height: EXPORT_H }}>
      <div className="export-head">
        <ShikhoMark size={120} />
        <span className="export-year">২০২৬</span>
      </div>
      {props.kind === "type" ? (
        <div className="export-body">
          <p className="export-label">{COPY.learnerType.label}</p>
          <p className="export-type">{LEARNER_TYPES[props.type].name}</p>
          <p className="export-reason">{props.reason}</p>
        </div>
      ) : (
        <div className="export-body">
          <p className="export-label">{COPY.marksheet.headline}</p>
          <p className="export-type">{LEARNER_TYPES[props.type].name}</p>
          <dl className="export-rows">
            {props.rows.map((r) => (
              <div key={r.key} className="export-row">
                <dt>{COPY.marksheet.rows[r.key]}</dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>
          {(props.capstone || props.badges.length > 0) && (
            <div className="export-badges">
              {props.capstone && <CapstonePill />}
              {props.badges.map((b) => (
                <BadgePill key={b} id={b} />
              ))}
            </div>
          )}
        </div>
      )}
      <p className="export-foot">shikho.com</p>
    </div>
  );
}
