"use client";

import Box from "@/components/layout/Box";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Typography from "@/components/ui/Typography";
import Icon from "@/components/ui/Icons";
import Select from "@/components/ui/Select";
import { Button } from "@/components/ui/button";
import AdminCommissionSellerField from "@/components/admin/AdminCommissionSellerField";
import type { ExternalSeller, Product, SaleAssignableUser } from "@/lib/api";
import { adminIconTriggerClassName } from "@/lib/admin-interactive-styles";
import { isSizeReserved } from "@/lib/product-reservation";
import type { SaleSellerFormValue } from "@/lib/sale-seller";
import {
  emptySizeReservationRow,
  getMaxReservationQuantityForRow,
  getOrderSizeOptions,
  type SupplierOrderSizeQuantityRow,
  type SupplierOrderSizeReservationRow,
} from "@/lib/supplier-order-sizes";
import { cn } from "@/lib/utils";

type AdminLineItemSizeReservationFieldsProps = {
  idPrefix: string;
  reservationRows: SupplierOrderSizeReservationRow[];
  onReservationRowsChange: (rows: SupplierOrderSizeReservationRow[]) => void;
  orderSizeRows: SupplierOrderSizeQuantityRow[];
  disabled?: boolean;
  showSellerField?: boolean;
  assignableUsers?: SaleAssignableUser[];
  externalSellers?: ExternalSeller[];
  canAssignUser?: boolean;
  currentUserId?: string | null;
  catalogProduct?: Pick<
    Product,
    | "reserved_by_sizes"
    | "reserved_for_user_id"
    | "reserved_for_external_seller_id"
    | "reserved_for_external_seller_name"
  >;
};

function normalizeReservedQuantity(value: string, maxQuantity: number): string {
  if (value === "") return "";
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return "1";
  if (maxQuantity <= 0) return "0";
  return String(Math.max(1, Math.min(maxQuantity, Math.floor(parsed))));
}

