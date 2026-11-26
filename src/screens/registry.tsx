import type { Slide } from "../data/compose";
import { Cover } from "./Cover";
import { CoverGeo } from "./CoverGeo";
import { CoverFigma } from "./CoverFigma";
import { StudyGeo } from "./StudyGeo";
import { StudyClock } from "./StudyClock";
import { LiveClass } from "./LiveClass";
import { TeacherSpotlight } from "./TeacherSpotlight";
import { QuizRecap } from "./QuizRecap";
import { VideoWatchline } from "./VideoWatchline";
import { SubjectTakeover } from "./SubjectTakeover";
import { PeakDayLit } from "./PeakDayLit";
import { LearnerReveal } from "./LearnerReveal";
import { MarksheetBento } from "./MarksheetBento";
import { MarksheetV2 } from "./MarksheetV2";
import { YearTurnsClosing } from "./YearTurnsClosing";
import { useMarksheetDesign } from "../marksheet/design";
import { isBirdJourney, useJourney } from "../journey/journeyMode";
import { useFacet } from "../variants/facets";
import { useMemo } from "react";
import { StudySky } from "./studySky/StudySky";
import { QuizActivities } from "./QuizActivities";
import { TeacherCinematic } from "./TeacherCinematic";
import { LiveClassAlive } from "./LiveClassAlive";
import { LiveReservedSeat } from "./LiveReservedSeat";
import { SkyProgressCtx, createSkyProgress } from "./studySky/progress";
import { StudyTimekeeper } from "./StudyTimekeeper";
import { ExperimentalBirdJourneyClosingSky } from "../journey/ExperimentalBirdJourneyClosingSky";
import { ExperimentalBirdJourneyCover } from "../journey/ExperimentalBirdJourneyCover";
import { useCoverVariant } from "../explore/variant";
import { CoverTypographic } from "../explore/CoverTypographic";
import { CoverGeometry } from "../explore/CoverGeometry";
import { CoverEditorial } from "../explore/CoverEditorial";
import { CoverUnfolded } from "../explore/CoverUnfolded";
import { Attendance, Quiz, Video } from "./StatScreens";
import { PeakDay, Subject, Teacher } from "./RevealScreens";
import { LearnerType } from "./LearnerType";
import { FreshClose, FreshCover, Marksheet } from "./EndScreens";
import type { ScreenActions, ScreenProps } from "./types";
import { refinedFor } from "../motion/versions";

/** Screens whose V2 action hierarchy includes on-slide buttons. 01–08 must not. */
export const HAS_ACTIONS: Slide["id"][] = ["learnerType", "marksheet", "close", "freshClose"];

export function renderSlide(slide: Slide, actions: ScreenActions, active: boolean) {
  const p = { actions, active };
  // Motion versions (dev): a refined screen, when the inspector's frame asks for one and it exists.
  const Refined = refinedFor(slide.id);
  if (Refined) return <Refined {...({ slide, actions, active } as unknown as ScreenProps<never>)} />;
  switch (slide.id) {
    case "cover":
      return <CoverSwitch slide={slide} {...p} />;
    case "study":
      // Default: the clock (Nov 2026 brief). The M3 count-up screen stays reachable at ?study=geo.
      return new URLSearchParams(location.search).get("study") === "geo" ? <StudyGeo slide={slide} {...p} /> : <StudySwitch slide={slide} {...p} />;
    case "live":
      // Default: the live-class collection (Nov 2026 brief). The V2 attendance screen stays at ?live=v2.
      return new URLSearchParams(location.search).get("live") === "v2" ? <Attendance slide={slide} {...p} /> : <LiveSwitch slide={slide} {...p} />;
    case "teacher":
      // Default: "Teacher in the Spotlight" (Nov 2026 brief). The M1 placeholder stays at ?teacher=v2.
      return new URLSearchParams(location.search).get("teacher") === "v2" ? <Teacher slide={slide} {...p} /> : <TeacherSwitch slide={slide} {...p} />;
    case "quiz":
      // Default: "The Answer Parade — One Last Question" (Nov 2026 brief). The V2 stat screen stays at ?quiz=v2.
      return new URLSearchParams(location.search).get("quiz") === "v2" ? <Quiz slide={slide} {...p} /> : <QuizSwitch slide={slide} {...p} />;
    case "video":
      // Default: "The Watchline" (Nov 2026 brief + V3 reference). The V2 stat screen stays at ?video=v2.
      return new URLSearchParams(location.search).get("video") === "v2" ? <Video slide={slide} {...p} /> : <VideoWatchline slide={slide} {...p} />;
    case "subject":
      // Default: "Subject Takes Over" (Nov 22 prototype). The M1 placeholder stays at ?subject=v2.
      return new URLSearchParams(location.search).get("subject") === "v2" ? <Subject slide={slide} {...p} /> : <SubjectTakeover slide={slide} {...p} />;
    case "peakDay":
      // Default: "The Day That Lit Up" (Nov 23 prototype). The M1 placeholder stays at ?peak=v2.
      return new URLSearchParams(location.search).get("peak") === "v2" ? <PeakDay slide={slide} {...p} /> : <PeakDayLit slide={slide} {...p} />;
    case "learnerType":
      // Default: "The Big Reveal", Option A (Nov 23 prototype). The M1 screen stays at ?learner=v2.
      return new URLSearchParams(location.search).get("learner") === "v2" ? <LearnerType slide={slide} {...p} /> : <LearnerReveal slide={slide} {...p} />;
    case "marksheet":
      // Default: the Bento marksheet (Nov 23). The M1 sheet stays at ?marksheet=v2.
      return new URLSearchParams(location.search).get("marksheet") === "v2" ? <Marksheet slide={slide} {...p} /> : <MarksheetSwitch slide={slide} {...p} />;
    case "close":
      return <CloseSwitch slide={slide} {...p} />;
    case "freshCover":
      return <FreshCover slide={slide} {...p} />;
    case "freshClose":
      return <FreshClose slide={slide} {...p} />;
  }
}

