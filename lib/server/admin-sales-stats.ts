import type { Collection } from "mongodb";
import type { SaleDocument } from "@/lib/server/models";
import {
  ADMIN_STATS_PERIOD_KEYS,
  buildAdminStatsDateMatch,
  buildAverageTicket,
  getAdminStatsPeriodStart,
  saleUnitCountAddFields,
  type AdminStatsPeriodKey,
} from "@/lib/server/admin-stats-shared";

export type AdminSalesPeriodStats = {
  sales_count: number;
  revenue: number;
  units: number;
  average_ticket: number;
};

export type AdminSalesStats = {
  periods: Record<AdminStatsPeriodKey, AdminSalesPeriodStats>;
};

async function aggregateSalesPeriod(
  collection: Collection<SaleDocument>,
  period: AdminStatsPeriodKey
): Promise<AdminSalesPeriodStats> {
  const since = getAdminStatsPeriodStart(period);
  const [result] = await collection
    .aggregate<{ sales_count: number; revenue: number; units: number }>([
      { $match: buildAdminStatsDateMatch(since) },
      { $addFields: saleUnitCountAddFields },
      {
        $group: {
          _id: null,
          sales_count: { $sum: 1 },
          revenue: { $sum: "$revenue" },
          units: { $sum: "$unit_count" },
        },
      },
    ])
    .toArray();

  const sales_count = result?.sales_count ?? 0;
  const revenue = result?.revenue ?? 0;
  const units = result?.units ?? 0;

  return {
    sales_count,
    revenue,
    units,
    average_ticket: buildAverageTicket(revenue, sales_count),
  };
}

export async function getAdminSalesStats(
  collection: Collection<SaleDocument>
): Promise<AdminSalesStats> {
  const periodEntries = await Promise.all(
    ADMIN_STATS_PERIOD_KEYS.map(async (period) => [period, await aggregateSalesPeriod(collection, period)] as const)
  );

  return {
    periods: Object.fromEntries(periodEntries) as Record<AdminStatsPeriodKey, AdminSalesPeriodStats>,
  };
}
