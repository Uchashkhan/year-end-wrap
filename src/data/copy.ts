/**
 * All Bangla UX copy, from Design Brief V2. V2 status: "All Bangla below is
 * proposed — Product/Brand approve final wording." Nothing here is approved.
 *
 * Where V2 and the PRD disagree, V2 wins. Where V2 is silent, the PRD is used
 * and marked `// PRD`. Prototype-only fills are marked `// PROTO`.
 */
import type { LearnerTypeId, SubjectId } from "./types";
import { bn } from "../lib/bangla";

export const COPY = {
  banner: {
    newCue: "নতুন · Wrap ২০২৬",
    headline: (name: string) => `${name}, শিখোতে তোমার বছরটা কেমন গেল?`,
    headlineNoName: "শিখোতে তোমার বছরটা কেমন গেল?", // PROTO — V2 has no generic variant
    support: "এই বছর যা যা করেছ, সব এক খাতায় — চলো দেখে নিই।",
    cta: "আমার খাতা দেখি",
    comingSoon: "তোমার খাতা তৈরি হচ্ছে, একটু পরেই দেখতে পারবে।",
    comingSoonDismiss: "ঠিক আছে", // PROTO
  },

  cover: {
    headline: "শিখোতে তোমার",
    year: "২০২৬",
    support: "চলো, এই বছরটা একবার পিছনে ফিরে দেখি।",
    /** Figma 20:580 — the cover's start control (approved design, Nov 2026). */
    start: "শুরু করো",
    /** V2 "Labels · DYNAMIC": নাম · শ্রেণি · বিভাগ */
    labels: { name: "নাম", className: "শ্রেণি", group: "বিভাগ" },
  },

  /** Screen 02 Study time — V2 brief (binding), matches PRD Screen 2's primary line. */
  study: {
    lead: "এই বছর তুমি পড়েছ",
    unit: "ঘণ্টা",
    comparison: (days: number) => `দিনে ৬ ঘণ্টা ধরলে, প্রায় ${bn(days)} দিনের সমান।`,
  },

  /** Screen 03 "The Front-Row Seat" (Nov 2026 brief) — the default Live classes screen. */
  /**
   * 03 Live classes — PRD Screen 3 copy (Nov 22): headline "লাইভ ক্লাসে তোমার
   * উপস্থিতি" · primary "[X]টি ক্লাসে অংশ নিয়েছ তুমি" (split for layout; it reads
   * whole) · held total for context (V2 line) · ribbon only when earned.
   */
  liveClass: {
    headline: ["লাইভ ক্লাসে", "তোমার উপস্থিতি"],
    unitTop: "টি",
    unitBottom: "ক্লাসে",
    tail: "অংশ নিয়েছ তুমি",
    statement: (n: number) => `${bn(n)}টি ক্লাসে অংশ নিয়েছ তুমি`,
  },

  /** V2 Live classes copy — used by the archived screen (?live=v2). */
  live: {
    headline: "এই বছর লাইভ ক্লাসে তুমি কতবার ছিলে?",
    unit: "টি ক্লাস",
    heroLine: (n: number) => `${bn(n)}টি ক্লাসে অংশ নিয়েছ তুমি`,
    held: (n: number) => `${bn(n)}টি ক্লাসের মধ্যে`,
  },

  teacher: {
    framing: "যাঁর ক্লাসে সবচেয়ে বেশি ছিলে",
  },

  quiz: {
    headline: "কুইজে কেমন কাটল তোমার বছর?",
    unit: "টি কুইজ",
    heroLine: (n: number) => `এই বছর ${bn(n)}টি কুইজ শেষ করেছ`,
    nudge: (gap: number, milestone: string) => `আর ${bn(gap)}টা হলেই ${milestone}।`,
  },

  video: {
    lead: "ভিডিও দেখে শিখেছ",
    unit: "মিনিট",
    hours: (h: number) => `প্রায় ${bn(h)} ঘণ্টা ভিডিওতে শেখা।`,
    /** PRD optional comparison, split for layout; joined it reads exactly: "১২০ মিনিটের সিনেমা ধরলে, প্রায় [Y]টি!" */
    films: (y: number) => ({ line1: "১২০ মিনিটের সিনেমা ধরলে,", lead: "প্রায়", count: `${bn(y)}টি!` }),
  },

  subject: {
    headline: "এই বছর কোন বিষয়ে বেশি ডুবে ছিলে?",
    support: "এই বিষয়েই তুমি সবচেয়ে বেশি সময় দিয়েছ।",
    /** PRD Screen 7 copy (used by "Subject Takes Over", Nov 22). */
    prdHeadline: "তোমার বছরের বিষয়",
    prdSupport: "এই বিষয়েই তুমি সবচেয়ে বেশি সময় দিয়েছ এই বছর।",
    runnersUp: (names: string[]) => `এরপর ${names.join(" · ")}`,
  },

  peakDay: {
    /** PRD Screen 8 (exact). */
    prdHeadline: "তোমার বছরের সেরা দিন",
    prdSupport: "এই দিনেই তুমি সবচেয়ে বেশি সময় কাটিয়েছ শিখোতে।",
    /** Calendar weekday heads (Sunday first, as the reference). */
    weekHeads: ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"],
    headline: "তোমার সবচেয়ে ব্যস্ত দিনটা কবে ছিল?",
    support: "এই দিনেই তুমি সবচেয়ে বেশি সময় কাটিয়েছ।",
    timeThatDay: (h: number) => `সেদিন ${bn(h)} ঘণ্টা শিখেছ।`,
  },

  learnerType: {
    /** PRD Screen 9 (exact): the setup line and the primary action. */
    prdSetup: "সারা বছরের শেখার অভ্যাস দেখে তোমার জন্য আছে একটি বিশেষ পরিচয়।",
    prdPrimary: "আমার মার্ক শিট দেখি",
    headline: "তোমার শেখার ধরন কী?",
    setup: "সারা বছর কীভাবে পড়েছ, সেটা দেখেই এই ধরন।",
    label: "তোমার শেখার ধরন",
    activeDays: (n: number) => `${bn(n)} দিন সক্রিয়`, // PROTO
    streak: (n: number) => `টানা ${bn(n)} দিন`, // PROTO
    primary: "আমার মার্কশিট দেখি",
    secondary: "শেয়ার করো",
  },

  marksheet: {
    headline: "তোমার ২০২৬, এক খাতায়",
    /** PRD Screen 10 proposed closing line (exact). */
    closing: "দারুণ একটা বছর কাটিয়েছ — ২০২৭ হোক আরও বড়।",
    privacy: "কার্ডে তোমার নাম, স্কুল বা র‍্যাংক থাকে না।",
    primary: "শেয়ার করো",
    secondary: "এগিয়ে যাও",
    rows: {
      study: "পড়াশোনা",
      live: "লাইভ ক্লাস",
      quiz: "কুইজ",
      video: "ভিডিও",
      subject: "বিষয়",
      badges: "ব্যাজ",
    },
  },

  close: {
    line: ["২০২৬ এখানেই শেষ।", "২০২৭-এ আবার দেখা হবে।"],
    primary: "শেখা চালিয়ে যাও",
    secondary: "আবার শেয়ার করো",
  },

  freshStart: {
    cover: "তোমার শেখা সবে শুরু হলো।",
    close: ["এবারের শুরুটা ছোট —", "২০২৭-এ পুরো বছরটা তোমার সামনে।"],
    primary: "শেখা শুরু করো",
  },
} as const;

