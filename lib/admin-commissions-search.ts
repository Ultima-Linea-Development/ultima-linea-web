import type { Commission, SaleAssignableUser } from "@/lib/api";
import { commissionMatchesQuery } from "@/lib/commission-display";
import { buildFlexibleSearchRegexPattern } from "@/lib/search-normalization";

export function buildAdminCommissionsSearchTextMatch(
  query: string,
  sellerUserIds: string[] = []
): Record<string, unknown> {
  const pattern = buildFlexibleSearchRegexPattern(query);
  if (!pattern) return {};

  const orConditions: Record<string, unknown>[] = [
    { name: { $regex: pattern, $options: "i" } },
    { customer_name: { $regex: pattern, $options: "i" } },
    { customer_contact: { $regex: pattern, $options: "i" } },
    { external_seller_name: { $regex: pattern, $options: "i" } },
    { supplier_order_name: { $regex: pattern, $options: "i" } },
    { notes: { $regex: pattern, $options: "i" } },
    { "items.shirt_name": { $regex: pattern, $options: "i" } },
    { "items.dorsal": { $regex: pattern, $options: "i" } },
    { "items.description": { $regex: pattern, $options: "i" } },
  ];

  if (sellerUserIds.length > 0) {
    orConditions.push({ seller_user_id: { $in: sellerUserIds } });
  }

  return { $or: orConditions };
}

export function filterCommissionsByQuery(
  commissions: Commission[],
  query: string,
  limit = 8,
  assignableUsers: SaleAssignableUser[] = []
): Commission[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const matches = commissions.filter((commission) =>
    commissionMatchesQuery(commission, trimmed, assignableUsers)
  );

  return matches.slice(0, limit);
}