export default function AdminLineItemSizeReservationFields({
  idPrefix,
  reservationRows,
  onReservationRowsChange,
  orderSizeRows,
  disabled = false,
  showSellerField = false,
  assignableUsers = [],
  externalSellers = [],
  canAssignUser = false,
  currentUserId = null,
  catalogProduct,
}: AdminLineItemSizeReservationFieldsProps) {
  const orderSizeOptions = getOrderSizeOptions(orderSizeRows);

  if (orderSizeOptions.length === 0) {
    return (
      <Typography variant="body2" color="muted">
        Cargá al menos un talle con cantidad para definir la reserva.
      </Typography>
    );
  }

  const addRow = () => {
    onReservationRowsChange([...reservationRows, emptySizeReservationRow(currentUserId)]);
  };

  const removeRow = (rowId: string) => {
    onReservationRowsChange(reservationRows.filter((row) => row.id !== rowId));
  };

  const updateRow = (
    rowId: string,
    updates: Partial<Pick<SupplierOrderSizeReservationRow, "size" | "quantity" | "reservationSellerValue">>
  ) => {
    onReservationRowsChange(
      reservationRows.map((row) => {
        if (row.id !== rowId) return row;

        const nextRow = { ...row, ...updates };
        const maxQuantity = getMaxReservationQuantityForRow(
          nextRow,
          reservationRows,
          orderSizeRows
        );

        if (updates.quantity !== undefined) {
          nextRow.quantity = normalizeReservedQuantity(nextRow.quantity, maxQuantity);
        } else if (updates.size !== undefined && maxQuantity > 0) {
          const currentQty = Number(nextRow.quantity);
          nextRow.quantity = String(
            Number.isInteger(currentQty) && currentQty > 0
              ? Math.min(currentQty, maxQuantity)
              : Math.min(1, maxQuantity)
          );
        }

        return nextRow;
      })
    );
  };

  const getSelectableSizes = (currentRow: SupplierOrderSizeReservationRow) => {
    return orderSizeOptions.filter(({ size, maxQuantity }) => {
      if (currentRow.size.trim().toLocaleLowerCase() === size.toLocaleLowerCase()) {
        return true;
      }

      const used = reservationRows.reduce((sum, row) => {
        if (row.id === currentRow.id) return sum;
        if (row.size.trim().toLocaleLowerCase() !== size.toLocaleLowerCase()) return sum;
        const quantity = Number(row.quantity);
        return sum + (Number.isInteger(quantity) && quantity > 0 ? quantity : 0);
      }, 0);

      return used < maxQuantity;
    });
  };

  return (
    <Box
      display="flex"
      direction="col"
      gap="4"
      align="stretch"
      className="w-full min-w-0 self-stretch rounded-sm border border-amber-200 bg-amber-50/40 p-3"
    >
      <Typography variant="body2" className="font-medium text-amber-950">
        Talles a reservar
      </Typography>

      {reservationRows.length === 0 ? (
        <Typography variant="body2" color="muted">
          {catalogProduct
            ? "Agregá los talles que querés reservar del catálogo."
            : "Agregá los talles que querés reservar. Se aplicarán al catálogo cuando el producto esté cargado."}
        </Typography>
      ) : null}

      {reservationRows.map((row, index) => {
        const maxQuantity = getMaxReservationQuantityForRow(row, reservationRows, orderSizeRows);
        const selectableSizes = getSelectableSizes(row);
        const quantityId = `${idPrefix}-reserve-qty-${index}`;
        const sizeId = `${idPrefix}-reserve-size-${index}`;
        const catalogSizeReserved =
          Boolean(catalogProduct && row.size.trim()) &&
          isSizeReserved(catalogProduct!, row.size);

        return (
          <Box
            key={row.id}
            display="flex"
            direction="col"
            gap="3"
            align="stretch"
            className="w-full min-w-0 border-b border-amber-200/70 pb-4 last:border-b-0 last:pb-0"
          >
            <div className="flex w-full min-w-0 items-end gap-2">
              <div className="min-w-0 flex-1">
                <FormField htmlFor={sizeId} label="Talle">
                  <Select
                    id={sizeId}
                    value={row.size}
                    onChange={(event) => updateRow(row.id, { size: event.target.value })}
                    disabled={disabled || selectableSizes.length === 0}
                    required
                  >
                    <option value="">Seleccioná un talle</option>
                    {selectableSizes.map(({ size, maxQuantity: orderMax }) => (
                      <option key={size} value={size}>
                        {size} ({orderMax} en el pedido)
                      </option>
                    ))}
                  </Select>
                </FormField>
                {catalogSizeReserved ? (
                  <Typography variant="caption" className="mt-1 block text-amber-800">
                    Ya reservado en catálogo
                  </Typography>
                ) : null}
              </div>

              <div className="w-[120px] shrink-0">
                <FormField htmlFor={quantityId} label="A reservar">
                  <Input
                    id={quantityId}
                    type="number"
                    min={1}
                    max={maxQuantity || undefined}
                    value={row.quantity}
                    onChange={(event) => updateRow(row.id, { quantity: event.target.value })}
                    onBlur={() => {
                      if (row.quantity === "" || maxQuantity <= 0) {
                        updateRow(row.id, { quantity: maxQuantity > 0 ? "1" : "0" });
                      }
                    }}
                    disabled={disabled || !row.size.trim() || maxQuantity <= 0}
                    required
                  />
                </FormField>
              </div>

              <button
                type="button"
                onClick={() => removeRow(row.id)}
                disabled={disabled}
                aria-label={`Quitar talle reservado ${index + 1}`}
                className={cn(
                  adminIconTriggerClassName,
                  "mb-0.5 shrink-0 text-muted-foreground hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                )}
              >
                <Icon name="delete" className="size-5" />
              </button>
            </div>

            {showSellerField ? (
              <div className="w-full min-w-0 self-stretch">
                <AdminCommissionSellerField
                  value={row.reservationSellerValue}
                  onChange={(reservationSellerValue: SaleSellerFormValue) =>
                    updateRow(row.id, { reservationSellerValue })
                  }
                  assignableUsers={assignableUsers}
                  externalSellers={externalSellers}
                  canAssignUser={canAssignUser}
                  currentUserId={currentUserId}
                  disabled={disabled}
                />
              </div>
            ) : null}
          </Box>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={disabled || orderSizeOptions.length === 0}
        onClick={addRow}
      >
        Agregar talle
      </Button>
    </Box>
  );
}
