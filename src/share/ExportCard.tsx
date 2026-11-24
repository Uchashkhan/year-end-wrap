import { COPY, LEARNER_TYPES } from "../data/copy";
import type { MarksheetFacts } from "../data/compose";
import { MarksheetExport } from "../marksheet/MarksheetCard";
import { BentoV2Card } from "../marksheet/BentoV2";
import type { MarksheetDesign } from "../marksheet/design";
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
  | { kind: "marksheet"; facts: MarksheetFacts; design?: MarksheetDesign };

export const EXPORT_W = 1080;
export const EXPORT_H = 1920;

export function ExportCard(props: ExportCardProps) {
  // Screen 10's card is the marksheet export: the same component, at native size.
  // Marksheet V2 (dev comparison) exports its own design WITHOUT the owner: no photo, name, class or group.
  if (props.kind === "marksheet")
    return props.design === "v2a" || props.design === "v2b" ? <BentoV2Card facts={props.facts} look={props.design === "v2a" ? "a" : "b"} /> : <MarksheetExport facts={props.facts} />;
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
