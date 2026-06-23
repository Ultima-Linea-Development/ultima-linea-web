"use client";

import type { RefObject } from "react";
import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import { ADMIN_TABLE_TH_CLASS } from "@/components/admin/AdminTable";
import { cn } from "@/lib/utils";

type AdminTableSelectAllProps = {
  checked: boolean;
  onChange: () => void;
  selectAllRef?: RefObject<HTMLInputElement | null>;
};

export function AdminTableSelectAllHeader({
  checked,
  onChange,
  selectAllRef,
}: AdminTableSelectAllProps) {
  return (
    <th className={ADMIN_TABLE_TH_CLASS}>
      <input
        ref={selectAllRef}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label="Seleccionar todos"
        className="size-4 cursor-pointer"
      />
    </th>
  );
}

export function AdminTableSelectAllMobileRow({ checked, onChange }: AdminTableSelectAllProps) {
  return (
    <Box
      display="flex"
      className="items-center gap-3 bg-muted/30 px-3 py-2.5 sm:px-4 sm:py-3"
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label="Seleccionar todos"
        className="size-4 cursor-pointer"
      />
      <Typography variant="body2">Seleccionar todos</Typography>
    </Box>
  );
}

type AdminTableRowCheckboxProps = {
  checked: boolean;
  onChange: () => void;
  label: string;
  className?: string;
};

export function AdminTableRowCheckbox({
  checked,
  onChange,
  label,
  className,
}: AdminTableRowCheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      className={cn("size-4 shrink-0 cursor-pointer", className)}
    />
  );
}
