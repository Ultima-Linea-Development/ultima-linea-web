import type { Collection } from "mongodb";
import type { SaleDocument } from "@/lib/server/models";
import { getUsersByIds } from "@/lib/server/users";
import {
  buildUserDisplayNameMap,
  UNKNOWN_USER_LABEL,
} from "@/lib/user-display";
import {
  saleSellerTypeAddFields,
  saleUnitCountAddFields,
} from "@/lib/server/admin-stats-shared";

export type AdminSellerTypeSummary = {
  sellers_count: number;
  sales_count: number;
  revenue: number;
  units: number;
};

export type AdminSellerRankingEntry = {
  seller_type: "internal" | "external";
  seller_id: string;
  seller_name: string;
  sales_count: number;
  revenue: number;
  units: number;
};

export type AdminSellerStats = {
  internal: AdminSellerTypeSummary;
  external: AdminSellerTypeSummary;
  ranking: AdminSellerRankingEntry[];
};

const EMPTY_SUMMARY: AdminSellerTypeSummary = {
  sellers_count: 0,
  sales_count: 0,
  revenue: 0,
  units: 0,
};

function resolveSellerName(
  sellerType: "internal" | "external",
  sellerKey: string,
  sellerNameFallback: string,
  userLabels: Map<string, string>
): string {
  if (sellerType === "external") {
    return sellerNameFallback || sellerKey || "Vendedor externo";
  }

  const normalizedKey = sellerKey.trim();
  return userLabels.get(normalizedKey) || UNKNOWN_USER_LABEL;
}

export async function getAdminSellerStats(
  collection: Collection<SaleDocument>
): Promise<AdminSellerStats> {
  const [summaryRows, rankingRows] = await Promise.all([
    collection
      .aggregate<{
        _id: "internal" | "external";
        sellers_count: number;
        sales_count: number;
        revenue: number;
        units: number;
      }>([
        { $addFields: { ...saleUnitCountAddFields, ...saleSellerTypeAddFields } },
        { $match: { seller_key: { $ne: "" } } },
        {
          $group: {
            _id: { type: "$seller_type", key: "$seller_key" },
            sales_count: { $sum: 1 },
            revenue: { $sum: "$revenue" },
            units: { $sum: "$unit_count" },
          },
        },
        {
          $group: {
            _id: "$_id.type",
            sellers_count: { $sum: 1 },
            sales_count: { $sum: "$sales_count" },
            revenue: { $sum: "$revenue" },
            units: { $sum: "$units" },
          },
        },
      ])
      .toArray(),
    collection
      .aggregate<{
        _id: {
          type: "internal" | "external";
          key: string;
          name: string;
        };
        sales_count: number;
        revenue: number;
        units: number;
      }>([
        { $addFields: { ...saleUnitCountAddFields, ...saleSellerTypeAddFields } },
        { $match: { seller_key: { $ne: "" } } },
        {
          $group: {
            _id: {
              type: "$seller_type",
              key: "$seller_key",
              name: "$seller_name_fallback",
            },
            sales_count: { $sum: 1 },
            revenue: { $sum: "$revenue" },
            units: { $sum: "$unit_count" },
          },
        },
        { $sort: { revenue: -1, sales_count: -1 } },
        { $limit: 10 },
      ])
      .toArray(),
  ]);

  const internalSellerIds = rankingRows
    .filter((row) => row._id.type === "internal")
    .map((row) => row._id.key.trim());

  const sellerUsers = await getUsersByIds(internalSellerIds);
  const userLabels = buildUserDisplayNameMap(sellerUsers);

  const internalRow = summaryRows.find((row) => row._id === "internal");
  const externalRow = summaryRows.find((row) => row._id === "external");

  const mapSummaryRow = (row?: {
    sellers_count: number;
    sales_count: number;
    revenue: number;
    units: number;
  }): AdminSellerTypeSummary =>
    row
      ? {
          sellers_count: row.sellers_count ?? 0,
          sales_count: row.sales_count ?? 0,
          revenue: row.revenue ?? 0,
          units: row.units ?? 0,
        }
      : EMPTY_SUMMARY;

  return {
    internal: mapSummaryRow(internalRow),
    external: mapSummaryRow(externalRow),
    ranking: rankingRows.map((row) => ({
      seller_type: row._id.type,
      seller_id: row._id.key,
      seller_name: resolveSellerName(
        row._id.type,
        row._id.key,
        row._id.name,
        userLabels
      ),
      sales_count: row.sales_count,
      revenue: row.revenue,
      units: row.units,
    })),
  };
}
