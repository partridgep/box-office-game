/** Drop URL-like / blank junk that sometimes lands in TMDB production lists. */
function isJunkStudioName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  if (lower === "about:blank" || lower.startsWith("about:")) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return true;
  return false;
}

/**
 * Lead studio for display. Handles legacy comma-joined production strings
 * and single names from hardened ingest.
 */
export function leadStudioName(
  production: string | null | undefined
): string | null {
  if (!production?.trim()) return null;
  for (const part of production.split(",")) {
    const name = part.trim();
    if (!isJunkStudioName(name)) return name;
  }
  return null;
}
