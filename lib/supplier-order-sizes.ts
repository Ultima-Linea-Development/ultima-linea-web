import type { SupplierOrderLineItem } from "@/lib/api";
import type { SaleSellerFormValue } from "@/lib/sale-seller";
import { createDefaultSaleSellerValue } from "@/lib/sale-seller";
import {
  reservationSellerFieldsFromCommissionPayload,
  reservationSellerFieldsFromFormValue,
  sellerFormValueFromReservationFields,
  type ReservationSellerPayload,
} from "@/lib/reservation-seller";
import { sortSizeEntries, sortSizeLabels, sortSizeLabelText } from "@/lib/product-inventory";

function newRowId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export type SupplierOrderSizeQuantityRow = {
  id: string;
  size: string;
  quantity: string;
};

export type SupplierOrderSizeReservationRow = {
  id: string;
  size: string;
  quantity: string;
  reservationSellerValue: SaleSellerFormValue;
};

export type SupplierOrderLineItemReservationEntry = {
  size: string;
  quantity: number;
  reserved_seller_type?: "internal" | "external";
  reserved_for_user_id?: string;
  reserved_for_external_seller_id?: string;
  reserved_for_external_seller_name?: string;
};

export function emptySupplierOrderSizeRow(): SupplierOrderSizeQuantityRow {
  return { id: newRowId(), size: "", quantity: "1" };
}

export function emptySizeReservationRow(currentUserId: string | null): SupplierOrderSizeReservationRow {
  return {
    id: newRowId(),
    size: "",
    quantity: "1",
    reservationSellerValue: createDefaultSaleSellerValue(currentUserId),
  };
}

export function buildReservationRowsFromSizeRows(
  sizeRows: SupplierOrderSizeQuantityRow[],
  reservationSellerValue: SaleSellerFormValue
): SupplierOrderSizeReservationRow[] {
  return sizeRows
    .map((row) => {
      const size = row.size.trim();
      const quantity = Number(row.quantity);
      if (!size || !Number.isInteger(quantity) || quantity <= 0) return null;

      return {
        id: newRowId(),
        size,
        quantity: String(quantity),
        reservationSellerValue,
      };
    })
    .filter((row): row is SupplierOrderSizeReservationRow => Boolean(row));
}

export function getOrderSizeLimits(
  rows: SupplierOrderSizeQuantityRow[]
): Record<string, number> {
  const limits: Record<string, number> = {};

  for (const row of rows) {
    const size = row.size.trim();
    const quantity = Number(row.quantity);
    if (!size || !Number.isInteger(quantity) || quantity <= 0) continue;

    const key = size.toLocaleLowerCase();
    const existing = Object.entries(limits).find(
      ([existingSize]) => existingSize.toLocaleLowerCase() === key
    );

    if (existing) {
      limits[existing[0]] += quantity;
    } else {
      limits[size] = quantity;
    }
  }

  return limits;
}

export function getOrderSizeOptions(
  rows: SupplierOrderSizeQuantityRow[]
): Array<{ size: string; maxQuantity: number }> {
  return sortSizeEntries(Object.entries(getOrderSizeLimits(rows))).map(([size, maxQuantity]) => ({
    size,
    maxQuantity,
  }));
}

export function getReservedQuantityForSizeInRows(
  size: string,
  reservationRows: SupplierOrderSizeReservationRow[],
  excludeRowId?: string
): number {
  const normalized = size.trim().toLocaleLowerCase();
  if (!normalized) return 0;

  return reservationRows.reduce((sum, row) => {
    if (excludeRowId && row.id === excludeRowId) return sum;
    if (row.size.trim().toLocaleLowerCase() !== normalized) return sum;
    const quantity = Number(row.quantity);
    return sum + (Number.isInteger(quantity) && quantity > 0 ? quantity : 0);
  }, 0);
}

export function getMaxReservationQuantityForRow(
  row: SupplierOrderSizeReservationRow,
  reservationRows: SupplierOrderSizeReservationRow[],
  orderSizeRows: SupplierOrderSizeQuantityRow[]
): number {
  const size = row.size.trim();
  if (!size) return 0;

  const orderLimit = getOrderSizeLimits(orderSizeRows)[size] ??
    Object.entries(getOrderSizeLimits(orderSizeRows)).find(
      ([existingSize]) => existingSize.toLocaleLowerCase() === size.toLocaleLowerCase()
    )?.[1] ??
    0;

  const usedByOthers = getReservedQuantityForSizeInRows(size, reservationRows, row.id);
  return Math.max(0, orderLimit - usedByOthers);
}

