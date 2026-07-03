import { Collection } from "mongodb";
import { ExternalSellerDocument, Product, ProductDocument, productFromDoc } from "@/lib/server/models";
import { resolveExternalSeller } from "@/lib/server/external-sellers";
import { isAssignableStaffUser } from "@/lib/server/users";
import type { ResolvedSaleSeller } from "@/lib/server/sale-seller";
import { nonDeletedProductFilter } from "@/lib/server/products";
import { getSupplierOrderSizeQuantityEntries } from "@/lib/supplier-order-sizes";

export type ProductReservationFields = {
  reserved_for_user_id?: string;
  reserved_for_external_seller_id?: string;
  reserved_for_external_seller_name?: string;
};

export type ProductSizeReservationKey = {
  productId: string;
  size: string;
};

export type LineItemReservationEntry = {
  size: string;
  quantity: number;
  reserved_seller_type?: "internal" | "external";
  reserved_for_user_id?: string;
  reserved_for_external_seller_id?: string;
  reserved_for_external_seller_name?: string;
};

export type LineItemReservationInput = {
  product_id?: string;
  reserved?: boolean;
  reserved_sizes?: string[];
  reserved_quantity_by_sizes?: Record<string, number>;
  reservation_entries?: LineItemReservationEntry[];
  sizes?: string;
  quantity?: number;
  quantity_by_sizes?: Record<string, number>;
  reserved_seller_type?: "internal" | "external";
  reserved_for_user_id?: string;
  reserved_for_external_seller_id?: string;
  reserved_for_external_seller_name?: string;
};

export const PRODUCT_RESERVATION_UNSET_FIELDS = {
  reserved_for_user_id: "",
  reserved_for_external_seller_id: "",
  reserved_for_external_seller_name: "",
} as const;

export const PRODUCT_CATALOG_RESERVATION_UNSET_FIELDS = {
  ...PRODUCT_RESERVATION_UNSET_FIELDS,
  reserved_by_sizes: "",
} as const;

export type CatalogReservationEntry = {
  size: string;
  quantity: number;
  reserved_for_user_id?: string;
  reserved_for_external_seller_id?: string;
  reserved_for_external_seller_name?: string;
};