/**
 * Surface = the colour roles a slide's text and chrome use (tokens.css). Every
 * slide now sits on the Gentle Atmosphere background (story/background.ts →
 * SCREEN_BACKGROUND), so all use light-on-dark roles. The marksheet keeps
 * "certificate" (same roles; its paper sheet is foreground). "page" remains for
 * the review board's paper samples only.
 */
export type Surface = "cover" | "page" | "certificate" | "light";
export const SURFACE: Record<Slide["id"], Surface> = {
  cover: "cover",
  study: "cover",
  live: "cover",
  teacher: "cover",
  quiz: "cover",
  video: "cover",
  subject: "cover",
  peakDay: "cover",
  learnerType: "cover",
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
/** Dev-only comparison: the experimental 2027 closing in Bird Journey mode; otherwise the approved Close. */
// Dev-only comparison (Nov 24): Marksheet V2's two looks beside the approved Chapter Bento.
function MarksheetSwitch(props: ScreenProps<"marksheet">) {
  const d = useMarksheetDesign();
  return d === "current" ? <MarksheetBento {...props} /> : <MarksheetV2 {...props} look={d === "v2a" ? "a" : "b"} />;
}

function LiveSwitch(props: ScreenProps<"live">) {
  // Screen facet live.design (variants/facets.tsx): "The Front-Row Seat" (original), or "The Classroom Comes Alive".
  const design = useFacet("live", "design");
  if (design === "reserved") return <LiveReservedSeat {...props} />;
  return design === "alive" ? <LiveClassAlive {...props} /> : <LiveClass {...props} />;
}

function TeacherSwitch(props: ScreenProps<"teacher">) {
  // Screen facet teacher.design (variants/facets.tsx): the approved "Teacher in the Spotlight", or "Cinematic Spotlight".
  return useFacet("teacher", "design") === "cinematic" ? <TeacherCinematic {...props} /> : <TeacherSpotlight {...props} />;
}

function QuizSwitch(props: ScreenProps<"quiz">) {
  // Screen facet quiz.design (variants/facets.tsx): "The Answer Parade", or the reference's "Quiz Activities".
  const design = useFacet("quiz", "design");
  if (design === "reference") return <QuizActivities {...props} />;
  if (design === "centered" || design === "editorial") return <QuizActivities {...props} layout={design} />;
  return <QuizRecap {...props} />;
}

function StudySwitch(props: ScreenProps<"study">) {
  // Two independent facets (variants/facets.tsx): the character choreography (the approved clock, or "The
  // Timekeeper", Bird-led's preset) and the background effect (none, or the day/night sky). The character
  // publishes the passage of time; the background follows it — any character with any background.
  const character = useFacet("study", "character");
  const sky = useFacet("study", "sky");
  const progress = useMemo(() => (sky === "daynight" ? createSkyProgress() : null), [sky]);
  const screen = character === "timekeeper" ? <StudyTimekeeper {...props} /> : <StudyClock {...props} />;
  if (!progress) return screen;
  return (
    <SkyProgressCtx.Provider value={progress}>
      <StudySky progress={progress} />
      {screen}
    </SkyProgressCtx.Provider>
  );
}

function CloseSwitch(props: ScreenProps<"close">) {
  // Bird Journey's closing is the sky flight; the original Wrap's is "The Year Turns" (Nov 24).
  // (The previous Closing, EndScreens Close, is kept in the code, unwired.)
  return isBirdJourney(useJourney()) ? <ExperimentalBirdJourneyClosingSky {...props} /> : <YearTurnsClosing {...props} />;
}

function CoverSwitch(props: ScreenProps<"cover">) {
  const v = useCoverVariant();
  // Dev-only comparison: the experimental Bird Journey cover (the approved cover is untouched).
  if (isBirdJourney(useJourney())) return <ExperimentalBirdJourneyCover {...props} />;
  const C = v === "current" ? CoverFigma : v === "m3" ? CoverGeo : v === "m2" ? Cover : v === "u" ? CoverUnfolded : v === "a" ? CoverTypographic : v === "b" ? CoverGeometry : v === "c" ? CoverEditorial : CoverGeo;
  return <C {...props} />;
}