export function getReservedQuantityBySizesFromReservationRows(
  reservationRows: SupplierOrderSizeReservationRow[],
  orderSizeRows: SupplierOrderSizeQuantityRow[]
): Record<string, number> {
  const result: Record<string, number> = {};
  const orderLimits = getOrderSizeLimits(orderSizeRows);

  for (const row of reservationRows) {
    const size = row.size.trim();
    const quantity = Number(row.quantity);
    if (!size || !Number.isInteger(quantity) || quantity <= 0) continue;

    const orderLimit =
      orderLimits[size] ??
      Object.entries(orderLimits).find(
        ([existingSize]) => existingSize.toLocaleLowerCase() === size.toLocaleLowerCase()
      )?.[1] ??
      0;

    if (orderLimit <= 0) continue;

    const reservedQty = Math.min(quantity, orderLimit);
    const key = size.toLocaleLowerCase();
    const existing = Object.entries(result).find(
      ([existingSize]) => existingSize.toLocaleLowerCase() === key
    );

    if (existing) {
      result[existing[0]] = Math.min(orderLimit, existing[1] + reservedQty);
    } else {
      result[size] = reservedQty;
    }
  }

  return result;
}

export function getReservedSizesFromReservationRows(
  reservationRows: SupplierOrderSizeReservationRow[],
  orderSizeRows: SupplierOrderSizeQuantityRow[]
): string[] {
  return Object.keys(getReservedQuantityBySizesFromReservationRows(reservationRows, orderSizeRows));
}

export function draftHasSizeReservations(
  reserveProduct: boolean,
  reservationRows: SupplierOrderSizeReservationRow[],
  orderSizeRows: SupplierOrderSizeQuantityRow[]
): boolean {
  return (
    reserveProduct &&
    getReservedSizesFromReservationRows(reservationRows, orderSizeRows).length > 0
  );
}

export function reservationEntriesFromRows(
  reservationRows: SupplierOrderSizeReservationRow[],
  orderSizeRows: SupplierOrderSizeQuantityRow[],
  resolveSeller: (row: SupplierOrderSizeReservationRow) => ReservationSellerPayload
): SupplierOrderLineItemReservationEntry[] {
  const entries: SupplierOrderLineItemReservationEntry[] = [];

  for (const row of reservationRows) {
    const size = row.size.trim();
    const quantity = Number(row.quantity);
    if (!size || !Number.isInteger(quantity) || quantity <= 0) continue;

    const maxQuantity = getMaxReservationQuantityForRow(row, reservationRows, orderSizeRows);
    if (maxQuantity <= 0) continue;

    entries.push({
      size,
      quantity: Math.min(quantity, maxQuantity),
      ...resolveSeller(row),
    });
  }

  return entries;
}

export function reservationRowsFromLineItem(
  item: Pick<
    SupplierOrderLineItem,
    | "reserved"
    | "reserved_sizes"
    | "reserved_quantity_by_sizes"
    | "reservation_entries"
    | "quantity_by_sizes"
    | "quantity"
    | "sizes"
    | "reserved_for_user_id"
    | "reserved_for_external_seller_id"
    | "reserved_for_external_seller_name"
  >,
  currentUserId: string | null
): SupplierOrderSizeReservationRow[] {
  if (item.reservation_entries && item.reservation_entries.length > 0) {
    return item.reservation_entries.map((entry) => ({
      id: newRowId(),
      size: entry.size,
      quantity: String(entry.quantity),
      reservationSellerValue: sellerFormValueFromReservationFields(entry, currentUserId),
    }));
  }

  const legacySeller = sellerFormValueFromReservationFields(item, currentUserId);
  const reservedQtyBySize = item.reserved_quantity_by_sizes ?? {};

  if (Object.keys(reservedQtyBySize).length > 0) {
    return sortSizeEntries(Object.entries(reservedQtyBySize)).map(([size, quantity]) => ({
      id: newRowId(),
      size,
      quantity: String(quantity),
      reservationSellerValue: legacySeller,
    }));
  }

  const reservedSet = new Set(
    (item.reserved_sizes ?? [])
      .map((size) => size.trim().toLocaleLowerCase())
      .filter(Boolean)
  );

  if (reservedSet.size === 0) return [];

  const orderEntries = getSupplierOrderSizeQuantityEntries(item);
  return orderEntries
    .filter(([size]) => reservedSet.has(size.trim().toLocaleLowerCase()))
    .map(([size, quantity]) => ({
      id: newRowId(),
      size,
      quantity: String(quantity),
      reservationSellerValue: legacySeller,
    }));
}

