/**
 * Build-time helpers for notes metadata. Everything shown next to an entry
 * is computed from the content itself — nothing to maintain, nothing to
 * track.
 */

/** Estimated reading time in minutes (~200 words per minute, min 1). */
export function readingTime(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * "2026-07-08" -> "Jul 8, 2026". Formatted in UTC: authored dates are
 * parsed as UTC midnight, so a local time zone west of UTC would otherwise
 * render the previous day.
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
