import { STAGGER_REF, TEXT } from "./reference";

const climb = 3.6;
const headline = climb + 0.53;
const year = headline + STAGGER_REF.line;
const support = year + 0.16;
const cta = support + 0.16;

export const BIRD_COVER = {
  climb,
  cornerDigits: { at: climb, duration: 0.78 },
  headline: { at: headline, duration: TEXT.up.dur },
  year: { at: year, duration: TEXT.up.dur },
  support: { at: support, duration: TEXT.fade.dur },
  cta: { at: cta, duration: TEXT.fade.dur },
  end: cta + TEXT.fade.dur,
} as const;