export function formatSupplierOrderSizesDisplay(
  quantityBySizes?: Record<string, number>,
  sizesFallback?: string
): string {
  if (quantityBySizes && Object.keys(quantityBySizes).length > 0) {
    return sortSizeEntries(Object.entries(quantityBySizes))
      .map(([size, quantity]) => (quantity === 1 ? size : `${size} (${quantity})`))
      .join(", ");
  }

  return sizesFallback?.trim() ? sortSizeLabelText(sizesFallback) : "—";
}

export function getSupplierOrderLineItemQuantity(
  quantityBySizes?: Record<string, number>,
  quantityFallback = 0
): number {
  if (quantityBySizes && Object.keys(quantityBySizes).length > 0) {
    return Object.values(quantityBySizes).reduce((sum, value) => sum + value, 0);
  }

  return quantityFallback;
}

export function getSupplierOrderSizeQuantityEntries(
  item: Pick<SupplierOrderLineItem, "quantity" | "sizes" | "quantity_by_sizes">
): [string, number][] {
  if (item.quantity_by_sizes && Object.keys(item.quantity_by_sizes).length > 0) {
    return sortSizeEntries(Object.entries(item.quantity_by_sizes))
      .map(([size, quantity]) => [size, quantity] as [string, number]);
  }

  if (item.sizes?.trim()) {
    return [[sortSizeLabelText(item.sizes), item.quantity]];
  }

  return [];
}

export function sizeRowsFromLineItem(
  item: Pick<
    SupplierOrderLineItem,
    | "quantity"
    | "sizes"
    | "quantity_by_sizes"
    | "reserved"
    | "reserved_sizes"
    | "reserved_quantity_by_sizes"
  >
): SupplierOrderSizeQuantityRow[] {
  const buildRow = (size: string, quantity: string): SupplierOrderSizeQuantityRow => ({
    id: newRowId(),
    size,
    quantity,
  });

  if (item.quantity_by_sizes && Object.keys(item.quantity_by_sizes).length > 0) {
    return sortSizeEntries(Object.entries(item.quantity_by_sizes)).map(([size, quantity]) =>
      buildRow(size, String(quantity))
    );
  }

  if (item.sizes?.trim()) {
    return [buildRow(sortSizeLabelText(item.sizes), String(item.quantity))];
  }

  return [emptySupplierOrderSizeRow()];
}

export function sizeRowsToPayload(
  rows: SupplierOrderSizeQuantityRow[]
): { quantity_by_sizes: Record<string, number>; quantity: number; sizes: string } | null {
  const quantityBySizes: Record<string, number> = {};

  for (const row of rows) {
    const size = row.size.trim();
    const quantity = Number(row.quantity);

    if (!size) continue;
    if (!Number.isInteger(quantity) || quantity <= 0) return null;

    const key = size.toLocaleLowerCase();
    const existing = Object.entries(quantityBySizes).find(
      ([existingSize]) => existingSize.toLocaleLowerCase() === key
    );

    if (existing) {
      quantityBySizes[existing[0]] += quantity;
    } else {
      quantityBySizes[size] = quantity;
    }
  }

  if (Object.keys(quantityBySizes).length === 0) return null;

  const sortedSizes = sortSizeLabels(Object.keys(quantityBySizes));
  const sortedQuantityBySizes: Record<string, number> = {};

  for (const size of sortedSizes) {
    sortedQuantityBySizes[size] = quantityBySizes[size];
  }

  const quantity = Object.values(sortedQuantityBySizes).reduce((sum, value) => sum + value, 0);

  return {
    quantity_by_sizes: sortedQuantityBySizes,
    quantity,
    sizes: formatSupplierOrderSizesDisplay(sortedQuantityBySizes),
  };
}
