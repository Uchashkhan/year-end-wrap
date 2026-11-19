/**
 * Rules from Design Brief V2. Every value carries its source so nobody mistakes
 * a prototype guess for a product decision.
 *
 *   "V2"  — stated explicitly in Design Brief V2 (binding)
 *   "TBD" — V2 says a threshold exists but not its value; placeholder until
 *           Product confirms (server `min_show` / `wrap_tier_config`)
 */

type Sourced<T> = { value: T; source: "V2" | "TBD"; note?: string };

export const RULES = {
  freshStartMaxActiveDays: {
    value: 5,
    source: "V2",
    note: "under 5 active days (incl. zero) → 2-slide Fresh Start deck",
  } as Sourced<number>,

  // ── min_show: below → that slide drops ────────────────────────────
  studyMinHours: { value: 5, source: "TBD", note: "V2: 'if below threshold, the slide drops'" } as Sourced<number>,
  liveMinAttended: { value: 3, source: "TBD", note: "V2: 'below the attendance threshold → the slide drops'" } as Sourced<number>,
  quizMinCompleted: { value: 5, source: "V2", note: "'Under 5 → the slide drops entirely'" } as Sourced<number>,
  videoMinMinutes: { value: 30, source: "V2", note: "'2 minutes is below the 30-min threshold'" } as Sourced<number>,

  // ── "only when meaningful" ────────────────────────────────────────
  studyComparisonMinDays: {
    value: 10,
    source: "TBD",
    note: "school-day comparison when ≥ this many 6-h days. V2 shows it at 142 h (24 d), not at 38 h (6 d)",
  } as Sourced<number>,
  hoursPerSchoolDay: { value: 6, source: "V2" } as Sourced<number>,
  videoHoursLineMinHours: { value: 2, source: "TBD", note: "'≈ [Y] hours' line when meaningful" } as Sourced<number>,
  streakMinDays: { value: 3, source: "V2", note: "streak shown only if ≥ 3 days" } as Sourced<number>,
  quizNudgeWindow: { value: 5, source: "V2", note: "'only within ~5 of a tier'" } as Sourced<number>,

  // ── reliability ───────────────────────────────────────────────────
  subjectTieTolerance: {
    value: 0.05,
    source: "TBD",
    note: "top-2 subjects within 5% of each other = 'effectively tied' → omit",
  } as Sourced<number>,
} as const;

/** Badges — the real set of 4 (V2, seeded wrap_tier_config). */
export const BADGE_RULES = {
  firstBencher: { minAttendanceRate: 0.85 }, // ফার্স্ট বেঞ্চার ≥ 85%
  quizWarrior: { minQuizzes: 100 }, // কুইজ যোদ্ধা 100+
  videoMarathoner: { minMinutes: 1500 }, // ভিডিও ম্যারাথনার 1500+ min
  streakMaster: { minStreak: 21 }, // স্ট্রিক মাস্টার 21+ day longest streak
} as const;

export const CAPSTONE_RULE: Sourced<number> = {
  value: 4,
  source: "TBD",
  note: "V2: 'top tier of all / nearly all badges' — bar not locked. Prototype: all 4.",
};

/**
 * Server-driven slide order (PRD: Product can reorder/drop without a release).
 * Prototype default = V2 numbering.
 */
export const DEFAULT_ORDER = [
  "cover",
  "study",
  "live",
  "teacher",
  "quiz",
  "video",
  "subject",
  "peakDay",
  "learnerType",
  "marksheet",
  "close",
] as const;

/** V2: Screen 04 is P0 only if teacher data is launch-ready. Dev panel can toggle. */
export const TEACHER_SLIDE_ENABLED_DEFAULT = true;
