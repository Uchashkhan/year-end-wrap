/**
 * WrapRecord → StoryPlan. The only place V2 visibility rules live.
 *
 * In production the server owns most of this (min_show, tier config, order);
 * the prototype runs it client-side so designers can see *why* a slide is or
 * isn't in a student's deck.
 */
import { BADGE_RULES, CAPSTONE_RULE, DEFAULT_ORDER, RULES } from "./config";
import { BADGES, COPY, LEARNER_TYPES, SUBJECTS } from "./copy";
import type { LearnerTypeId, SubjectId, WrapRecord } from "./types";
import { bn as bnNum, hoursFromSeconds } from "../lib/bangla";

export type BadgeId = keyof typeof BADGES;

export type SlideId = (typeof DEFAULT_ORDER)[number] | "freshCover" | "freshClose";

export type Slide =
  | { id: "cover"; name: string | null; className: string | null; group: string | null }
  | { id: "study"; hours: number; comparisonDays: number | null }
  | { id: "live"; attended: number; held: number; badge: BadgeId | null }
  | { id: "teacher"; name: string; photoUrl: string | null; portraitUrl: string | null; avatar: "male" | "female" | null }
  | { id: "quiz"; count: number; badge: BadgeId | null; nudge: { gap: number; milestone: string } | null }
  | { id: "video"; minutes: number; hours: number | null; films: number | null; badge: BadgeId | null }
  | { id: "subject"; subject: SubjectId; runnersUp: SubjectId[]; others: SubjectId[] }
  | { id: "peakDay"; date: string; hours: number | null }
  | {
      id: "learnerType";
      type: LearnerTypeId;
      reason: string;
      activeDays: number;
      streak: number | null;
    }
  | { id: "marksheet"; rows: MarksheetRow[]; type: LearnerTypeId; badges: BadgeId[]; capstone: boolean; name: string | null; facts: MarksheetFacts }
  | { id: "close" }
  | { id: "freshCover"; name: string | null }
  | { id: "freshClose" };

/**
 * Screen 10's typed facts: exactly the chapters that made it into this
 * student's story (each null when its slide was omitted), so the marksheet
 * never shows a metric the story didn't. No name, photo, school or rank here —
 * the export card is built from this object alone.
 */
export interface MarksheetFacts {
  study: { hours: number } | null;
  live: { attended: number; held: number } | null;
  quiz: { count: number } | null;
  video: { minutes: number } | null;
  subject: { id: SubjectId } | null;
  peak: { date: string; hours: number | null } | null;
  teacher: { name: string; portraitUrl: string | null } | null;
  /** The learner type; `assigned` is false when the server gave none (the "balanced" fallback). */
  type: { id: LearnerTypeId; assigned: boolean };
  badges: BadgeId[];
  capstone: boolean;
}

export interface MarksheetRow {
  key: keyof typeof COPY.marksheet.rows;
  value: string; // already formatted with Bengali numerals
}

export interface Omission {
  id: SlideId;
  reason: string;
}

export interface StoryPlan {
  mode: "full" | "freshStart";
  slides: Slide[];
  omitted: Omission[];
  badges: BadgeId[];
  capstone: boolean;
  capstonePercentile: number | null;
}

export interface ComposeOptions {
  teacherSlideEnabled: boolean;
  order?: readonly SlideId[];
}

function clean(s: string | null | undefined): string | null {
  const t = s?.trim();
  return t ? t : null;
}

export function earnedBadges(r: WrapRecord): BadgeId[] {
  const out: BadgeId[] = [];
  if (r.live && r.live.held > 0 && r.live.attended / r.live.held >= BADGE_RULES.firstBencher.minAttendanceRate)
    out.push("firstBencher");
  if (r.quizzesCompleted >= BADGE_RULES.quizWarrior.minQuizzes) out.push("quizWarrior");
  if (r.videoMinutes >= BADGE_RULES.videoMarathoner.minMinutes) out.push("videoMarathoner");
  if (r.longestStreak >= BADGE_RULES.streakMaster.minStreak) out.push("streakMaster");
  return out;
}

