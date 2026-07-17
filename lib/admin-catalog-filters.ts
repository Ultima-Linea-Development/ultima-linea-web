import { buildFlexibleSearchRegexPattern } from "@/lib/search-normalization";

export function parseIsActiveFilterParam(value: string | null): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export function parseInStockFilterParam(value: string | null): boolean {
  return value === "true";
}

export function buildProductInStockFilter(): Record<string, unknown> {
  return { stock: { $gt: 0 } };
}

export function buildAdminCatalogMongoFilter(
  searchParams: URLSearchParams
): Record<string, unknown> {
  const showDeleted = searchParams.get("deleted") === "true";
  const filter: Record<string, unknown> = showDeleted
    ? { deleted_at: { $exists: true } }
    : { deleted_at: { $exists: false } };

  const team = searchParams.get("team");
  const league = searchParams.get("league");
  const size = searchParams.get("size");
  const isActive = parseIsActiveFilterParam(searchParams.get("is_active"));
  const inStock = parseInStockFilterParam(searchParams.get("in_stock"));

  if (team) filter.team = { $regex: buildFlexibleSearchRegexPattern(team), $options: "i" };
  if (league) filter.league = league;
  if (size) Object.assign(filter, buildProductSizeFilter(size));
  if (isActive !== undefined) filter.is_active = isActive;
  if (inStock) Object.assign(filter, buildProductInStockFilter());

  return filter;
}

export function buildAdminSearchTextMatch(query: string): Record<string, unknown> {
  const pattern = buildFlexibleSearchRegexPattern(query);
  return {
    $or: [
      { name: { $regex: pattern, $options: "i" } },
      { description: { $regex: pattern, $options: "i" } },
      { team: { $regex: pattern, $options: "i" } },
      { league: { $regex: pattern, $options: "i" } },
      { season: { $regex: pattern, $options: "i" } },
    ],
  };
}

export function buildProductSizeFilter(size: string): Record<string, unknown> {
  const trimmed = size.trim();
  if (!trimmed) return {};

  return {
    $or: [
      { [`stock_by_sizes.${trimmed}`]: { $gt: 0 } },
      { size: trimmed, stock: { $gt: 0 } },
    ],
  };
}
