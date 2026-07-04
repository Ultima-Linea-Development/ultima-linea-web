"use client";

import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminStatsBarChart from "@/components/admin/charts/AdminStatsBarChart";
import AdminStatsPieChart from "@/components/admin/charts/AdminStatsPieChart";
import AdminStatsTable from "@/components/admin/AdminStatsTable";
import AdminStatsPanelGrid from "@/components/admin/AdminStatsPanelGrid";
import { ADMIN_TABLE_CELL_CLASS } from "@/components/admin/AdminTable";
import Spinner from "@/components/ui/Spinner";
import type { AdminSellerStats } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { mapToChartData } from "@/lib/admin-chart-data";

type AdminSellerStatsSectionProps = {
  stats: AdminSellerStats | null;
  isLoading?: boolean;
  error?: string;
};

export default function AdminSellerStatsSection({
  stats,
  isLoading = false,
  error = "",
}: AdminSellerStatsSectionProps) {
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

  const sellerTypeData = [
    { label: "Internos", value: stats.internal.revenue },
    { label: "Externos", value: stats.external.revenue },
  ].filter((item) => item.value > 0);

  const rankingChartData = mapToChartData(
    stats.ranking,
    (entry) => entry.seller_name,
    (entry) => entry.revenue
  );

  return (
    <Box display="flex" direction="col" gap="4" align="stretch" className="w-full min-w-0">
      <div className="grid w-full min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
        <AdminStatCard
          label="Vendedores internos"
          value={formatPrice(stats.internal.revenue)}
          hint={`${stats.internal.sellers_count} vendedores · ${stats.internal.sales_count} ventas · ${stats.internal.units} uds.`}
        />
        <AdminStatCard
          label="Vendedores externos"
          value={formatPrice(stats.external.revenue)}
          hint={`${stats.external.sellers_count} vendedores · ${stats.external.sales_count} ventas · ${stats.external.units} uds.`}
        />
      </div>

      <AdminStatsPanelGrid>
        <AdminStatsTable
          title="Detalle del ranking"
          rows={stats.ranking}
          getRowKey={(row) => `${row.seller_type}-${row.seller_id}`}
          emptyMessage="Sin ventas registradas por vendedor."
          columns={[
            {
              id: "rank",
              header: "#",
              mobileLabel: "#",
              cellClassName: `${ADMIN_TABLE_CELL_CLASS} tabular-nums`,
              cell: (_row, index) => index + 1,
            },
            {
              id: "seller",
              header: "Vendedor",
              mobileLabel: "Vendedor",
              mobileFullWidth: true,
              cell: (row) => row.seller_name,
            },
            {
              id: "type",
              header: "Tipo",
              mobileLabel: "Tipo",
              cell: (row) => (row.seller_type === "internal" ? "Interno" : "Externo"),
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
          ]}
        />
      </AdminStatsPanelGrid>

      <AdminStatsPanelGrid>
        <AdminStatsPieChart
          title="Facturación por tipo de vendedor"
          data={sellerTypeData}
          valueFormatter={formatPrice}
          valueLabel="Total"
        />
        <AdminStatsBarChart
          title="Ranking por total vendido"
          data={rankingChartData}
          layout="horizontal"
          valueFormatter={formatPrice}
          valueLabel="Total"
          emptyMessage="Sin ventas registradas por vendedor."
          coloredBars
        />
      </AdminStatsPanelGrid>
    </Box>
  );
}
