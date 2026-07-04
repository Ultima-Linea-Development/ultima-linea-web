export type AdminStatsPeriodKey = "all_time" | "last_7_days" | "last_30_days" | "this_month";

export const ADMIN_STATS_PERIOD_KEYS: AdminStatsPeriodKey[] = [
  "all_time",
  "last_7_days",
  "last_30_days",
  "this_month",
];

export function getAdminStatsPeriodStart(period: AdminStatsPeriodKey): Date | null {
  if (period === "all_time") return null;

  const now = new Date();

  if (period === "last_7_days") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  if (period === "last_30_days") {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function buildAdminStatsDateMatch(since: Date | null): Record<string, unknown> {
  if (!since) return {};
  return { created_at: { $gte: since } };
}

export const saleUnitCountAddFields = {
  unit_count: {
    $cond: {
      if: { $gt: [{ $size: { $ifNull: ["$items", []] } }, 0] },
      then: { $sum: "$items.quantity" },
      else: { $ifNull: ["$quantity", 0] },
    },
  },
  revenue: { $ifNull: ["$total", 0] },
};

export const lineItemsEstimatedTotalAddFields = {
  estimated_total: {
    $sum: {
      $map: {
        input: { $ifNull: ["$items", []] },
        as: "item",
        in: {
          $multiply: [
            { $ifNull: ["$$item.price", 0] },
            { $ifNull: ["$$item.quantity", 0] },
          ],
        },
      },
    },
  },
};

export const saleSellerTypeAddFields = {
  seller_type: {
    $cond: {
      if: {
        $or: [
          { $ifNull: ["$external_seller_id", false] },
          { $gt: [{ $strLenCP: { $ifNull: ["$external_seller_name", ""] } }, 0] },
        ],
      },
      then: "external",
      else: "internal",
    },
  },
  seller_key: {
    $cond: {
      if: {
        $or: [
          { $ifNull: ["$external_seller_id", false] },
          { $gt: [{ $strLenCP: { $ifNull: ["$external_seller_name", ""] } }, 0] },
        ],
      },
      then: {
        $ifNull: ["$external_seller_id", { $trim: { input: { $ifNull: ["$external_seller_name", ""] } } }],
      },
      else: { $ifNull: ["$created_by", ""] },
    },
  },
  seller_name_fallback: { $trim: { input: { $ifNull: ["$external_seller_name", ""] } } },
};

export function buildAverageTicket(revenue: number, salesCount: number): number {
  if (salesCount <= 0) return 0;
  return revenue / salesCount;
}

export function emptyStatusStats(): { count: number; estimated_total: number } {
  return { count: 0, estimated_total: 0 };
}
