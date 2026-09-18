/**
 * Default movie acronym:
 * - One-word titles stay as-is (e.g. "Thunderbolts*")
 * - Otherwise initials per colon segment, skipping "the"
 *   e.g. "The Fantastic 4: First Steps" → "F4:FS"
 */
export function generateAcronym(title: string): string {
  const trimmed = String(title || "").trim();
  if (!trimmed) return "";

  const segments = trimmed.split(":").map((s) => s.trim()).filter(Boolean);

  if (segments.length === 1) {
    const words = segments[0].split(/\s+/).filter(Boolean);
    if (words.length <= 1) return trimmed;
  }

  return segments
    .map((segment) => {
      const words = segment.split(/\s+/).filter(Boolean);
      return words
        .filter((word) => {
          const core = word.replace(/[^a-z0-9]/gi, "").toLowerCase();
          return core.length > 0 && core !== "the";
        })
        .map((word) => {
          if (/^\d+$/.test(word)) return word;
          const letter = word.match(/[a-zA-Z]/);
          if (letter) return letter[0].toUpperCase();
          const digit = word.match(/\d/);
          return digit ? digit[0] : "";
        })
        .join("");
    })
    .filter(Boolean)
    .join(":");
}
