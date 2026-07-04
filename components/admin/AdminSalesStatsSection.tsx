"use client";

import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminStatsBarChart from "@/components/admin/charts/AdminStatsBarChart";
import AdminStatsPanelGrid from "@/components/admin/AdminStatsPanelGrid";
import AdminStatsSkeleton from "@/components/admin/AdminStatsSkeleton";
import AdminStatsTable from "@/components/admin/AdminStatsTable";
import { ADMIN_TABLE_CELL_CLASS } from "@/components/admin/AdminTable";
import type { AdminSalesStats } from "@/lib/api";
import {
  ADMIN_STATS_PERIOD_LABELS,
  ADMIN_STATS_PERIOD_ORDER,
} from "@/lib/admin-stats-display";
import { formatPrice } from "@/lib/utils";
import { mapToChartData } from "@/lib/admin-chart-data";

type AdminSalesStatsSectionProps = {
  stats: AdminSalesStats | null;
  isLoading?: boolean;
  error?: string;
};

export default function AdminSalesStatsSection({
  stats,
  isLoading = false,
  error = "",
}: AdminSalesStatsSectionProps) {
  const allTime = stats?.periods.all_time;
  const periodRows = stats
    ? ADMIN_STATS_PERIOD_ORDER.map((periodKey) => ({
        id: periodKey,
        label: ADMIN_STATS_PERIOD_LABELS[periodKey],
        ...stats.periods[periodKey],
      }))
    : [];

  if (isLoading) {
    return <AdminStatsSkeleton tab="sales" />;
  }

  if (error) {
    return (
      <Typography variant="body2" color="destructive">
        {error}
      </Typography>
    );
  }

  if (!stats || !allTime) return null;

  return (
    <Box display="flex" direction="col" gap="4" align="stretch" className="w-full min-w-0">
      <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label="Total vendido"
          value={formatPrice(allTime.revenue)}
          hint="Todo el período"
        />
        <AdminStatCard
          label="Ventas"
          value={String(allTime.sales_count)}
          hint="Operaciones registradas"
        />
        <AdminStatCard
          label="Unidades"
          value={String(allTime.units)}
          hint="Camisetas vendidas"
        />
        <AdminStatCard
          label="Ticket promedio"
          value={formatPrice(allTime.average_ticket)}
          hint="Total / cantidad de ventas"
        />
      </div>

      <AdminStatsPanelGrid>
        <AdminStatsTable
          title="Por período"
          rows={periodRows}
          getRowKey={(row) => row.id}
          columns={[
            {
              id: "period",
              header: "Período",
              mobileLabel: "Período",
              mobileFullWidth: true,
              cell: (row) => row.label,
            },
            {
              id: "sales",
              header: "Ventas",
              mobileLabel: "Ventas",
              cellClassName: `${ADMIN_TABLE_CELL_CLASS} tabular-nums`,
              cell: (row) => row.sales_count,
            },
            {
              id: "units",
              header: "Unidades",
              mobileLabel: "Unidades",
              cellClassName: `${ADMIN_TABLE_CELL_CLASS} tabular-nums`,
              cell: (row) => row.units,
            },
            {
              id: "revenue",
              header: "Total",
              mobileLabel: "Total",
              cellClassName: `${ADMIN_TABLE_CELL_CLASS} tabular-nums`,
              cell: (row) => formatPrice(row.revenue),
            },
            {
              id: "average",
              header: "Ticket prom.",
              mobileLabel: "Ticket prom.",
              cellClassName: `${ADMIN_TABLE_CELL_CLASS} tabular-nums`,
              cell: (row) => formatPrice(row.average_ticket),
            },
          ]}
        />
      </AdminStatsPanelGrid>

      <AdminStatsPanelGrid>
        <AdminStatsBarChart
          title="Total vendido por período"
          data={mapToChartData(periodRows, (row) => row.label, (row) => row.revenue)}
          valueFormatter={formatPrice}
          valueLabel="Total"
          coloredBars
        />
      </AdminStatsPanelGrid>
    </Box>
  );
}
