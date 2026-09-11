/**
 * Today's date in an ad account's own timezone.
 *
 * Meta cuts every reporting day at midnight in the account's timezone, not the
 * server's. A period ending on the server's "today" drifts by a day for part of
 * every day wherever the two differ — and the account that prompted this is in
 * Africa/Casablanca, an hour off UTC, whose stored timezone was previously
 * hard-coded to "UTC".
 *
 * An unrecognised timezone falls back to UTC rather than throwing: a wrong-by-
 * an-hour window is recoverable, a dashboard that fails to render is not.
 */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);

    const part = (type: string) => parts.find((p) => p.type === type)?.value;
    const year = part("year");
    const month = part("month");
    const day = part("day");
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // RangeError on an unknown timezone — fall through to UTC.
  }
  return now.toISOString().slice(0, 10);
}
