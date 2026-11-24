/**
 * Mock students. Activity-level profiles mirror the sample columns in Design
 * Brief V2 (High / Moderate / Limited) so screens can be checked against the
 * brief. Numbers are illustrative, not production content.
 */
import type { MockProfile, WrapRecord } from "./types";

const H = 3600;

const base: WrapRecord = {
  status: "ready",
  student: { name: "নিশাত", className: "দশম", group: "বিজ্ঞান" },
  activeDays: 0,
  longestStreak: 0,
  studySeconds: 0,
  live: null,
  teacher: null,
  quizzesCompleted: 0,
  videoMinutes: 0,
  subjects: [],
  peakDay: null,
  learnerType: null,
  capstonePercentile: null,
};

// PROTO: a neutral placeholder avatar standing in for a real profile photo.
const MOCK_PHOTO = "/assets/mock/student-avatar.svg";

// PROTO: the one program banner we have (Academic Program · SSC 28 · Class 9 · Science).
const MOCK_PROGRAM = {
  id: "ssc-28-class-9-science",
  name: "Academic Program — SSC 28, Class 9, Science",
  bannerUrl: "/assets/programs/ssc-28-class-9-science.png",
  url: "mock://programs/ssc-28-class-9-science",
};

const high: WrapRecord = {
  ...base,
  nextProgram: MOCK_PROGRAM,
  student: { ...base.student, photoUrl: MOCK_PHOTO },
  activeDays: 180,
  longestStreak: 24,
  studySeconds: 210 * H,
  live: { attended: 60, held: 68 },
  teacher: { name: "এনাম ভাইয়া", photoUrl: "mock://teacher-photo", portraitUrl: "/assets/teacher/enam-bhaiya.png", avatar: "male" },
  quizzesCompleted: 95,
  videoMinutes: 1620,
  subjects: [
    { id: "physics", seconds: 62 * H },
    { id: "math", seconds: 48 * H },
    { id: "chemistry", seconds: 39 * H },
    { id: "biology", seconds: 30 * H },
  ],
  peakDay: { date: "2026-03-14", seconds: 5 * H },
  learnerType: "rhythm",
};

export const PROFILES: MockProfile[] = [
  {
    id: "high",
    label: "High activity",
    group: "Activity level",
    note: "V2 'High' column: 3 badges, quiz nudge (95 → 100), teacher with photo.",
    record: high,
  },
  {
    id: "moderate",
    label: "Moderate",
    group: "Activity level",
    note: "V2 'Moderate': 71% attendance (no badge), no nudge, teacher without photo.",
    record: {
      ...base,
      activeDays: 96,
      longestStreak: 9,
      studySeconds: 142 * H,
      live: { attended: 48, held: 68 },
      teacher: { name: "এনাম ভাইয়া", photoUrl: null, avatar: "male" },
      quizzesCompleted: 46,
      videoMinutes: 960,
      subjects: [
        { id: "math", seconds: 51 * H },
        { id: "physics", seconds: 30 * H },
        { id: "english", seconds: 22 * H },
      ],
      peakDay: { date: "2026-07-09", seconds: 4 * H },
      learnerType: "focusHigh",
    },
  },
  {
    id: "limited",
    label: "Limited",
    group: "Activity level",
    note: "V2 'Limited': no class data, low-but-real numbers, video/subject/peak/teacher drop.",
    record: {
      ...base,
      student: { name: "রাফি", className: null, group: null },
      activeDays: 14,
      longestStreak: 2,
      studySeconds: 38 * H,
      live: { attended: 6, held: 40 },
      teacher: null,
      quizzesCompleted: 7,
      videoMinutes: 2,
      subjects: [
        { id: "bangla", seconds: 10 * H },
        { id: "english", seconds: 9.8 * H },
      ],
      peakDay: null,
      learnerType: "balanced",
    },
  },
  {
    id: "fresh",
    label: "Fresh Start",
    group: "Activity level",
    note: "3 active days → 2-slide deck. No stats, no type, nothing to share.",
    record: {
      ...base,
      student: { name: "তানিয়া", className: "নবম", group: "ব্যবসায় শিক্ষা" },
      activeDays: 3,
      studySeconds: 2 * H,
      quizzesCompleted: 1,
      videoMinutes: 40,
    },
  },
  {
    id: "capstone",
    label: "Capstone (all 4 badges)",
    group: "Edge case",
    note: "All four badges → সেরার সেরা. No truthful percentile → scarcity line only.",
    record: {
      ...high,
      student: { name: "আরিফ", className: "দ্বাদশ", group: "বিজ্ঞান", photoUrl: MOCK_PHOTO },
      activeDays: 281,
      longestStreak: 46,
      studySeconds: 412 * H,
      live: { attended: 91, held: 98 },
      quizzesCompleted: 214,
      videoMinutes: 3380,
      learnerType: "intensity",
    },
  },
  {
    id: "longName",
    label: "Very long name",
    group: "Edge case",
    note: "Name overflow on banner + cover; night-owl type (VERIFY axis); longest subject name (উচ্চতর গণিত) on 07.",
    record: {
      ...high,
      student: { name: "মোহাম্মদ আব্দুল্লাহ আল মামুন চৌধুরী", className: "একাদশ", group: "মানবিক" },
      learnerType: "nightOwl",
      subjects: [
        { id: "higherMath", seconds: 70 * H },
        { id: "physics", seconds: 44 * H },
        { id: "biology", seconds: 31 * H },
        { id: "bangla", seconds: 18 * H },
        { id: "english", seconds: 12 * H },
      ],
    },
  },
  {
    id: "noName",
    label: "Missing name",
    group: "Edge case",
    note: "Generic headlines; never 'null'. Class present, group missing.",
    record: {
      ...high,
      student: { name: null, className: "অষ্টম", group: null },
      learnerType: "method",
    },
  },
  {
    id: "noLive",
    label: "No live classes · tied subjects",
    group: "Edge case",
    note: "Live + teacher omitted (not '0'); subject tie omitted; explorer type.",
    record: {
      ...high,
      live: null,
      teacher: null,
      subjects: [
        { id: "physics", seconds: 40 * H },
        { id: "chemistry", seconds: 39.5 * H },
      ],
      learnerType: "focusLow",
    },
  },
  {
    id: "generating",
    label: "Wrap not ready",
    group: "Edge case",
    note: "Banner tap → coming-soon sheet.",
    record: { ...high, status: "generating" },
  },
];

export const getProfile = (id: string) => PROFILES.find((p) => p.id === id) ?? PROFILES[0];