function trimOptional(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function reservationFieldsAreActive(reservation: ProductReservationFields): boolean {
  return Boolean(
    trimOptional(reservation.reserved_for_user_id) ||
      trimOptional(reservation.reserved_for_external_seller_id) ||
      trimOptional(reservation.reserved_for_external_seller_name)
  );
}

function sizesMatch(left: string, right: string): boolean {
  return left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase();
}

function getCatalogReservationEntriesFromProduct(product: {
  catalog_reservation_entries?: CatalogReservationEntry[];
  reserved_by_sizes?: Record<string, ProductReservationFields>;
  stock_by_sizes?: Record<string, number>;
}): CatalogReservationEntry[] {
  if (product.catalog_reservation_entries?.length) {
    return product.catalog_reservation_entries.filter(
      (entry) =>
        entry.size.trim() &&
        Number.isInteger(entry.quantity) &&
        entry.quantity > 0 &&
        reservationFieldsAreActive(entry)
    );
  }

  if (product.reserved_by_sizes && Object.keys(product.reserved_by_sizes).length > 0) {
    return Object.entries(product.reserved_by_sizes)
      .filter(([, reservation]) => reservationFieldsAreActive(reservation))
      .map(([size, reservation]) => ({
        size,
        quantity: Math.max(1, findStockForSize(product.stock_by_sizes ?? {}, size)),
        ...reservation,
      }));
  }

  return [];
}

function reservationFieldsMatchSeller(
  reservation: ProductReservationFields,
  seller: ResolvedSaleSeller
): boolean {
  const reservedForUser = trimOptional(reservation.reserved_for_user_id);
  const reservedForExternalId = trimOptional(reservation.reserved_for_external_seller_id);
  const reservedForExternalName = trimOptional(reservation.reserved_for_external_seller_name);
  const saleExternalId = trimOptional(seller.external_seller_id);
  const saleExternalName = trimOptional(seller.external_seller_name);

  if (reservedForExternalId || reservedForExternalName) {
    if (saleExternalId && reservedForExternalId && saleExternalId === reservedForExternalId) {
      return true;
    }

    if (
      saleExternalName &&
      reservedForExternalName &&
      saleExternalName.toLocaleLowerCase() === reservedForExternalName.toLocaleLowerCase()
    ) {
      return true;
    }

    return false;
  }

  return Boolean(reservedForUser && seller.created_by === reservedForUser);
}

function getReservedProductIds(
  items: Array<LineItemReservationInput & { product_id?: string }>
): Set<string> {
  const ids = new Set<string>();

  for (const item of items) {
    if (!lineItemHasReservation(item)) continue;
    const productId = item.product_id?.trim();
    if (productId) ids.add(productId);
  }

  return ids;
}

function getLineItemReservationEntries(
  item: LineItemReservationInput
): LineItemReservationEntry[] {
  if (item.reservation_entries && item.reservation_entries.length > 0) {
    return item.reservation_entries.filter(
      (entry) =>
        entry.size.trim() &&
        Number.isInteger(entry.quantity) &&
        entry.quantity > 0
    );
  }

  const reservation = getLineItemReservationFields(item);
  if (!reservation) return [];

  return getLineItemReservedSizes(item).map((size) => ({
    size,
    quantity:
      item.reserved_quantity_by_sizes?.[size] ??
      Object.entries(item.reserved_quantity_by_sizes ?? {}).find(
        ([existingSize]) => existingSize.trim().toLocaleLowerCase() === size.toLocaleLowerCase()
      )?.[1] ??
      1,
    ...reservation,
  }));
}

export function getLineItemReservedSizes(
  item: Pick<
    LineItemReservationInput,
    | "sizes"
    | "quantity_by_sizes"
    | "quantity"
    | "reserved_sizes"
    | "reserved_quantity_by_sizes"
    | "reserved"
  >
): string[] {
  const entries = getLineItemReservationEntries(item);
  if (entries.length > 0) {
    return entries.map((entry) => entry.size.trim()).filter(Boolean);
  }

  if (item.reserved_quantity_by_sizes && Object.keys(item.reserved_quantity_by_sizes).length > 0) {
    return Object.entries(item.reserved_quantity_by_sizes)
      .filter(([, quantity]) => Number.isInteger(quantity) && quantity > 0)
      .map(([size]) => size.trim())
      .filter(Boolean);
  }

  if (item.reserved_sizes && item.reserved_sizes.length > 0) {
    return item.reserved_sizes.map((size) => size.trim()).filter(Boolean);
  }

  if (item.reserved) {
    return getSupplierOrderSizeQuantityEntries({
      quantity: item.quantity ?? 0,
      sizes: item.sizes ?? "",
      quantity_by_sizes: item.quantity_by_sizes,
    }).map(([size]) => size);
  }

  return [];
}

export function lineItemHasReservation(
  item: Pick<
    LineItemReservationInput,
    | "reserved"
    | "product_id"
    | "reserved_sizes"
    | "reserved_quantity_by_sizes"
    | "reservation_entries"
  >
): boolean {
  if (item.reservation_entries && item.reservation_entries.length > 0) return true;
  if (
    item.reserved_quantity_by_sizes &&
    Object.values(item.reserved_quantity_by_sizes).some(
      (quantity) => Number.isInteger(quantity) && quantity > 0
    )
  ) {
    return true;
  }
  if (item.reserved_sizes && item.reserved_sizes.length > 0) return true;
  return Boolean(item.reserved);
}

export function getReservedProductSizeKeys(
  items: Array<LineItemReservationInput & { product_id?: string }>
): ProductSizeReservationKey[] {
  const keys: ProductSizeReservationKey[] = [];

  for (const item of items) {
    if (!lineItemHasReservation(item)) continue;

    const productId = item.product_id!.trim();
    for (const entry of getLineItemReservationEntries(item)) {
      keys.push({ productId, size: entry.size.trim() });
    }
  }

  return keys;
}

function reservationFieldsFromEntry(
  entry: LineItemReservationEntry
): ProductReservationFields | null {
  const fields = {
    reserved_for_user_id: trimOptional(entry.reserved_for_user_id),
    reserved_for_external_seller_id: trimOptional(entry.reserved_for_external_seller_id),
    reserved_for_external_seller_name: trimOptional(entry.reserved_for_external_seller_name),
  };

  return reservationFieldsAreActive(fields) ? fields : null;
}

export function getLineItemReservationFields(
  item: Pick<
    LineItemReservationInput,
    | "reserved"
    | "reserved_for_user_id"
    | "reserved_for_external_seller_id"
    | "reserved_for_external_seller_name"
  >
): ProductReservationFields | null {
  if (!item.reserved) return null;

  return {
    reserved_for_user_id: trimOptional(item.reserved_for_user_id),
    reserved_for_external_seller_id: trimOptional(item.reserved_for_external_seller_id),
    reserved_for_external_seller_name: trimOptional(item.reserved_for_external_seller_name),
  };
}

function findSizeReservation(
  reservedBySizes: Record<string, ProductReservationFields> | undefined,
  size: string
): ProductReservationFields | null {
  if (!reservedBySizes || !size.trim()) return null;

  const direct = reservedBySizes[size];
  if (direct && reservationFieldsAreActive(direct)) return direct;

  const normalized = size.trim().toLocaleLowerCase();
  for (const [reservedSize, reservation] of Object.entries(reservedBySizes)) {
    if (
      reservedSize.trim().toLocaleLowerCase() === normalized &&
      reservationFieldsAreActive(reservation)
    ) {
      return reservation;
    }
  }

  return null;
}

type DefaultReservationSeller = {
  seller_user_id?: string;
  external_seller_id?: string;
  external_seller_name?: string;
};

async function resolveReservationSeller(
  externalSellers: Collection<ExternalSellerDocument>,
  input: LineItemReservationInput,
  defaultSeller?: DefaultReservationSeller
): Promise<ProductReservationFields | { error: string }> {
  const isExternal =
    input.reserved_seller_type === "external" ||
    Boolean(
      trimOptional(input.reserved_for_external_seller_id) ||
        trimOptional(input.reserved_for_external_seller_name)
    ) ||
    Boolean(
      !trimOptional(input.reserved_for_user_id) &&
        (trimOptional(defaultSeller?.external_seller_id) ||
          trimOptional(defaultSeller?.external_seller_name))
    );

  if (isExternal) {
    const externalSeller = await resolveExternalSeller(externalSellers, {
      id: trimOptional(input.reserved_for_external_seller_id) ?? defaultSeller?.external_seller_id,
      name:
        trimOptional(input.reserved_for_external_seller_name) ??
        defaultSeller?.external_seller_name,
    });

    if (!externalSeller) {
      return { error: "Vendedor externo de reserva inválido" };
    }

    return {
      reserved_for_external_seller_id: externalSeller.id,
      reserved_for_external_seller_name: externalSeller.name,
    };
  }

  const userId =
    trimOptional(input.reserved_for_user_id) ?? trimOptional(defaultSeller?.seller_user_id);

  if (!userId) {
    return { error: "Seleccioná un vendedor para la reserva" };
  }

  if (!(await isAssignableStaffUser(userId))) {
    return { error: "Vendedor de reserva inválido" };
  }

  return { reserved_for_user_id: userId };
}

export async function applyLineItemReservations<
  T extends LineItemReservationInput & { product_id?: string; shirt_name: string },
>(
  externalSellers: Collection<ExternalSellerDocument>,
  items: T[],
  defaultSeller?: DefaultReservationSeller
): Promise<{ items: T[] } | { error: string }> {
  const resolvedItems: T[] = [];

  for (const item of items) {
    if (!lineItemHasReservation(item)) {
      resolvedItems.push({
        ...item,
        reserved: false,
        reserved_sizes: [],
        reservation_entries: [],
        reserved_for_user_id: undefined,
        reserved_for_external_seller_id: undefined,
        reserved_for_external_seller_name: undefined,
      });
      continue;
    }

    const entries = getLineItemReservationEntries(item);
    if (entries.length === 0) {
      return { error: `Indicá cuántas unidades reservar por talle (${item.shirt_name})` };
    }

    const resolvedEntries: LineItemReservationEntry[] = [];

    for (const entry of entries) {
      const reservation = await resolveReservationSeller(
        externalSellers,
        {
          reserved: true,
          reserved_seller_type: entry.reserved_seller_type,
          reserved_for_user_id: entry.reserved_for_user_id,
          reserved_for_external_seller_id: entry.reserved_for_external_seller_id,
          reserved_for_external_seller_name: entry.reserved_for_external_seller_name,
        },
        defaultSeller
      );

      if ("error" in reservation) {
        return { error: `${reservation.error} (${item.shirt_name}, talle ${entry.size})` };
      }

      resolvedEntries.push({
        size: entry.size.trim(),
        quantity: entry.quantity,
        ...reservation,
      });
    }

    const reservedQuantityBySizes = resolvedEntries.reduce<Record<string, number>>((acc, entry) => {
      const size = entry.size.trim();
      acc[size] = (acc[size] ?? 0) + entry.quantity;
      return acc;
    }, {});

    const primaryReservation = reservationFieldsFromEntry(resolvedEntries[0]);

    resolvedItems.push({
      ...item,
      reserved: true,
      reserved_sizes: Object.keys(reservedQuantityBySizes),
      reserved_quantity_by_sizes: reservedQuantityBySizes,
      reservation_entries: resolvedEntries,
      ...(primaryReservation ?? {}),
      reserved_seller_type: undefined,
    });
  }

  return { items: resolvedItems };
}

export async function syncProductReservationsFromItems(
  products: Collection<ProductDocument>,
  items: Array<LineItemReservationInput & { product_id?: string }>
): Promise<void> {
  const entriesByProduct = new Map<string, CatalogReservationEntry[]>();

  for (const item of items) {
    if (!lineItemHasReservation(item)) continue;

    const productId = item.product_id?.trim();
    if (!productId) continue;

    const entries = getLineItemReservationEntries(item);
    if (entries.length === 0) continue;

    const catalogEntries = entries
      .map((entry) => {
        const reservation = reservationFieldsFromEntry(entry);
        if (!reservation) return null;
        return {
          size: entry.size.trim(),
          quantity: entry.quantity,
          ...reservation,
        };
      })
      .filter((entry): entry is CatalogReservationEntry => Boolean(entry));

    if (catalogEntries.length === 0) continue;

    const existing = entriesByProduct.get(productId) ?? [];
    entriesByProduct.set(productId, [...existing, ...catalogEntries]);
  }

  const now = new Date();

  for (const [productId, catalogEntries] of entriesByProduct) {
    await products.updateOne(
      { _id: productId, ...nonDeletedProductFilter },
      {
        $set: {
          catalog_reservation_entries: catalogEntries,
          updated_at: now,
        },
        $unset: PRODUCT_CATALOG_RESERVATION_UNSET_FIELDS,
      }
    );
  }
}

export async function clearProductCatalogReservations(
  products: Collection<ProductDocument>,
  productId: string
): Promise<void> {
  await products.updateOne(
    { _id: productId, ...nonDeletedProductFilter },
    {
      $set: {
        catalog_reservation_entries: [],
        updated_at: new Date(),
      },
      $unset: PRODUCT_CATALOG_RESERVATION_UNSET_FIELDS,
    }
  );
}

export async function clearProductSizeReservations(
  products: Collection<ProductDocument>,
  keys: ProductSizeReservationKey[]
): Promise<void> {
  const productIds = new Set(keys.map(({ productId }) => productId.trim()).filter(Boolean));

  for (const productId of productIds) {
    await clearProductCatalogReservations(products, productId);
  }
}

export async function reconcileProductReservations(
  products: Collection<ProductDocument>,
  previousItems: Array<LineItemReservationInput & { product_id?: string }>,
  nextItems: Array<LineItemReservationInput & { product_id?: string }>
): Promise<void> {
  const previousProductIds = getReservedProductIds(previousItems);
  const nextProductIds = getReservedProductIds(nextItems);

  await syncProductReservationsFromItems(products, nextItems);

  for (const productId of previousProductIds) {
    if (!nextProductIds.has(productId)) {
      await clearProductCatalogReservations(products, productId);
    }
  }
}

function validateReservationForSeller(
  reservation: ProductReservationFields,
  seller: ResolvedSaleSeller,
  productName: string,
  sizeLabel?: string
): string | null {
  const reservedForUser = trimOptional(reservation.reserved_for_user_id);
  const reservedForExternalId = trimOptional(reservation.reserved_for_external_seller_id);
  const reservedForExternalName = trimOptional(reservation.reserved_for_external_seller_name);

  if (!reservedForUser && !reservedForExternalId && !reservedForExternalName) {
    return null;
  }

  const saleExternalId = trimOptional(seller.external_seller_id);
  const saleExternalName = trimOptional(seller.external_seller_name);
  const subject = sizeLabel
    ? `El talle ${sizeLabel} de ${productName}`
    : productName;

  if (reservedForExternalId || reservedForExternalName) {
    if (saleExternalId && reservedForExternalId && saleExternalId === reservedForExternalId) {
      return null;
    }

    if (
      saleExternalName &&
      reservedForExternalName &&
      saleExternalName.toLocaleLowerCase() === reservedForExternalName.toLocaleLowerCase()
    ) {
      return null;
    }

    const reservedLabel = reservedForExternalName ?? "otro vendedor externo";
    return `${subject} está reservado para ${reservedLabel}.`;
  }

  if (reservedForUser && seller.created_by === reservedForUser) {
    return null;
  }

  return `${subject} está reservado para otro vendedor del sistema.`;
}

function findStockForSize(
  stockBySizes: Record<string, number>,
  size: string
): number {
  const trimmed = size.trim();
  if (!trimmed) return 0;

  if (stockBySizes[trimmed] != null) {
    return Math.max(0, stockBySizes[trimmed]);
  }

  const normalized = trimmed.toLocaleLowerCase();
  for (const [stockSize, stock] of Object.entries(stockBySizes)) {
    if (stockSize.trim().toLocaleLowerCase() === normalized) {
      return Math.max(0, stock);
    }
  }

  return 0;
}

export async function resolveCatalogReservationEntries(
  externalSellers: Collection<ExternalSellerDocument>,
  stockBySizes: Record<string, number>,
  input: unknown
): Promise<{ catalog_reservation_entries: CatalogReservationEntry[] } | { error: string }> {
  if (input == null) {
    return { catalog_reservation_entries: [] };
  }

  if (!Array.isArray(input)) {
    return { error: "Reservas inválidas" };
  }

  const reservedBySize = new Map<string, number>();
  const catalogEntries: CatalogReservationEntry[] = [];

  for (const rawEntry of input) {
    if (!rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) {
      return { error: "Reservas inválidas" };
    }

    const entry = rawEntry as Record<string, unknown>;
    const size = typeof entry.size === "string" ? entry.size.trim() : "";
    const quantity = Number(entry.quantity);

    if (!size || !Number.isInteger(quantity) || quantity <= 0) {
      return { error: "Indicá talle y cantidad válidos en cada reserva" };
    }

    const stockForSize = findStockForSize(stockBySizes, size);
    if (stockForSize <= 0) {
      return { error: `No hay stock para reservar el talle ${size}` };
    }

    const usedForSize = reservedBySize.get(size.toLocaleLowerCase()) ?? 0;
    if (usedForSize + quantity > stockForSize) {
      return { error: `La cantidad reservada del talle ${size} supera el stock disponible` };
    }
    reservedBySize.set(size.toLocaleLowerCase(), usedForSize + quantity);

    const reservation = await resolveReservationSeller(externalSellers, {
      reserved: true,
      reserved_for_user_id:
        typeof entry.reserved_for_user_id === "string" ? entry.reserved_for_user_id : undefined,
      reserved_for_external_seller_id:
        typeof entry.reserved_for_external_seller_id === "string"
          ? entry.reserved_for_external_seller_id
          : undefined,
      reserved_for_external_seller_name:
        typeof entry.reserved_for_external_seller_name === "string"
          ? entry.reserved_for_external_seller_name
          : undefined,
    });

    if ("error" in reservation) {
      return { error: `${reservation.error} (talle ${size})` };
    }

    catalogEntries.push({
      size,
      quantity,
      ...reservation,
    });
  }

  return { catalog_reservation_entries: catalogEntries };
}

export type SaleReservationConsumeItem = {
  product_id: string;
  size?: string;
  quantity: number;
  skip_stock_deduction?: boolean;
};

function consumeCatalogReservationEntries(
  entries: CatalogReservationEntry[],
  seller: ResolvedSaleSeller,
  size: string,
  quantity: number
): { entries: CatalogReservationEntry[]; consumed: number } {
  let remaining = quantity;
  const updated: CatalogReservationEntry[] = [];

  for (const entry of entries) {
    if (remaining <= 0) {
      updated.push(entry);
      continue;
    }

    if (!sizesMatch(entry.size, size) || !reservationFieldsMatchSeller(entry, seller)) {
      updated.push(entry);
      continue;
    }

    const consumed = Math.min(remaining, entry.quantity);
    remaining -= consumed;
    const nextQuantity = entry.quantity - consumed;

    if (nextQuantity > 0) {
      updated.push({ ...entry, quantity: nextQuantity });
    }
  }

  return { entries: updated, consumed: quantity - remaining };
}

function removeLegacySizeReservation(
  reservedBySizes: Record<string, ProductReservationFields>,
  size: string
): Record<string, ProductReservationFields> {
  const next = { ...reservedBySizes };

  for (const reservedSize of Object.keys(next)) {
    if (sizesMatch(reservedSize, size)) {
      delete next[reservedSize];
    }
  }

  return next;
}

export async function consumeProductReservationsForSale(
  products: Collection<ProductDocument>,
  seller: ResolvedSaleSeller,
  items: SaleReservationConsumeItem[]
): Promise<Product[]> {
  const consumeByProduct = new Map<string, Map<string, number>>();

  for (const item of items) {
    if (item.skip_stock_deduction) continue;

    const productId = item.product_id.trim();
    const size = item.size?.trim() ?? "";
    if (!productId || !size || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      continue;
    }

    const sizeQuantities = consumeByProduct.get(productId) ?? new Map<string, number>();
    sizeQuantities.set(size, (sizeQuantities.get(size) ?? 0) + item.quantity);
    consumeByProduct.set(productId, sizeQuantities);
  }

  const updatedProducts: Product[] = [];
  const now = new Date();

  for (const [productId, sizeQuantities] of consumeByProduct) {
    const productDoc = await products.findOne({ _id: productId, ...nonDeletedProductFilter });
    if (!productDoc) continue;

    const product = productFromDoc(productDoc);
    let catalogEntries = getCatalogReservationEntriesFromProduct(product);
    let catalogChanged = false;

    for (const [size, quantity] of sizeQuantities) {
      if (catalogEntries.length === 0) break;

      const result = consumeCatalogReservationEntries(catalogEntries, seller, size, quantity);
      if (result.consumed > 0) {
        catalogEntries = result.entries;
        catalogChanged = true;
      }
    }

    let reservedBySizes = product.reserved_by_sizes;
    let legacyChanged = false;

    if (reservedBySizes && Object.keys(reservedBySizes).length > 0) {
      for (const [size] of sizeQuantities) {
        const sizeReservation = findSizeReservation(reservedBySizes, size);
        if (sizeReservation && reservationFieldsMatchSeller(sizeReservation, seller)) {
          reservedBySizes = removeLegacySizeReservation(reservedBySizes, size);
          legacyChanged = true;
        }
      }
    }

    if (!catalogChanged && !legacyChanged) continue;

    const setFields: Record<string, unknown> = { updated_at: now };
    const unsetFields: Record<string, ""> = {};

    if (catalogChanged) {
      if (catalogEntries.length > 0) {
        setFields.catalog_reservation_entries = catalogEntries;
      } else {
        setFields.catalog_reservation_entries = [];
        Object.assign(unsetFields, PRODUCT_CATALOG_RESERVATION_UNSET_FIELDS);
      }
    }

    if (legacyChanged) {
      if (reservedBySizes && Object.keys(reservedBySizes).length > 0) {
        setFields.reserved_by_sizes = reservedBySizes;
      } else {
        unsetFields.reserved_by_sizes = "";
        if (!catalogChanged || catalogEntries.length === 0) {
          Object.assign(unsetFields, PRODUCT_RESERVATION_UNSET_FIELDS);
        }
      }
    }

    const updateQuery: Record<string, unknown> = { $set: setFields };
    if (Object.keys(unsetFields).length > 0) {
      updateQuery.$unset = unsetFields;
    }

    const updatedDoc = await products.findOneAndUpdate(
      { _id: productId, ...nonDeletedProductFilter },
      updateQuery,
      { returnDocument: "after" }
    );

    if (updatedDoc) {
      updatedProducts.push(productFromDoc(updatedDoc));
    }
  }

  return updatedProducts;
}

export function validateProductReservationForSale(
  product: ProductReservationFields & {
    name?: string;
    stock_by_sizes?: Record<string, number>;
    catalog_reservation_entries?: CatalogReservationEntry[];
    reserved_by_sizes?: Record<string, ProductReservationFields>;
  },
  seller: ResolvedSaleSeller,
  saleSize?: string,
  saleQuantity = 1
): string | null {
  const productName = product.name ?? "Este producto";
  const size = saleSize?.trim();

  if (size) {
    const catalogEntries = getCatalogReservationEntriesFromProduct(product).filter((entry) =>
      sizesMatch(entry.size, size)
    );

    if (catalogEntries.length > 0) {
      const stockForSize = findStockForSize(product.stock_by_sizes ?? {}, size);
      const totalReserved = catalogEntries.reduce((sum, entry) => sum + entry.quantity, 0);
      const sellerReserved = catalogEntries
        .filter((entry) => reservationFieldsMatchSeller(entry, seller))
        .reduce((sum, entry) => sum + entry.quantity, 0);
      const unreserved = Math.max(0, stockForSize - totalReserved);
      const maxForSeller = sellerReserved + unreserved;

      if (saleQuantity <= maxForSeller) {
        return null;
      }

      if (sellerReserved > 0) {
        return `Solo podés vender ${maxForSeller} unidad(es) del talle ${size} de ${productName} según las reservas.`;
      }

      return `El talle ${size} de ${productName} tiene unidades reservadas para otro vendedor.`;
    }

    const sizeReservation = findSizeReservation(product.reserved_by_sizes, size);
    if (sizeReservation) {
      return validateReservationForSeller(sizeReservation, seller, productName, size);
    }

    const hasCatalogReservations = getCatalogReservationEntriesFromProduct(product).length > 0;
    if (hasCatalogReservations) {
      return null;
    }
  }

  const hasSizeReservations = Boolean(
    product.reserved_by_sizes &&
      Object.values(product.reserved_by_sizes).some((reservation) =>
        reservationFieldsAreActive(reservation)
      )
  );

  if (hasSizeReservations || getCatalogReservationEntriesFromProduct(product).length > 0) {
    return null;
  }

  return validateReservationForSeller(product, seller, productName);
}
