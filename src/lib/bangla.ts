const DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** Bengali numerals. No grouping under 10,000 (matches V2: "১৬২০"); Indian grouping above. */
export function bn(n: number | string): string {
  let s = String(n);
  if (typeof n === "number" && Math.abs(n) >= 10000) {
    s = n.toLocaleString("en-IN");
  }
  return s.replace(/\d/g, (d) => DIGITS[Number(d)]);
}

export const MONTHS = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
];

const WEEKDAYS = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];

/** "2026-03-14" → { day: "১৪", month: "মার্চ", weekday: "শনিবার" } */
export function bnDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return {
    day: bn(d),
    month: MONTHS[m - 1],
    weekday: WEEKDAYS[date.getUTCDay()],
    short: `${bn(d)} ${MONTHS[m - 1]}`,
  };
}

/** Round to whole hours; values under 1h are reported by callers, never as "০ ঘণ্টা". */
export function hoursFromSeconds(s: number): number {
  return Math.round(s / 3600);
}
