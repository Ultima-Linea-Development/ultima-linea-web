import { generateSlug } from "@/lib/utils";

export type ProductVersion = "fan" | "player" | "retro";
export type ProductVersionValue = ProductVersion | "";

export type ProductNameInput = {
  productType?: string | null;
  team: string;
  season: string;
  type?: string | null;
  /** Nombre actual u original; se usa para inferir el tipo de camiseta. */
  name?: string | null;
  kitType?: string | null;
};

export const DEFAULT_PRODUCT_TYPE = "Camiseta";

export const DEFAULT_PRODUCT_TYPE_OPTIONS = [DEFAULT_PRODUCT_TYPE] as const;

export const DEFAULT_KIT_TYPE_OPTIONS = [
  "Titular",
  "Suplente",
  "Alternativa",
  "Edición Especial",
  "Tricolor",
] as const;

const KIT_TYPE_PATTERNS: Array<{ pattern: RegExp; label: string | ((match: RegExpMatchArray) => string) }> = [
  { pattern: /\btercera\s+equipaci[oó]n\b/i, label: "Alternativa" },
  { pattern: /\bedici[oó]n\s+especial\b/i, label: "Edición Especial" },
  {
    pattern: /\b(\d+)\s+aniversario\b/i,
    label: (match) => `${match[1]} Aniversario`,
  },
  { pattern: /\btitular\b/i, label: "Titular" },
  { pattern: /\bsuplente\b/i, label: "Suplente" },
  { pattern: /\balternativa\b/i, label: "Alternativa" },
  { pattern: /\btricolor\b/i, label: "Tricolor" },
  { pattern: /\btercera\b/i, label: "Tercera" },
];

export function normalizeSeason(season: string): string {
  const value = season.trim();
  if (!value) return value;

  const fullRange = value.match(/^(\d{4})\/(\d{4})$/);
  if (fullRange) return value;

  const singleYear = value.match(/^(\d{4})$/);
  if (singleYear) return value;

  const shortRange = value.match(/^(\d{2})\/(\d{2})$/);
  if (shortRange) {
    const start = Number(shortRange[1]);
    const end = Number(shortRange[2]);
    const startYear = start >= 90 ? 1900 + start : 2000 + start;
    let endYear = end >= 90 ? 1900 + end : 2000 + end;
    if (start >= 90 && end < 50) {
      endYear = 2000 + end;
    }
    return `${startYear}/${endYear}`;
  }

  return value;
}

export function extractKitTypeFromName(name: string): string | undefined {
  const stripped = name
    .replace(/^camiseta\s+/i, "")
    .replace(/\s*\((?:fan|player)\)\s*/gi, " ")
    .replace(/\s+versi[oó]n\s+(?:fan|player|retro)\s*$/i, "")
    .replace(/\s+retro\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  for (const { pattern, label } of KIT_TYPE_PATTERNS) {
    const match = stripped.match(pattern);
    if (!match) continue;
    return typeof label === "function" ? label(match) : label;
  }

  return undefined;
}

export function extractProductTypeFromName(name: string): string | undefined {
  const firstWord = name.trim().split(/\s+/)[0];
  if (!firstWord) return undefined;

  return firstWord.charAt(0).toLocaleUpperCase() + firstWord.slice(1);
}

function getSeasonEndYear(season: string): number | null {
  const normalized = normalizeSeason(season);
  const range = normalized.match(/^(\d{4})\/(\d{4})$/);
  if (range) return Number(range[2]);

  const single = normalized.match(/^(\d{4})$/);
  if (single) return Number(single[1]);

  return null;
}

export function resolveProductVersion(
  type?: string | null,
  name?: string | null,
  season?: string | null
): ProductVersion {
  const typeValue = (type ?? "").trim().toLowerCase();
  const nameValue = (name ?? "").trim().toLowerCase();

  if (typeValue === "player") return "player";
  if (typeValue === "retro") return "retro";
  if (/\bretro\b/.test(nameValue) || /\bversi[oó]n\s+retro\b/.test(nameValue)) {
    return "retro";
  }

  const endYear = season ? getSeasonEndYear(season) : null;
  if (endYear !== null && endYear <= 2015) return "retro";

  if (typeValue === "fan") return "fan";
  return "fan";
}

export function inferProductType(input: {
  type?: string | null;
  name?: string | null;
  season?: string | null;
}): ProductVersionValue {
  const typeValue = (input.type ?? "").trim();
  const nameValue = (input.name ?? "").trim();
  if (!typeValue && !/\bretro\b/i.test(nameValue) && !/\bversi[oó]n\s+(?:fan|player|retro)\b/i.test(nameValue)) {
    return "";
  }

  return resolveProductVersion(input.type, input.name, input.season);
}

export function labelProductVersion(version: ProductVersion): string {
  if (version === "retro") return "Versión Retro";
  if (version === "player") return "Versión Jugador";
  return "Versión Fan";
}

export function buildProductName(input: ProductNameInput): string {
  const productType = (input.productType ?? DEFAULT_PRODUCT_TYPE).trim() || DEFAULT_PRODUCT_TYPE;
  const team = input.team.trim();
  const normalizedSeason = normalizeSeason(input.season);
  const kitType = (input.kitType ?? extractKitTypeFromName(input.name ?? ""))?.trim();
  const version = inferProductType(input);

  const parts = [productType];
  if (kitType) parts.push(kitType);
  if (team) parts.push(team);
  if (normalizedSeason) parts.push(normalizedSeason);
  if (version) parts.push(labelProductVersion(version));

  return parts.join(" ");
}

export function applyProductNameNormalization(input: ProductNameInput): {
  name: string;
  slug: string;
  season: string;
  type: ProductVersionValue;
} {
  const season = normalizeSeason(input.season);
  const type = inferProductType({ ...input, season });
  const name = buildProductName({ ...input, season, type });
  return {
    name,
    slug: generateSlug(name),
    season,
    type,
  };
}

export function isProductNameNormalized(input: ProductNameInput): boolean {
  const expected = buildProductName(input);
  const normalizedSeason = normalizeSeason(input.season);
  return input.name?.trim() === expected && input.season?.trim() === normalizedSeason;
}
