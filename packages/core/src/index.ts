/**
 * Normalize a string for fuzzy matching — lowercases, strips diacritics,
 * collapses whitespace, and trims.
 *
 * Used by both frontend (to send normalized lecturer abbr) and API
 * (to compare against subject text).
 */
const POLISH_MAP: Record<string, string> = {
  ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z",
  Ą: "A", Ć: "C", Ę: "E", Ł: "L", Ń: "N", Ó: "O", Ś: "S", Ź: "Z", Ż: "Z",
};

const POLISH_RE = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g;

export function normalize(input: string): string {
  return input
    .replace(POLISH_RE, (ch) => POLISH_MAP[ch] ?? ch)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