export const LEARNER_TYPES: Record<LearnerTypeId, { name: string; reason: (ctx: { activeDays: number }) => string; verify?: boolean }> = {
  rhythm: { name: "নিয়মিত পড়ুয়া", reason: ({ activeDays }) => `বছরজুড়ে ${bn(activeDays)} দিন শিখেছ` },
  intensity: { name: "পরিশ্রমী", reason: () => "সবচেয়ে বেশি সময় দিয়েছ পড়াতেই" },
  focusHigh: { name: "একনিষ্ঠ", reason: () => "একটা বিষয়েই গভীরভাবে ছিলে" },
  focusLow: { name: "অনুসন্ধানী", reason: () => "অনেক বিষয়ে ঘুরে শিখেছ" },
  method: { name: "অনুশীলনকারী", reason: () => "দেখার চেয়ে নিজে অনুশীলন করেছ বেশি" },
  nightOwl: { name: "রাতজাগা পড়ুয়া", reason: () => "বেশির ভাগ পড়াই রাতে", verify: true },
  balanced: { name: "ভারসাম্যপূর্ণ", reason: () => "সব দিকেই মোটামুটি সমান সময় দিয়েছ" },
};

export const BADGES = {
  firstBencher: { name: "ফার্স্ট বেঞ্চার", criterion: "লাইভ ক্লাসে উপস্থিতি ≥ ৮৫%" },
  quizWarrior: { name: "কুইজ যোদ্ধা", criterion: "১০০+ কুইজ শেষ" },
  videoMarathoner: { name: "ভিডিও ম্যারাথনার", criterion: "১৫০০+ মিনিট ভিডিও" },
  streakMaster: { name: "স্ট্রিক মাস্টার", criterion: "টানা ২১+ দিন সক্রিয়" },
} as const;

export const CAPSTONE = {
  name: "সেরার সেরা", // alt: কিংবদন্তি — brand approval
  rarity: "খুব কম শিক্ষার্থী এটা অর্জন করে",
  percentile: (p: number) => `তুমি সেরা ${bn(p)}%-এ`,
};

/** Subject names + colours. Physics/Math colours from PRD §G; others PROTO placeholders. */
export const SUBJECTS: Record<SubjectId, { name: string; color: string; verified: boolean }> = {
  physics: { name: "পদার্থবিজ্ঞান", color: "#6070E9", verified: true },
  math: { name: "গণিত", color: "#FF7B33", verified: true },
  chemistry: { name: "রসায়ন", color: "#14A38B", verified: false },
  biology: { name: "জীববিজ্ঞান", color: "#3DAE5C", verified: false },
  higherMath: { name: "উচ্চতর গণিত", color: "#E5484D", verified: false },
  bangla: { name: "বাংলা", color: "#C2257F", verified: false },
  english: { name: "ইংরেজি", color: "#2E86DE", verified: false },
  ict: { name: "আইসিটি", color: "#7C5CDB", verified: false },
};
