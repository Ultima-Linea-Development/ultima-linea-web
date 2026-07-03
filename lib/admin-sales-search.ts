import type { Sale, SaleAssignableUser } from "@/lib/api";
import { normalizeSaleSearchQuery, saleMatchesQuery } from "@/lib/sale-items";
import { buildFlexibleSearchRegexPattern, matchesNormalizedSearch } from "@/lib/search-normalization";
import { formatAssignableUserLabel } from "@/lib/user-display";

export type AdminSaleSearchSuggestionItem =
  | { kind: "user"; user: SaleAssignableUser }
  | { kind: "sale"; sale: Sale };

export function filterAssignableUsersForSalesSearch(
  users: SaleAssignableUser[],
  query: string,
  limit = 3
): SaleAssignableUser[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  return users
    .filter((user) =>
      matchesNormalizedSearch(
        [
          formatAssignableUserLabel(user),
          user.email,
          user.first_name,
          user.last_name,
        ],
        trimmed
      )
    )
    .slice(0, limit);
}

export function buildAdminSaleSearchSuggestions(
  query: string,
  sales: Sale[],
  assignableUsers: SaleAssignableUser[],
  limit = 8
): AdminSaleSearchSuggestionItem[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const userItems: AdminSaleSearchSuggestionItem[] = filterAssignableUsersForSalesSearch(
    assignableUsers,
    trimmed,
    3
  ).map((user) => ({ kind: "user", user }));

  const remaining = Math.max(0, limit - userItems.length);
  const saleItems: AdminSaleSearchSuggestionItem[] = filterSalesByQuery(
    sales,
    trimmed,
    remaining,
    assignableUsers
  ).map((sale) => ({ kind: "sale", sale }));

  return [...userItems, ...saleItems];
}

export function buildAdminSalesSearchTextMatch(
  query: string,
  sellerUserIds: string[] = []
): Record<string, unknown> {
  const pattern = buildFlexibleSearchRegexPattern(normalizeSaleSearchQuery(query));
  const orConditions: Record<string, unknown>[] = [
    { product_name: { $regex: pattern, $options: "i" } },
    { product_sku: { $regex: pattern, $options: "i" } },
    { size: { $regex: pattern, $options: "i" } },
    { "items.product_name": { $regex: pattern, $options: "i" } },
    { "items.product_sku": { $regex: pattern, $options: "i" } },
    { "items.size": { $regex: pattern, $options: "i" } },
    { external_seller_name: { $regex: pattern, $options: "i" } },
    { transfer_alias: { $regex: pattern, $options: "i" } },
    { description: { $regex: pattern, $options: "i" } },
  ];

  if (sellerUserIds.length > 0) {
    orConditions.push({ created_by: { $in: sellerUserIds } });
  }

  return { $or: orConditions };
}

export function filterSalesByQuery(
  sales: Sale[],
  query: string,
  limit = 8,
  assignableUsers: SaleAssignableUser[] = []
): Sale[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  return sales
    .filter((sale) => saleMatchesQuery(sale, trimmed, assignableUsers))
    .slice(0, limit);
}