export function composeStory(r: WrapRecord, opts: ComposeOptions): StoryPlan {
  const name = clean(r.student.name);

  // ── Fresh Start ──────────────────────────────────────────────────
  if (r.activeDays < RULES.freshStartMaxActiveDays.value) {
    return {
      mode: "freshStart",
      slides: [{ id: "freshCover", name }, { id: "freshClose" }],
      omitted: DEFAULT_ORDER.map((id) => ({
        id,
        reason: `Fresh Start: ${r.activeDays} active days (< ${RULES.freshStartMaxActiveDays.value})`,
      })),
      badges: [],
      capstone: false,
      capstonePercentile: null,
    };
  }

  const badges = earnedBadges(r);
  const capstone = badges.length >= CAPSTONE_RULE.value;
  const omitted: Omission[] = [];
  const built = new Map<SlideId, Slide>();
  const skip = (id: SlideId, reason: string) => omitted.push({ id, reason });

  // 01 Cover
  // Class and group are separate labelled fields; an empty one is simply absent
  // (Classes 6–8 have no group, so "class only" is a normal case, not an error).
  built.set("cover", { id: "cover", name, className: clean(r.student.className), group: clean(r.student.group) });

  // 02 Study time
  const hours = hoursFromSeconds(r.studySeconds);
  if (hours >= RULES.studyMinHours.value) {
    const days = Math.round(hours / RULES.hoursPerSchoolDay.value);
    built.set("study", {
      id: "study",
      hours,
      comparisonDays: days >= RULES.studyComparisonMinDays.value ? days : null,
    });
  } else skip("study", `${hours} h < min_show ${RULES.studyMinHours.value} h (TBD)`);

  // 03 Live classes
  if (r.live && r.live.held > 0 && r.live.attended >= RULES.liveMinAttended.value) {
    built.set("live", {
      id: "live",
      attended: r.live.attended,
      held: r.live.held,
      badge: badges.includes("firstBencher") ? "firstBencher" : null,
    });
  } else
    skip(
      "live",
      !r.live || r.live.held === 0
        ? "no applicable live classes"
        : `${r.live.attended} attended < min_show ${RULES.liveMinAttended.value} (TBD)`,
    );

  // 04 Teacher
  if (!opts.teacherSlideEnabled) skip("teacher", "held: teacher data not launch-ready (dev toggle)");
  else if (!r.teacher || !clean(r.teacher.name)) skip("teacher", "no reliable teacher record");
  else built.set("teacher", { id: "teacher", name: r.teacher.name.trim(), photoUrl: r.teacher.photoUrl, portraitUrl: r.teacher.portraitUrl ?? null, avatar: r.teacher.avatar });

  // 05 Quiz
  if (r.quizzesCompleted >= RULES.quizMinCompleted.value) {
    const gap = BADGE_RULES.quizWarrior.minQuizzes - r.quizzesCompleted;
    built.set("quiz", {
      id: "quiz",
      count: r.quizzesCompleted,
      badge: badges.includes("quizWarrior") ? "quizWarrior" : null,
      nudge: gap > 0 && gap <= RULES.quizNudgeWindow.value ? { gap, milestone: BADGES.quizWarrior.name } : null,
    });
  } else skip("quiz", `${r.quizzesCompleted} quizzes < ${RULES.quizMinCompleted.value}`);

  // 06 Video
  if (r.videoMinutes >= RULES.videoMinMinutes.value) {
    const vh = Math.round(r.videoMinutes / 60);
    built.set("video", {
      id: "video",
      minutes: r.videoMinutes,
      hours: vh >= RULES.videoHoursLineMinHours.value ? vh : null,
      films: (() => {
        const y = Math.round(r.videoMinutes / RULES.filmMinutes.value);
        return y >= RULES.videoFilmLineMinFilms.value ? y : null;
      })(),
      badge: badges.includes("videoMarathoner") ? "videoMarathoner" : null,
    });
  } else skip("video", `${r.videoMinutes} min < ${RULES.videoMinMinutes.value} min`);

  // 07 Subject of the year (most time — not marks)
  const ranked = [...r.subjects].filter((s) => s.seconds > 0).sort((a, b) => b.seconds - a.seconds);
  const top = ranked[0];
  const second = ranked[1];
  if (!top) skip("subject", "no subject-level data");
  else if (second && (top.seconds - second.seconds) / top.seconds < RULES.subjectTieTolerance.value)
    skip("subject", `tie: ${top.id} vs ${second.id} within ${RULES.subjectTieTolerance.value * 100}% (TBD)`);
  else built.set("subject", { id: "subject", subject: top.id, runnersUp: ranked.slice(1, 3).map((s) => s.id), others: ranked.slice(1).map((s) => s.id) });

  // 08 Most-active day
  if (r.peakDay) {
    const ph = r.peakDay.seconds == null ? 0 : hoursFromSeconds(r.peakDay.seconds);
    built.set("peakDay", { id: "peakDay", date: r.peakDay.date, hours: ph >= 1 ? ph : null });
  } else skip("peakDay", "no clear peak day");

  // 09 Learner type
  const type: LearnerTypeId = r.learnerType ?? "balanced";
  built.set("learnerType", {
    id: "learnerType",
    type,
    reason: LEARNER_TYPES[type].reason({ activeDays: r.activeDays }),
    activeDays: r.activeDays,
    streak: r.longestStreak >= RULES.streakMinDays.value ? r.longestStreak : null,
  });

  // 10 Marksheet — rows only for metrics that made it into the story (never "0" / "--")
  const rows: MarksheetRow[] = [];
  const s = built.get("study");
  if (s?.id === "study") rows.push({ key: "study", value: `${bnNum(s.hours)} ঘণ্টা` });
  const l = built.get("live");
  if (l?.id === "live") rows.push({ key: "live", value: `${bnNum(l.attended)}টি` });
  const q = built.get("quiz");
  if (q?.id === "quiz") rows.push({ key: "quiz", value: `${bnNum(q.count)}টি` });
  const v = built.get("video");
  if (v?.id === "video") rows.push({ key: "video", value: `${bnNum(v.minutes)} মিনিট` });
  const sub = built.get("subject");
  if (sub?.id === "subject") rows.push({ key: "subject", value: SUBJECTS[sub.subject].name });
  const t = built.get("teacher");
  const pk = built.get("peakDay");
  const facts: MarksheetFacts = {
    study: s?.id === "study" ? { hours: s.hours } : null,
    live: l?.id === "live" ? { attended: l.attended, held: l.held } : null,
    quiz: q?.id === "quiz" ? { count: q.count } : null,
    video: v?.id === "video" ? { minutes: v.minutes } : null,
    subject: sub?.id === "subject" ? { id: sub.subject } : null,
    peak: pk?.id === "peakDay" ? { date: pk.date, hours: pk.hours } : null,
    teacher: t?.id === "teacher" ? { name: t.name, portraitUrl: t.portraitUrl } : null,
    type: { id: type, assigned: r.learnerType != null },
    badges,
    capstone,
  };
  built.set("marksheet", { id: "marksheet", rows, type, badges, capstone, name, facts });

  // 11 Close
  built.set("close", { id: "close" });

  const order = opts.order ?? DEFAULT_ORDER;
  return {
    mode: "full",
    slides: order.map((id) => built.get(id)).filter((x): x is Slide => !!x),
    omitted,
    badges,
    capstone,
    capstonePercentile: capstone ? r.capstonePercentile : null,
  };
}
