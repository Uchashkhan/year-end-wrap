/**
 * Mock shape of one student's precomputed wrap record (PRD: "precompute nightly
 * into one record per student; the app only reads it").
 *
 * Field names are prototype-side guesses — the real `wrap_2026` schema is still
 * "to be built" per the PRD. Keep UI code reading only from `StoryPlan`
 * (see compose.ts), never from this raw shape, so a schema change stays local.
 */

export type LearnerTypeId =
  | "rhythm" // নিয়মিত পড়ুয়া
  | "intensity" // পরিশ্রমী
  | "focusHigh" // একনিষ্ঠ
  | "focusLow" // অনুসন্ধানী
  | "method" // অনুশীলনকারী
  | "nightOwl" // রাতজাগা পড়ুয়া — VERIFY: hour-band data not confirmed
  | "balanced"; // ভারসাম্যপূর্ণ — default when all |z| < 0.5

export type SubjectId =
  | "physics"
  | "chemistry"
  | "biology"
  | "math"
  | "higherMath"
  | "bangla"
  | "english"
  | "ict";

export interface WrapRecord {
  /** Wrap generation state — drives the banner's coming-soon sheet. */
  status: "ready" | "generating";

  student: {
    /** Display name. null/empty → generic copy, never "null". */
    name: string | null;
    /** Already-localised labels from the profile service. */
    className: string | null; // e.g. "দশম"
    group: string | null; // e.g. "বিজ্ঞান"
  };

  /** Distinct days with any learning activity in the reporting window. */
  activeDays: number;
  /** Longest consecutive-day streak. */
  longestStreak: number;
  /** Total learning time in seconds. */
  studySeconds: number;

  live: {
    attended: number;
    held: number;
  } | null;

  /** Most-attended teacher. null = no reliable record → slide omitted. */
  teacher: {
    name: string;
    photoUrl: string | null;
    /** Cleared illustrated cut-out portrait (transparent bust, 4:5). Preferred over the photo. */
    portraitUrl?: string | null;
    /** Used only to pick the generic avatar. null → name only. */
    avatar: "male" | "female" | null;
  } | null;

  quizzesCompleted: number;
  videoMinutes: number;

  /** Time per subject, seconds. Order not guaranteed. */
  subjects: { id: SubjectId; seconds: number }[];

  /** Single day of most app time. null = no clear peak → slide omitted. */
  peakDay: {
    date: string; // ISO yyyy-mm-dd
    seconds: number;
  } | null;

  /** Server-assigned (cohort z-score). Absent for Fresh Start students. */
  learnerType: LearnerTypeId | null;

  /** Truthful percentile for the capstone rarity line; null → scarcity framing only. */
  capstonePercentile: number | null;
}

export interface MockProfile {
  id: string;
  label: string;
  group: "Activity level" | "Edge case";
  note: string;
  record: WrapRecord;
}
