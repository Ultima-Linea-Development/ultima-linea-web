import { escapeRegex } from "@/lib/utils";

const DIACRITIC_MARKS = /[\u0300-\u036f]/g;
const NON_ALPHANUMERIC = /[^a-z0-9]+/g;
const FLEXIBLE_SEPARATOR = "[^A-Za-z0-9À-ÖØ-öø-ÿ]*";

const ACCENT_FOLDING_CLASSES: Record<string, string> = {
  a: "[aáàâäãå]",
  c: "[cç]",
  e: "[eéèêë]",
  i: "[iíìîï]",
  n: "[nñ]",
  o: "[oóòôöõ]",
  u: "[uúùûü]",
  y: "[yýÿ]",
};

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(DIACRITIC_MARKS, "")
    .toLocaleLowerCase()
    .replace(NON_ALPHANUMERIC, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function compactSearchText(value: string): string {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

export function matchesNormalizedSearch(values: Array<string | undefined>, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  const compactQuery = compactSearchText(query);

  if (!normalizedQuery && !compactQuery) return false;

  return values.some((value) => {
    if (!value) return false;

    const normalizedValue = normalizeSearchText(value);
    if (normalizedQuery && normalizedValue.includes(normalizedQuery)) return true;

    return Boolean(compactQuery && compactSearchText(value).includes(compactQuery));
  });
}

export function buildFlexibleSearchRegexPattern(query: string): string {
  const compactQuery = compactSearchText(query);
  if (!compactQuery) return escapeRegex(query);

  return [...compactQuery]
    .map((char) => ACCENT_FOLDING_CLASSES[char] ?? escapeRegex(char))
    .join(FLEXIBLE_SEPARATOR);
}
