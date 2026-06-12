"use client";

import type { ReactNode } from "react";
import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const ADMIN_TABLE_CELL_CLASS = "px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2";
export const ADMIN_TABLE_TH_CLASS =
  "px-2 py-2 sm:px-3 sm:py-3 md:px-4 md:py-3 font-medium whitespace-nowrap";

type AdminTableProps = {
  children: ReactNode;
  className?: string;
};

export function AdminTable({ children, className }: AdminTableProps) {
  return (
    <div className={cn("hidden md:block overflow-x-auto border border-border", className)}>
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

type AdminTableMobileListProps = {
  children: ReactNode;
  className?: string;
};

const ADMIN_TABLE_MOBILE_BLEED_CLASS =
  "-mx-4 w-[calc(100%+2rem)] sm:-mx-6 sm:w-[calc(100%+3rem)] md:mx-0 md:w-full";

export function AdminTableMobileList({ children, className }: AdminTableMobileListProps) {
  return (
    <div
      className={cn(
        "md:hidden flex w-full min-w-0 flex-col border border-border",
        ADMIN_TABLE_MOBILE_BLEED_CLASS,
        className
      )}
    >
      {children}
    </div>
  );
}

type AdminTableMobileCardProps = {
  children: ReactNode;
  className?: string;
  selected?: boolean;
};

export function AdminTableMobileCard({
  children,
  className,
  selected = false,
}: AdminTableMobileCardProps) {
  return (
    <div
      className={cn(
        "border-b border-border p-4 last:border-b-0",
        selected && "bg-muted/50",
        className
      )}
    >
      {children}
    </div>
  );
}

type AdminTableMobileGridProps = {
  children: ReactNode;
  className?: string;
};

export function AdminTableMobileGrid({ children, className }: AdminTableMobileGridProps) {
  return <div className={cn("grid grid-cols-2 gap-x-4 gap-y-3", className)}>{children}</div>;
}

type AdminTableMobileFieldProps = {
  label: string;
  children: ReactNode;
  fullWidth?: boolean;
  className?: string;
};

export function AdminTableMobileField({
  label,
  children,
  fullWidth = false,
  className,
}: AdminTableMobileFieldProps) {
  return (
    <div className={cn("min-w-0", fullWidth && "col-span-2", className)}>
      <Typography variant="caption" color="muted" mb={1}>
        {label}
      </Typography>
      {children}
    </div>
  );
}

type AdminTableMobileEmptyProps = {
  message: string;
};

export function AdminTableMobileEmpty({ message }: AdminTableMobileEmptyProps) {
  return (
    <div
      className={cn(
        "md:hidden w-full min-w-0 border border-border p-8 text-center",
        ADMIN_TABLE_MOBILE_BLEED_CLASS
      )}
    >
      <Typography variant="body2" color="muted">
        {message}
      </Typography>
    </div>
  );
}

type AdminTablePaginationProps = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function AdminTablePagination({
  page,
  perPage,
  total,
  totalPages,
  onPageChange,
}: AdminTablePaginationProps) {
  if (totalPages <= 1) return null;

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <Box
      display="flex"
      className="flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 flex-wrap"
    >
      <span className="order-2 sm:order-1">
        <Typography variant="body2" color="muted">
          Mostrando {from}–{to} de {total}
        </Typography>
      </span>
      <Box
        display="flex"
        gap="2"
        className="items-center justify-center sm:justify-end order-1 sm:order-2 shrink-0"
      >
        <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Anterior
        </Button>
        <Typography variant="body2">
          Página {page} de {totalPages}
        </Typography>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Siguiente
        </Button>
      </Box>
    </Box>
  );
}

type AdminTableEmptyRowProps = {
  colSpan: number;
  message: string;
};

export function AdminTableEmptyRow({ colSpan, message }: AdminTableEmptyRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className={cn(ADMIN_TABLE_CELL_CLASS, "py-8 text-center")}>
        <Typography variant="body2" color="muted">
          {message}
        </Typography>
      </td>
    </tr>
  );
}
