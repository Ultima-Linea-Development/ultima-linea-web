"use client";

import Box from "@/components/layout/Box";
import AdminLoadingShimmer from "@/components/admin/AdminLoadingShimmer";
import AdminStatsPanelGrid from "@/components/admin/AdminStatsPanelGrid";
import {
  ADMIN_TABLE_CELL_CLASS,
  ADMIN_TABLE_DESKTOP_CLASS,
  ADMIN_TABLE_LAYOUT_CLASS,
  ADMIN_TABLE_OUTER_BORDER_CLASS,
  ADMIN_TABLE_TH_CLASS,
  AdminTableMobileCard,
  AdminTableMobileList,
  adminTableRowClassName,
} from "@/components/admin/AdminTable";
import type { AdminStatsTabId } from "@/lib/admin-stats-tabs";
import { cn } from "@/lib/utils";

type AdminStatsSkeletonProps = {
  tab: AdminStatsTabId;
  className?: string;
};

type TabLayout = {
  statCards: number;
  statCardCols: "two" | "four";
  tables: number;
  tableColumns: number;
  tableRows: number;
};

const TAB_LAYOUTS: Record<AdminStatsTabId, TabLayout> = {
  catalog: {
    statCards: 4,
    statCardCols: "four",
    tables: 2,
    tableColumns: 2,
    tableRows: 5,
  },
  sales: {
    statCards: 4,
    statCardCols: "four",
    tables: 1,
    tableColumns: 5,
    tableRows: 4,
  },
  sellers: {
    statCards: 2,
    statCardCols: "two",
    tables: 1,
    tableColumns: 6,
    tableRows: 5,
  },
  operations: {
    statCards: 2,
    statCardCols: "two",
    tables: 2,
    tableColumns: 3,
    tableRows: 4,
  },
};

const SHIMMER_TEXT = "block h-4 w-full rounded-sm";
const SHIMMER_CAPTION = "block h-3 w-full rounded-sm";

function StatCardSkeleton({ staggerIndex }: { staggerIndex: number }) {
  return (
    <div className="w-full min-w-0 border border-border bg-background px-3 py-2.5 sm:px-4 sm:py-3">
      <AdminLoadingShimmer className={cn(SHIMMER_CAPTION, "max-w-[7rem]")} staggerIndex={staggerIndex} />
      <AdminLoadingShimmer
        className="mt-2 h-8 w-20 max-w-full rounded-sm"
        staggerIndex={staggerIndex}
      />
      <AdminLoadingShimmer
        className={cn(SHIMMER_CAPTION, "mt-2 max-w-[16rem]")}
        staggerIndex={staggerIndex}
      />
    </div>
  );
}

function StatsTableSkeleton({
  columns,
  rows,
  staggerOffset = 0,
}: {
  columns: number;
  rows: number;
  staggerOffset?: number;
}) {
  return (
    <Box display="flex" direction="col" gap="2" className="w-full min-w-0">
      <AdminLoadingShimmer
        className={cn(SHIMMER_TEXT, "max-w-[9rem]")}
        staggerIndex={staggerOffset}
      />

      <AdminTableMobileList>
        {Array.from({ length: Math.min(rows, 4) }).map((_, index) => (
          <AdminTableMobileCard key={index} stripeIndex={index}>
            <Box display="flex" direction="col" gap="2">
              <AdminLoadingShimmer
                className={cn(SHIMMER_TEXT, "max-w-[8rem]")}
                staggerIndex={staggerOffset + index}
              />
              <AdminLoadingShimmer
                className={cn(SHIMMER_CAPTION, "max-w-[5rem]")}
                staggerIndex={staggerOffset + index}
              />
            </Box>
          </AdminTableMobileCard>
        ))}
      </AdminTableMobileList>

      <div className={cn(ADMIN_TABLE_DESKTOP_CLASS, "w-full", ADMIN_TABLE_OUTER_BORDER_CLASS)}>
        <table className={ADMIN_TABLE_LAYOUT_CLASS}>
          <thead className="bg-muted/50">
            <tr>
              {Array.from({ length: columns }).map((_, index) => (
                <th key={index} className={ADMIN_TABLE_TH_CLASS}>
                  <AdminLoadingShimmer
                    className={cn(SHIMMER_TEXT, "max-w-[5rem]")}
                    staggerIndex={staggerOffset + index}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className={adminTableRowClassName({ stripeIndex: rowIndex })}>
                {Array.from({ length: columns }).map((_, columnIndex) => (
                  <td key={columnIndex} className={ADMIN_TABLE_CELL_CLASS}>
                    <div className="flex h-10 w-full min-w-0 items-center sm:h-12">
                      <AdminLoadingShimmer
                        className={SHIMMER_TEXT}
                        staggerIndex={staggerOffset + rowIndex + columnIndex}
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Box>
  );
}

export default function AdminStatsSkeleton({ tab, className }: AdminStatsSkeletonProps) {
  const layout = TAB_LAYOUTS[tab];

  return (
    <Box
      display="flex"
      direction="col"
      gap="4"
      align="stretch"
      className={cn("w-full min-w-0", className)}
      aria-busy="true"
      aria-label="Cargando estadísticas"
    >
      <div
        className={cn(
          "grid w-full min-w-0 gap-3",
          layout.statCardCols === "four"
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            : "grid-cols-1 lg:grid-cols-2"
        )}
      >
        {Array.from({ length: layout.statCards }).map((_, index) => (
          <StatCardSkeleton key={index} staggerIndex={index} />
        ))}
      </div>

      <AdminStatsPanelGrid>
        {Array.from({ length: layout.tables }).map((_, index) => (
          <StatsTableSkeleton
            key={index}
            columns={layout.tableColumns}
            rows={layout.tableRows}
            staggerOffset={layout.statCards + index * 2}
          />
        ))}
      </AdminStatsPanelGrid>
    </Box>
  );
}
