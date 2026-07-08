/**
 * Build-time helpers for blog metadata. Everything shown next to a post is
 * computed from the content itself — nothing to maintain, nothing to track.
 */

/** Estimated reading time in minutes (~200 words per minute, min 1). */
export function readingTime(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** "2026-07-08" -> "Jul 8, 2026" for display. */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
