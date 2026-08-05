import { buildFlexibleSearchRegexPattern } from "@/lib/search-normalization";

export function parseIsActiveFilterParam(value: string | null): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export function parseInStockFilterParam(value: string | null): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export function parseReservedFilterParam(value: string | null): boolean {
  return value === "true";
}

export function buildProductInStockFilter(): Record<string, unknown> {
  return { stock: { $gt: 0 } };
}

export function buildProductOutOfStockFilter(): Record<string, unknown> {
  return {
    $or: [{ stock: { $lte: 0 } }, { stock: { $exists: false } }, { stock: null }],
  };
}

/** Alineado con `isProductReserved` (entries canónicas + legacy). */
export function buildProductReservedFilter(): Record<string, unknown> {
  const activeSellerField = {
    $or: [
      { reserved_for_user_id: { $type: "string", $ne: "" } },
      { reserved_for_external_seller_id: { $type: "string", $ne: "" } },
      { reserved_for_external_seller_name: { $type: "string", $ne: "" } },
    ],
  };

  return {
    $or: [
      {
        catalog_reservation_entries: {
          $elemMatch: {
            quantity: { $gt: 0 },
            ...activeSellerField,
          },
        },
      },
      { reserved_for_user_id: { $type: "string", $ne: "" } },
      { reserved_for_external_seller_id: { $type: "string", $ne: "" } },
      { reserved_for_external_seller_name: { $type: "string", $ne: "" } },
      { reserved_by_sizes: { $exists: true, $ne: {} } },
    ],
  };
}

export function buildAdminCatalogMongoFilter(
  searchParams: URLSearchParams
): Record<string, unknown> {
  const showDeleted = searchParams.get("deleted") === "true";
  const clauses: Record<string, unknown>[] = [
    showDeleted
      ? { deleted_at: { $exists: true } }
      : { deleted_at: { $exists: false } },
  ];

  const team = searchParams.get("team");
  const league = searchParams.get("league");
  const size = searchParams.get("size");
  const isActive = parseIsActiveFilterParam(searchParams.get("is_active"));
  const inStock = parseInStockFilterParam(searchParams.get("in_stock"));
  const reserved = parseReservedFilterParam(searchParams.get("reserved"));

  if (team) {
    clauses.push({
      team: { $regex: buildFlexibleSearchRegexPattern(team), $options: "i" },
    });
  }
  if (league) clauses.push({ league });
  if (size) clauses.push(buildProductSizeFilter(size));
  if (isActive !== undefined) clauses.push({ is_active: isActive });
  if (inStock === true) clauses.push(buildProductInStockFilter());
  if (inStock === false) clauses.push(buildProductOutOfStockFilter());
  if (reserved) clauses.push(buildProductReservedFilter());

  return clauses.length === 1 ? clauses[0] : { $and: clauses };
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
