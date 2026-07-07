/**
 * Renders the tiny markdown subset used in data-collection strings
 * (timeline highlights): inline links only. Everything else is escaped.
 */
export function inlineMarkdown(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    '<a href="$2">$1</a>',
  );
}
