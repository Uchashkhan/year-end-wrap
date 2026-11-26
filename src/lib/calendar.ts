/** Sunday-first cells for a calendar date, independent of the viewer's time zone. */
export function calendarMonth(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = Array.from({ length: firstWeekday + daysInMonth }, (_, index) =>
    index < firstWeekday ? null : index - firstWeekday + 1,
  );
  return { year, month, day, cells };
}
