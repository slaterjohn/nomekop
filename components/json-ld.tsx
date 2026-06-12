/**
 * Serializes JSON-LD structured data into a script tag (server component —
 * zero client JS). React does not escape dangerouslySetInnerHTML, and a data
 * string containing "</script>" would otherwise close the tag early, so every
 * "<" is escaped to backslash-u003c — valid JSON, inert inside a script context.
 */
export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}) {
  return (
    <script
      type="application/ld+json"
      // Escape < to prevent script-context injection from data strings.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
