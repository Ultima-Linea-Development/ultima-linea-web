"use client";

import { useEffect, useState } from "react";
import Input from "@/components/ui/Input";
import Typography from "@/components/ui/Typography";
import type { Sale } from "@/lib/api";
import { formatSaleDateDisplay, saleDateToInputValue } from "@/lib/sale-date";

type AdminSaleDateInputProps = {
  sale: Sale;
  disabled?: boolean;
  isEditing?: boolean;
  onUpdateDate?: (sale: Sale, saleDate: string) => void;
};

export default function AdminSaleDateInput({
  sale,
  disabled = false,
  isEditing = false,
  onUpdateDate,
}: AdminSaleDateInputProps) {
  const [value, setValue] = useState(() => saleDateToInputValue(sale.created_at));

  useEffect(() => {
    setValue(saleDateToInputValue(sale.created_at));
  }, [sale.created_at, sale.id]);

  if (!isEditing) {
    return (
      <Typography variant="body2" className="whitespace-nowrap">
        {formatSaleDateDisplay(sale.created_at)}
      </Typography>
    );
  }

  return (
    <Input
      type="date"
      value={value}
      autoFocus
      onChange={(event) => {
        const nextValue = event.target.value;
        if (!nextValue || nextValue === value) return;
        setValue(nextValue);
        onUpdateDate?.(sale, nextValue);
      }}
      disabled={disabled || !onUpdateDate}
      width="auto"
      px={2}
      aria-label={`Fecha de venta de ${sale.product_name}`}
    />
  );
}
