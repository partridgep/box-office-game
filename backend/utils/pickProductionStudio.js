/**
 * Pick a single lead studio name from TMDB production_companies.
 * Drops junk (URLs, about:blank) and co-producer noise; prefers companies with a logo.
 */

function isJunkStudioName(name) {
  if (!name || typeof name !== "string") return true;
  const trimmed = name.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  if (lower === "about:blank" || lower.startsWith("about:")) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return true;
  return false;
}

/**
 * @param {Array<{ name?: string, logo_path?: string | null }> | null | undefined} companies
 * @returns {string | null}
 */
function pickProductionStudio(companies) {
  if (!Array.isArray(companies) || companies.length === 0) return null;

  const cleaned = companies.filter((c) => c && !isJunkStudioName(c.name));
  if (cleaned.length === 0) return null;

  const withLogo = cleaned.find((c) => c.logo_path);
  const lead = withLogo || cleaned[0];
  return lead.name.trim();
}

module.exports = {
  isJunkStudioName,
  pickProductionStudio,
};
