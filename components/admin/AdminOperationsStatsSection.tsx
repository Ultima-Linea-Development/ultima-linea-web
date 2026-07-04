"use client";

import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminStatsBarChart from "@/components/admin/charts/AdminStatsBarChart";
import AdminStatsTable from "@/components/admin/AdminStatsTable";
import AdminStatsPanelGrid from "@/components/admin/AdminStatsPanelGrid";
import { ADMIN_TABLE_CELL_CLASS } from "@/components/admin/AdminTable";
import Spinner from "@/components/ui/Spinner";
import type { AdminOperationsStats } from "@/lib/api";
import {
  ADMIN_COMMISSION_STATUS_ORDER,
  ADMIN_ORDER_STATUS_ORDER,
  getAdminCommissionStatusLabel,
  getAdminOrderStatusLabel,
} from "@/lib/admin-stats-display";
import { formatPrice } from "@/lib/utils";
import { mapToChartData } from "@/lib/admin-chart-data";

type AdminOperationsStatsSectionProps = {
  stats: AdminOperationsStats | null;
  isLoading?: boolean;
  error?: string;
};

type StatusRow = {
  id: string;
  label: string;
  count: number;
  estimated_total: number;
};

export default function AdminOperationsStatsSection({
  stats,
  isLoading = false,
  error = "",
}: AdminOperationsStatsSectionProps) {
  const commissionRows: StatusRow[] = stats
    ? ADMIN_COMMISSION_STATUS_ORDER.map((status) => ({
        id: status,
        label: getAdminCommissionStatusLabel(status),
        count: stats.commissions.by_status[status].count,
        estimated_total: stats.commissions.by_status[status].estimated_total,
      }))
    : [];

  const orderRows: StatusRow[] = stats
    ? ADMIN_ORDER_STATUS_ORDER.map((status) => ({
        id: status,
        label: getAdminOrderStatusLabel(status),
        count: stats.orders.by_status[status].count,
        estimated_total: stats.orders.by_status[status].estimated_total,
      }))
    : [];

  const statusTableColumns = [
    {
      id: "status",
      header: "Estado",
      mobileLabel: "Estado",
      mobileFullWidth: true,
      cell: (row: StatusRow) => row.label,
    },
    {
      id: "count",
      header: "Registros",
      mobileLabel: "Registros",
      cellClassName: `${ADMIN_TABLE_CELL_CLASS} tabular-nums`,
      cell: (row: StatusRow) =>
        `${row.count} ${row.count === 1 ? "registro" : "registros"}`,
    },
    {
      id: "total",
      header: "Monto estimado",
      mobileLabel: "Monto estimado",
      cellClassName: `${ADMIN_TABLE_CELL_CLASS} tabular-nums`,
      cell: (row: StatusRow) => formatPrice(row.estimated_total),
    },
  ] as const;

  if (isLoading) {
    return (
      <Box display="flex" className="min-h-[6rem] items-center justify-center">
        <Spinner fullscreen={false} />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="destructive">
        {error}
      </Typography>
    );
  }

  if (!stats) return null;

  return (
    <Box display="flex" direction="col" gap="4" align="stretch" className="w-full min-w-0">
      <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <AdminStatCard
          label="Pendientes"
          value={String(stats.summary.pending.count)}
          hint={`Monto estimado: ${formatPrice(stats.summary.pending.estimated_total)}`}
        />
        <AdminStatCard
          label="En curso"
          value={String(stats.summary.in_progress.count)}
          hint={`Monto estimado: ${formatPrice(stats.summary.in_progress.estimated_total)}`}
        />
      </div>

      <AdminStatsPanelGrid>
        <AdminStatsTable
          title="Encargos"
          rows={commissionRows}
          getRowKey={(row) => row.id}
          columns={[...statusTableColumns]}
        />

        <AdminStatsTable
          title="Pedidos"
          rows={orderRows}
          getRowKey={(row) => row.id}
          columns={[...statusTableColumns]}
        />
      </AdminStatsPanelGrid>

      <AdminStatsPanelGrid>
        <AdminStatsBarChart
          title="Encargos por monto estimado"
          data={mapToChartData(
            commissionRows,
            (row) => row.label,
            (row) => row.estimated_total
          )}
          valueFormatter={formatPrice}
          valueLabel="Monto"
          coloredBars
        />
        <AdminStatsBarChart
          title="Pedidos por monto estimado"
          data={mapToChartData(orderRows, (row) => row.label, (row) => row.estimated_total)}
          valueFormatter={formatPrice}
          valueLabel="Monto"
          coloredBars
        />
      </AdminStatsPanelGrid>
    </Box>
  );
}
