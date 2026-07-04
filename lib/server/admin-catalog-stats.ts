import type { Collection } from "mongodb";
import { sortSizeLabels } from "@/lib/product-inventory";
import { nonDeletedProductFilter } from "@/lib/server/products";
import type { ProductDocument } from "@/lib/server/models";

export type AdminCatalogStats = {
  products: {
    total: number;
    active: number;
    inactive: number;
  };
  units: {
    total: number;
    active: number;
    inactive: number;
    by_size: Record<string, number>;
    by_type: Record<string, number>;
  };
};

const activeProductFilter = { ...nonDeletedProductFilter, is_active: true };
const inactiveProductFilter = { ...nonDeletedProductFilter, is_active: false };

function recordsFromGroupedRows(
  rows: Array<{ _id: unknown; total?: number; count?: number }>,
  valueKey: "total" | "count" = "total"
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const row of rows) {
    const key = typeof row._id === "string" ? row._id.trim() : "";
    if (!key) continue;
    result[key] = (row[valueKey] as number) ?? 0;
  }
  return result;
}

function countFromGroupedRows(
  rows: Array<{ _id: boolean | null; count: number }>
): { active: number; inactive: number } {
  let active = 0;
  let inactive = 0;
  for (const row of rows) {
    if (row._id === true) active = row.count;
    if (row._id === false) inactive = row.count;
  }
  return { active, inactive };
}

function sumFromGroupedRows(
  rows: Array<{ _id: boolean | null; total: number }>
): { active: number; inactive: number } {
  let active = 0;
  let inactive = 0;
  for (const row of rows) {
    if (row._id === true) active = row.total;
    if (row._id === false) inactive = row.total;
  }
  return { active, inactive };
}

function sortSizeRecord(bySize: Record<string, number>): Record<string, number> {
  const sorted: Record<string, number> = {};
  for (const size of sortSizeLabels(Object.keys(bySize))) {
    sorted[size] = bySize[size] ?? 0;
  }
  return sorted;
}

export async function getAdminCatalogStats(
  collection: Collection<ProductDocument>
): Promise<AdminCatalogStats> {
  const [facetResult] = await collection
    .aggregate<{
      product_counts: Array<{ _id: boolean | null; count: number }>;
      unit_totals: Array<{ _id: boolean | null; total: number }>;
      by_size: Array<{ _id: string; total: number }>;
      by_type: Array<{ _id: string; total: number }>;
    }>([
      {
        $facet: {
          product_counts: [
            { $match: nonDeletedProductFilter },
            { $group: { _id: "$is_active", count: { $sum: 1 } } },
          ],
          unit_totals: [
            { $match: nonDeletedProductFilter },
            {
              $group: {
                _id: "$is_active",
                total: { $sum: { $ifNull: ["$stock", 0] } },
              },
            },
          ],
          by_size: [
            { $match: activeProductFilter },
            {
              $project: {
                size_entries: {
                  $cond: {
                    if: {
                      $gt: [
                        { $size: { $objectToArray: { $ifNull: ["$stock_by_sizes", {}] } } },
                        0,
                      ],
                    },
                    then: { $objectToArray: "$stock_by_sizes" },
                    else: {
                      $cond: {
                        if: { $gt: [{ $ifNull: ["$stock", 0] }, 0] },
                        then: [{ k: { $ifNull: ["$size", "—"] }, v: "$stock" }],
                        else: [],
                      },
                    },
                  },
                },
              },
            },
            { $unwind: "$size_entries" },
            {
              $group: {
                _id: "$size_entries.k",
                total: { $sum: "$size_entries.v" },
              },
            },
          ],
          by_type: [
            { $match: activeProductFilter },
            {
              $group: {
                _id: "$type",
                total: { $sum: { $ifNull: ["$stock", 0] } },
              },
            },
          ],
        },
      },
    ])
    .toArray();

  const productCounts = countFromGroupedRows(facetResult?.product_counts ?? []);
  const unitTotals = sumFromGroupedRows(facetResult?.unit_totals ?? []);
  const bySize = sortSizeRecord(recordsFromGroupedRows(facetResult?.by_size ?? []));
  const byType = recordsFromGroupedRows(facetResult?.by_type ?? []);

  return {
    products: {
      total: productCounts.active + productCounts.inactive,
      active: productCounts.active,
      inactive: productCounts.inactive,
    },
    units: {
      total: unitTotals.active + unitTotals.inactive,
      active: unitTotals.active,
      inactive: unitTotals.inactive,
      by_size: bySize,
      by_type: byType,
    },
  };
}
