/** 10 · 11 · Fresh Start. */
import { COPY, LEARNER_TYPES } from "../data/copy";
import { Actions, BadgePill, CapstonePill, ShikhoMark, Stamp } from "../components/primitives";
import type { ScreenProps } from "./types";

/**
 * 10 — in-app marksheet (private view: name allowed).
 * The exported card is a separate component (share/ExportCard) that cannot
 * receive a name — privacy enforced by its props, not by convention.
 */
export function Marksheet({ slide, actions }: ScreenProps<"marksheet">) {
  return (
    <div className="slide slide-split">
      <div className="slide-body">
        <div className="sheet">
          <div className="sheet-head">
            <ShikhoMark size={28} />
            <span className="sheet-year">২০২৬</span>
          </div>
          <p className="sheet-title">{COPY.marksheet.headline}</p>
          {slide.name && <p className="sheet-name">{slide.name}</p>}
          <div className="sheet-type">
            <Stamp name={LEARNER_TYPES[slide.type].name} size="sm" />
          </div>
          <dl className="sheet-rows">
            {slide.rows.map((r) => (
              <div key={r.key} className="sheet-row">
                <dt>{COPY.marksheet.rows[r.key]}</dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>
          {(slide.capstone || slide.badges.length > 0) && (
            <div className="badge-row badge-row-left">
              {slide.capstone && <CapstonePill />}
              {slide.badges.map((b) => (
                <BadgePill key={b} id={b} />
              ))}
            </div>
          )}
        </div>
        <p className="privacy-note">{COPY.marksheet.privacy}</p>
      </div>
      <div className="slide-foot">
        <Actions
          primary={{ label: COPY.marksheet.primary, onClick: () => actions.share("marksheet") }}
          secondary={{ label: COPY.marksheet.secondary, onClick: actions.next }}
        />
      </div>
    </div>
  );
}

export function Close({ actions }: ScreenProps<"close">) {
  return (
    <div className="slide slide-split">
      <div className="slide-body stack-center">
        <p className="display display-lines">
          <span>{COPY.close.line[0]}</span>
          <span>{COPY.close.line[1]}</span>
        </p>
      </div>
      <div className="slide-foot">
        <Actions
          primary={{ label: COPY.close.primary, onClick: actions.exitToHome }}
          secondary={{ label: COPY.close.secondary, onClick: () => actions.share("marksheet") }}
        />
      </div>
    </div>
  );
}

export function FreshCover(_: ScreenProps<"freshCover">) {
  return (
    <div className="slide slide-center">
      <div className="slide-mark">
        <ShikhoMark size={44} />
      </div>
      <p className="display">{COPY.freshStart.cover}</p>
    </div>
  );
}

export function FreshClose({ actions }: ScreenProps<"freshClose">) {
  return (
    <div className="slide slide-split">
      <div className="slide-body stack-center">
        <p className="display display-lines">
          <span>{COPY.freshStart.close[0]}</span>
          <span>{COPY.freshStart.close[1]}</span>
        </p>
      </div>
      <div className="slide-foot">
        {/* V2: primary only — nothing to share here. */}
        <Actions primary={{ label: COPY.freshStart.primary, onClick: actions.exitToHome }} />
      </div>
    </div>
  );
}
