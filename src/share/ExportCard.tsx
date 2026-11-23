import { COPY, LEARNER_TYPES } from "../data/copy";
import type { MarksheetFacts } from "../data/compose";
import { BentoCard } from "../marksheet/Bento";
import type { LearnerTypeId } from "../data/types";
import { ShikhoMark } from "../components/primitives";

/**
 * Exported share image, 1080×1920. Rendered at native size and scaled for preview.
 *
 * PRIVACY (V2 rule 5, PRD fixed): this component has no name / photo / school /
 * rank props — it physically can't render them. Do not add them.
 */
export type ExportCardProps =
  | { kind: "type"; type: LearnerTypeId; reason: string }
  | { kind: "marksheet"; facts: MarksheetFacts };

export const EXPORT_W = 1080;
export const EXPORT_H = 1920;

export function ExportCard(props: ExportCardProps) {
  // Screen 10's card is the marksheet export: the same component, at native size.
  if (props.kind === "marksheet") return <BentoCard facts={props.facts} variant="a" />;
  return (
    <div className="export" style={{ width: EXPORT_W, height: EXPORT_H }}>
      <div className="export-head">
        <ShikhoMark size={120} />
        <span className="export-year">২০২৬</span>
      </div>
      <div className="export-body">
        <p className="export-label">{COPY.learnerType.label}</p>
        <p className="export-type">{LEARNER_TYPES[props.type].name}</p>
        <p className="export-reason">{props.reason}</p>
      </div>
      <p className="export-foot">shikho.com</p>
    </div>
  );
}
