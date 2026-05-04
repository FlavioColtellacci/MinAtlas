/** Strip tags for safe display / model input. */
export function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function decodeBasicEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/gi, " ");
}

/** Plain text from HTML-heavy web snippets (Brave descriptions, etc.). */
export function plainWebText(value: string): string {
  return decodeBasicEntities(stripHtml(value)).replace(/\s+/g, " ").trim();
}
