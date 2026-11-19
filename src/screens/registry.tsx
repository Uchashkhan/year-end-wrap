import type { Slide } from "../data/compose";
import { Cover } from "./Cover";
import { CoverGeo } from "./CoverGeo";
import { CoverFigma } from "./CoverFigma";
import { StudyGeo } from "./StudyGeo";
import { StudyClock } from "./StudyClock";
import { LiveClass } from "./LiveClass";
import { useCoverVariant } from "../explore/variant";
import { CoverTypographic } from "../explore/CoverTypographic";
import { CoverGeometry } from "../explore/CoverGeometry";
import { CoverEditorial } from "../explore/CoverEditorial";
import { CoverUnfolded } from "../explore/CoverUnfolded";
import { Attendance, Quiz, Video } from "./StatScreens";
import { PeakDay, Subject, Teacher } from "./RevealScreens";
import { LearnerType } from "./LearnerType";
import { Close, FreshClose, FreshCover, Marksheet } from "./EndScreens";
import type { ScreenActions, ScreenProps } from "./types";

/** Screens whose V2 action hierarchy includes on-slide buttons. 01–08 must not. */
export const HAS_ACTIONS: Slide["id"][] = ["learnerType", "marksheet", "close", "freshClose"];

export function renderSlide(slide: Slide, actions: ScreenActions, active: boolean) {
  const p = { actions, active };
  switch (slide.id) {
    case "cover":
      return <CoverSwitch slide={slide} {...p} />;
    case "study":
      // Default: the clock (Nov 2026 brief). The M3 count-up screen stays reachable at ?study=geo.
      return new URLSearchParams(location.search).get("study") === "geo" ? <StudyGeo slide={slide} {...p} /> : <StudyClock slide={slide} {...p} />;
    case "live":
      // Default: the live-class collection (Nov 2026 brief). The V2 attendance screen stays at ?live=v2.
      return new URLSearchParams(location.search).get("live") === "v2" ? <Attendance slide={slide} {...p} /> : <LiveClass slide={slide} {...p} />;
    case "teacher":
      return <Teacher slide={slide} {...p} />;
    case "quiz":
      return <Quiz slide={slide} {...p} />;
    case "video":
      return <Video slide={slide} {...p} />;
    case "subject":
      return <Subject slide={slide} {...p} />;
    case "peakDay":
      return <PeakDay slide={slide} {...p} />;
    case "learnerType":
      return <LearnerType slide={slide} {...p} />;
    case "marksheet":
      return <Marksheet slide={slide} {...p} />;
    case "close":
      return <Close slide={slide} {...p} />;
    case "freshCover":
      return <FreshCover slide={slide} {...p} />;
    case "freshClose":
      return <FreshClose slide={slide} {...p} />;
  }
}

/**
 * Surface system (M2, PROPOSED). The deck reads as one notebook:
 * front board → written pages → the stamped page → the certificate → back board.
 * Surfaces set colour roles only; each screen keeps its own composition.
 */
export type Surface = "cover" | "page" | "certificate" | "light";
export const SURFACE: Record<Slide["id"], Surface> = {
  cover: "cover",
  study: "cover", // white chrome over the shared night sky (the archived yellow M3 screen is ?study=geo)
  live: "cover", // white chrome over the shared night sky (the V2 page screen is ?live=v2)
  teacher: "page",
  quiz: "page",
  video: "page",
  subject: "page",
  peakDay: "page",
  learnerType: "page",
  marksheet: "certificate",
  close: "cover",
  freshCover: "cover",
  freshClose: "cover",
};

export const SLIDE_LABEL: Record<Slide["id"], string> = {
  cover: "01 Cover",
  study: "02 Study time",
  live: "03 Live classes",
  teacher: "04 Teacher",
  quiz: "05 Quiz",
  video: "06 Video",
  subject: "07 Subject of the year",
  peakDay: "08 Most-active day",
  learnerType: "09 Learner type ★",
  marksheet: "10 Marksheet",
  close: "11 See you 2027",
  freshCover: "◇ Fresh Start · cover",
  freshClose: "◇ Fresh Start · close",
};

/** Screen 01 picks the reviewed exploration (dev panel / ?cover=) — default is the current cover. */
function CoverSwitch(props: ScreenProps<"cover">) {
  const v = useCoverVariant();
  const C = v === "current" ? CoverFigma : v === "m3" ? CoverGeo : v === "m2" ? Cover : v === "u" ? CoverUnfolded : v === "a" ? CoverTypographic : v === "b" ? CoverGeometry : v === "c" ? CoverEditorial : CoverGeo;
  return <C {...props} />;
}
