"use client";

import { useMemo, useState } from "react";
import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import Label from "@/components/ui/Label";
import Input from "@/components/ui/Input";
import { Button } from "@/components/ui/button";
import { emptySizeStockRow, type SizeStockRow } from "@/lib/product-inventory";
import ProductOptionSelect from "@/components/admin/ProductOptionSelect";

type ProductSizeStockFieldsProps = {
  rows: SizeStockRow[];
  onRowsChange: (rows: SizeStockRow[]) => void;
  disabled?: boolean;
  idPrefix?: string;
  sizeOptions?: string[];
  required?: boolean;
  minRows?: number;
};

export default function ProductSizeStockFields({
  rows,
  onRowsChange,
  disabled = false,
  idPrefix = "size-stock",
  sizeOptions = [],
  required = false,
  minRows = 1,
}: ProductSizeStockFieldsProps) {
  const [customSizeRowIds, setCustomSizeRowIds] = useState<Set<string>>(() => new Set());

  const normalizedSizeOptions = useMemo(() => {
    const seen = new Set<string>();

    return sizeOptions
      .map((option) => option.trim())
      .filter(Boolean)
      .filter((option) => {
        const key = option.toLocaleLowerCase();
        if (seen.has(key)) return false;

        seen.add(key);
        return true;
      });
  }, [sizeOptions]);

  const addRow = () => onRowsChange([...rows, emptySizeStockRow()]);

  const removeRow = (index: number) => {
    if (rows.length <= minRows) return;
    const rowId = rows[index].id;
    setCustomSizeRowIds((prev) => {
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
    onRowsChange(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof SizeStockRow, value: string) => {
    const next = [...rows];
    next[index] = { ...next[index], [field]: value };
    onRowsChange(next);
  };

  const updateCustomSizeRow = (rowId: string, isCustom: boolean) => {
    setCustomSizeRowIds((prev) => {
      const next = new Set(prev);

      if (isCustom) {
        next.add(rowId);
      } else {
        next.delete(rowId);
      }

      return next;
    });
  };

  const isCustomSizeRow = (row: SizeStockRow) => {
    const size = row.size.trim();
    if (customSizeRowIds.has(row.id)) return true;
    if (!size) return false;

    return !normalizedSizeOptions.some(
      (option) => option.toLocaleLowerCase() === size.toLocaleLowerCase()
    );
  };

  return (
    <Box display="flex" direction="col" gap="4" className="w-full">
      <Typography variant="body2" mb={1}>
        Talles y stock{required ? " *" : ""}
      </Typography>
      {rows.length === 0 && (
        <Typography variant="body2" color="muted">
          Sin talles cargados.
        </Typography>
      )}
      {rows.map((row, index) => (
        <Box
          key={row.id}
          display="flex"
          gap="2"
          className="flex-wrap items-end">
          <div className="min-w-[100px] flex-1">
            <ProductOptionSelect
              id={`${idPrefix}-size-${index}`}
              label="Talle"
              value={row.size}
              options={normalizedSizeOptions}
              isCustom={isCustomSizeRow(row)}
              onChange={(value) => updateRow(index, "size", value)}
              onCustomChange={(isCustom) => updateCustomSizeRow(row.id, isCustom)}
              customPlaceholder="Ingresá el talle"
              disabled={disabled}
              required={required}
            />
          </div>
          <div className="min-w-[80px] w-[120px]">
            <Label htmlFor={`${idPrefix}-stock-${index}`} display="block" spacing="sm">
              <Typography variant="body2" mb={1}>
                Stock{required ? " *" : ""}
              </Typography>
              <Input
                id={`${idPrefix}-stock-${index}`}
                type="number"
                min={0}
                value={row.stock}
                onChange={(e) => updateRow(index, "stock", e.target.value)}
                disabled={disabled}
                placeholder="0"
                required={required}
              />
            </Label>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 mb-0.5"
            disabled={disabled || rows.length <= minRows}
            onClick={() => removeRow(index)}
            aria-label={`Quitar talle ${index + 1}`}>
            Quitar
          </Button>
        </Box>
      ))}
      <Button type="button" variant="outline" size="sm" className="w-fit" disabled={disabled} onClick={addRow}>
        Agregar talle
      </Button>
    </Box>
  );
}
