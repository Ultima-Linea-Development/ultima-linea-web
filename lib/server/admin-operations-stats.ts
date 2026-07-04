import type { Collection } from "mongodb";
import type {
  CommissionDocument,
  CommissionStatus,
  SupplierOrderDocument,
  SupplierOrderStatus,
} from "@/lib/server/models";
import {
  emptyStatusStats,
  lineItemsEstimatedTotalAddFields,
} from "@/lib/server/admin-stats-shared";

export type AdminOperationsStatusStats = {
  count: number;
  estimated_total: number;
};

export type AdminOperationsStats = {
  commissions: {
    by_status: Record<CommissionStatus, AdminOperationsStatusStats>;
    pending: AdminOperationsStatusStats;
    in_progress: AdminOperationsStatusStats;
  };
  orders: {
    by_status: Record<SupplierOrderStatus, AdminOperationsStatusStats>;
    pending: AdminOperationsStatusStats;
    in_progress: AdminOperationsStatusStats;
  };
  summary: {
    pending: AdminOperationsStatusStats;
    in_progress: AdminOperationsStatusStats;
  };
};

const COMMISSION_STATUSES: CommissionStatus[] = ["pending", "exported", "cancelled"];
const ORDER_STATUSES: SupplierOrderStatus[] = [
  "draft",
  "sent",
  "partial",
  "completed",
  "cancelled",
];

function rowsToStatusMap<T extends string>(
  statuses: T[],
  rows: Array<{ _id: T; count: number; estimated_total: number }>
): Record<T, AdminOperationsStatusStats> {
  const map = Object.fromEntries(statuses.map((status) => [status, emptyStatusStats()])) as Record<
    T,
    AdminOperationsStatusStats
  >;

  for (const row of rows) {
    if (!row._id) continue;
    map[row._id] = {
      count: row.count ?? 0,
      estimated_total: row.estimated_total ?? 0,
    };
  }

  return map;
}

function sumStatusStats(
  map: Record<string, AdminOperationsStatusStats>,
  statuses: string[]
): AdminOperationsStatusStats {
  return statuses.reduce(
    (acc, status) => {
      const current = map[status] ?? emptyStatusStats();
      return {
        count: acc.count + current.count,
        estimated_total: acc.estimated_total + current.estimated_total,
      };
    },
    emptyStatusStats()
  );
}

async function aggregateCommissionsByStatus(
  collection: Collection<CommissionDocument>
): Promise<Array<{ _id: CommissionStatus; count: number; estimated_total: number }>> {
  return collection
    .aggregate<{ _id: CommissionStatus; count: number; estimated_total: number }>([
      { $addFields: lineItemsEstimatedTotalAddFields },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          estimated_total: { $sum: "$estimated_total" },
        },
      },
    ])
    .toArray();
}

async function aggregateOrdersByStatus(
  collection: Collection<SupplierOrderDocument>
): Promise<Array<{ _id: SupplierOrderStatus; count: number; estimated_total: number }>> {
  return collection
    .aggregate<{ _id: SupplierOrderStatus; count: number; estimated_total: number }>([
      { $addFields: lineItemsEstimatedTotalAddFields },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          estimated_total: { $sum: "$estimated_total" },
        },
      },
    ])
    .toArray();
}

export async function getAdminOperationsStats(
  commissionsCollection: Collection<CommissionDocument>,
  ordersCollection: Collection<SupplierOrderDocument>
): Promise<AdminOperationsStats> {
  const [commissionRows, orderRows] = await Promise.all([
    aggregateCommissionsByStatus(commissionsCollection),
    aggregateOrdersByStatus(ordersCollection),
  ]);

  const commissionsByStatus = rowsToStatusMap(COMMISSION_STATUSES, commissionRows);
  const ordersByStatus = rowsToStatusMap(ORDER_STATUSES, orderRows);

  const commissionsPending = commissionsByStatus.pending;
  const commissionsInProgress = commissionsByStatus.exported;
  const ordersPending = ordersByStatus.draft;
  const ordersInProgress = sumStatusStats(ordersByStatus, ["sent", "partial"]);

  return {
    commissions: {
      by_status: commissionsByStatus,
      pending: commissionsPending,
      in_progress: commissionsInProgress,
    },
    orders: {
      by_status: ordersByStatus,
      pending: ordersPending,
      in_progress: ordersInProgress,
    },
    summary: {
      pending: {
        count: commissionsPending.count + ordersPending.count,
        estimated_total:
          commissionsPending.estimated_total + ordersPending.estimated_total,
      },
      in_progress: {
        count: commissionsInProgress.count + ordersInProgress.count,
        estimated_total:
          commissionsInProgress.estimated_total + ordersInProgress.estimated_total,
      },
    },
  };
}
