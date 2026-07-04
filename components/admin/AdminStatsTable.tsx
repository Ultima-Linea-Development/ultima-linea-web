"use client";

import type { ReactNode } from "react";
import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import {
  AdminTable,
  AdminTableEmptyRow,
  AdminTableMobileCard,
  AdminTableMobileEmpty,
  AdminTableMobileField,
  AdminTableMobileGrid,
  AdminTableMobileList,
  ADMIN_TABLE_CELL_CLASS,
  ADMIN_TABLE_TH_CLASS,
  adminTableRowClassName,
} from "@/components/admin/AdminTable";

export type AdminStatsTableColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  mobileLabel: string;
  mobileFullWidth?: boolean;
  cellClassName?: string;
};

type AdminStatsTableProps<T> = {
  title?: string;
  rows: T[];
  columns: AdminStatsTableColumn<T>[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
};

export default function AdminStatsTable<T>({
  title,
  rows,
  columns,
  getRowKey,
  emptyMessage = "Sin datos",
}: AdminStatsTableProps<T>) {
  const colSpan = columns.length;

  return (
    <Box display="flex" direction="col" gap="2" className="w-full min-w-0">
      {title ? (
        <Typography variant="body2" className="font-medium">
          {title}
        </Typography>
      ) : null}

      {rows.length === 0 ? (
        <>
          <AdminTableMobileEmpty message={emptyMessage} />
          <AdminTable>
            <thead className="bg-muted/50">
              <tr>
                {columns.map((column) => (
                  <th key={column.id} className={ADMIN_TABLE_TH_CLASS}>
                    {typeof column.header === "string" ? (
                      <Typography variant="body2">{column.header}</Typography>
                    ) : (
                      column.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AdminTableEmptyRow colSpan={colSpan} message={emptyMessage} />
            </tbody>
          </AdminTable>
        </>
      ) : (
        <>
          <AdminTableMobileList>
            {rows.map((row, index) => (
              <AdminTableMobileCard key={getRowKey(row)} stripeIndex={index}>
                <AdminTableMobileGrid>
                  {columns.map((column) => (
                    <AdminTableMobileField
                      key={column.id}
                      label={column.mobileLabel}
                      fullWidth={column.mobileFullWidth}
                    >
                      {column.cell(row, index)}
                    </AdminTableMobileField>
                  ))}
                </AdminTableMobileGrid>
              </AdminTableMobileCard>
            ))}
          </AdminTableMobileList>

          <AdminTable>
            <thead className="bg-muted/50">
              <tr>
                {columns.map((column) => (
                  <th key={column.id} className={ADMIN_TABLE_TH_CLASS}>
                    {typeof column.header === "string" ? (
                      <Typography variant="body2">{column.header}</Typography>
                    ) : (
                      column.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={getRowKey(row)}
                  className={adminTableRowClassName({ stripeIndex: index })}
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={column.cellClassName ?? ADMIN_TABLE_CELL_CLASS}
                    >
                      {column.cell(row, index)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </>
      )}
    </Box>
  );
}
