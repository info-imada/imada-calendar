export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function sanitizeHeader(value: string): string {
  if (/\r|\n/.test(value)) throw new Error("INVALID_EMAIL_HEADER");
  return value.trim();
}
