"use client";

import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminStatsBarChart from "@/components/admin/charts/AdminStatsBarChart";
import AdminStatsPieChart from "@/components/admin/charts/AdminStatsPieChart";
import AdminStatsTable from "@/components/admin/AdminStatsTable";
import AdminStatsSkeleton from "@/components/admin/AdminStatsSkeleton";
import AdminStatsPanelGrid from "@/components/admin/AdminStatsPanelGrid";
import { ADMIN_TABLE_CELL_CLASS } from "@/components/admin/AdminTable";
import type { AdminCatalogStats } from "@/lib/api";
import { recordToChartData } from "@/lib/admin-chart-data";
import { getAdminProductTypeLabel } from "@/lib/admin-stats-display";

type AdminCatalogStatsSectionProps = {
  stats: AdminCatalogStats | null;
  isLoading?: boolean;
  error?: string;
};

type CatalogBreakdownRow = {
  id: string;
  label: string;
  stock: number;
};

export default function AdminCatalogStatsSection({
  stats,
  isLoading = false,
  error = "",
}: AdminCatalogStatsSectionProps) {
  const sizeRows: CatalogBreakdownRow[] = stats
    ? Object.entries(stats.units.by_size)
        .filter(([, value]) => value > 0)
        .map(([size, stock]) => ({ id: size, label: size, stock }))
    : [];
  const typeRows: CatalogBreakdownRow[] = stats
    ? Object.entries(stats.units.by_type)
        .filter(([, value]) => value > 0)
        .map(([type, stock]) => ({
          id: type,
          label: getAdminProductTypeLabel(type),
          stock,
        }))
    : [];
  const sizeChartData = stats ? recordToChartData(stats.units.by_size) : [];
  const typeChartData = stats ? recordToChartData(stats.units.by_type) : [];

  const breakdownColumns = [
    {
      id: "label",
      header: "Categoría",
      mobileLabel: "Categoría",
      mobileFullWidth: true,
      cell: (row: CatalogBreakdownRow) => row.label,
    },
    {
      id: "stock",
      header: "Unidades",
      mobileLabel: "Unidades",
      cellClassName: `${ADMIN_TABLE_CELL_CLASS} tabular-nums`,
      cell: (row: CatalogBreakdownRow) => row.stock,
    },
  ] as const;

  if (isLoading) {
    return <AdminStatsSkeleton tab="catalog" />;
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
      <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label="Productos"
          value={String(stats.products.total)}
          hint={`${stats.products.active} activos · ${stats.products.inactive} inactivos`}
        />
        <AdminStatCard
          label="Unidades en stock"
          value={String(stats.units.active)}
          hint="Suma de todos los talles en productos activos"
        />
        <AdminStatCard
          label="Unidades totales"
          value={String(stats.units.total)}
          hint={`Incluye inactivos (${stats.units.inactive})`}
        />
        <AdminStatCard
          label="Talles distintos"
          value={String(sizeRows.length)}
          hint="Con stock en productos activos"
        />
      </div>

      <AdminStatsPanelGrid>
        <AdminStatsTable
          title="Detalle por talle"
          rows={sizeRows}
          getRowKey={(row) => row.id}
          emptyMessage="Sin stock disponible"
          columns={[
            {
              ...breakdownColumns[0],
              header: "Talle",
              mobileLabel: "Talle",
            },
            breakdownColumns[1],
          ]}
        />

        <AdminStatsTable
          title="Detalle por versión"
          rows={typeRows}
          getRowKey={(row) => row.id}
          emptyMessage="Sin stock por versión"
          columns={[
            {
              ...breakdownColumns[0],
              header: "Versión",
              mobileLabel: "Versión",
            },
            breakdownColumns[1],
          ]}
        />
      </AdminStatsPanelGrid>

      <AdminStatsPanelGrid>
        <AdminStatsBarChart
          title="Stock por talle"
          data={sizeChartData}
          valueLabel="Unidades"
          emptyMessage="Sin stock disponible"
        />
        <AdminStatsPieChart
          title="Stock por versión"
          data={typeChartData}
          valueLabel="Unidades"
          emptyMessage="Sin stock por versión"
        />
      </AdminStatsPanelGrid>
    </Box>
  );
}
