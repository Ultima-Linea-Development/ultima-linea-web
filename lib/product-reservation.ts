import type { CatalogReservationEntry, ExternalSeller, Product, SaleAssignableUser } from "@/lib/api";
import { getAssignableUserLabel } from "@/lib/user-display";
import { sortSizeEntries } from "@/lib/product-inventory";

export type ProductReservationFields = {
  reserved_for_user_id?: string;
  reserved_for_external_seller_id?: string;
  reserved_for_external_seller_name?: string;
};

export type SizeReservationMap = Record<string, ProductReservationFields>;

export type LineItemReservationFields = ProductReservationFields & {
  reserved?: boolean;
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

function hasLegacyProductReservation(product: ProductReservationFields): boolean {
  return reservationFieldsAreActive(product);
}

function sizesMatch(left: string, right: string): boolean {
  return left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase();
}

type ProductReservationSource = Pick<
  Product,
  | "catalog_reservation_entries"
  | "reserved_by_sizes"
  | "stock_by_sizes"
  | "reserved_for_user_id"
  | "reserved_for_external_seller_id"
  | "reserved_for_external_seller_name"
>;

export function getCatalogReservationEntries(
  product: ProductReservationSource
): CatalogReservationEntry[] {
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
    return sortSizeEntries(Object.entries(product.reserved_by_sizes))
      .filter(([, reservation]) => reservationFieldsAreActive(reservation))
      .map(([size, reservation]) => ({
        size,
        quantity: Math.max(1, product.stock_by_sizes?.[size] ?? 1),
        ...reservation,
      }));
  }

  return [];
}

export function getProductReservedSizeEntries(
  product: ProductReservationSource
): Array<{ size: string; reservation: ProductReservationFields; quantity: number }> {
  return getCatalogReservationEntries(product).map(({ size, quantity, ...reservation }) => ({
    size,
    quantity,
    reservation,
  }));
}

export function isProductReserved(
  product: ProductReservationFields & {
    reserved_by_sizes?: SizeReservationMap;
    catalog_reservation_entries?: CatalogReservationEntry[];
  }
): boolean {
  if (getCatalogReservationEntries(product).length > 0) return true;
  return hasLegacyProductReservation(product);
}

export function isSizeReserved(product: ProductReservationSource, size: string): boolean {
  return getReservedQuantityForSize(product, size) > 0;
}

export function getReservedQuantityForSize(
  product: ProductReservationSource,
  size: string
): number {
  const trimmedSize = size.trim();
  if (!trimmedSize) return 0;

  const entries = getCatalogReservationEntries(product);
  if (entries.length > 0) {
    return entries
      .filter((entry) => sizesMatch(entry.size, trimmedSize))
      .reduce((sum, entry) => sum + entry.quantity, 0);
  }

  if (!hasLegacyProductReservation(product)) return 0;

  const stockBySizes = product.stock_by_sizes ?? {};
  const matchedStock = Object.entries(stockBySizes).find(([stockSize]) =>
    sizesMatch(stockSize, trimmedSize)
  );
  return matchedStock?.[1] ?? 0;
}

export function getProductReservationLabel(
  reservation: ProductReservationFields,
  assignableUsers: SaleAssignableUser[] = [],
  externalSellers: ExternalSeller[] = []
): string {
  if (reservation.reserved_for_external_seller_name?.trim()) {
    return reservation.reserved_for_external_seller_name.trim();
  }

  if (reservation.reserved_for_external_seller_id) {
    const external = externalSellers.find(
      (seller) => seller.id === reservation.reserved_for_external_seller_id
    );
    if (external?.name) return external.name;
  }

  if (reservation.reserved_for_user_id) {
    const label = getAssignableUserLabel(assignableUsers, reservation.reserved_for_user_id);
    if (label !== "—") return label;
    return "Usuario del sistema";
  }

  return "Vendedor desconocido";
}

export function getProductReservationSummary(
  product: ProductReservationSource,
  assignableUsers: SaleAssignableUser[] = [],
  externalSellers: ExternalSeller[] = []
): string | null {
  const entries = getCatalogReservationEntries(product);

  if (entries.length > 0) {
    const detail = entries
      .map((entry) => {
        const sellerLabel = getProductReservationLabel(entry, assignableUsers, externalSellers);
        const sizeLabel = entry.quantity > 1 ? `${entry.size} (${entry.quantity})` : entry.size;
        return `${sizeLabel}: ${sellerLabel}`;
      })
      .join(" · ");

    return detail;
  }

  if (!hasLegacyProductReservation(product)) return null;

  return getProductReservationLabel(product, assignableUsers, externalSellers);
}

function formatReservationSizeLabel(size: string, quantity: number): string {
  return quantity > 1 ? `${size} (${quantity})` : size;
}

export function getProductReservationBadgeText(
  product: ProductReservationSource,
  assignableUsers: SaleAssignableUser[] = [],
  externalSellers: ExternalSeller[] = []
): { label: string; title: string } | null {
  const entries = getCatalogReservationEntries(product);

  if (entries.length === 0) {
    if (!hasLegacyProductReservation(product)) return null;

    const sellerLabel = getProductReservationLabel(product, assignableUsers, externalSellers);
    return {
      label: `Reservado para ${sellerLabel}`,
      title: `Reservado para ${sellerLabel}`,
    };
  }

  const sellerLabels = entries.map((entry) =>
    getProductReservationLabel(entry, assignableUsers, externalSellers)
  );
  const uniqueSellerLabels = new Set(sellerLabels);

  if (uniqueSellerLabels.size === 1) {
    const sellerLabel = sellerLabels[0];
    const sizesLabel = entries
      .map((entry) => formatReservationSizeLabel(entry.size, entry.quantity))
      .join(", ");
    const reservedWord = entries.length === 1 ? "reservado" : "reservados";
    const label = `${sizesLabel} ${reservedWord} · ${sellerLabel}`;
    return { label, title: label };
  }

  const detail = entries
    .map((entry) => {
      const sellerLabel = getProductReservationLabel(entry, assignableUsers, externalSellers);
      return `${formatReservationSizeLabel(entry.size, entry.quantity)}: ${sellerLabel}`;
    })
    .join(" · ");
  const label = `Reservados · ${detail}`;

  return { label, title: label };
}

export function getSizeReservationDetailText(
  product: ProductReservationSource,
  size: string,
  assignableUsers: SaleAssignableUser[] = [],
  externalSellers: ExternalSeller[] = []
): string | null {
  const trimmedSize = size.trim();
  if (!trimmedSize) return null;

  const entries = getCatalogReservationEntries(product).filter((entry) =>
    sizesMatch(entry.size, trimmedSize)
  );

  if (entries.length > 0) {
    const detail = entries
      .map((entry) => {
        const sellerLabel = getProductReservationLabel(entry, assignableUsers, externalSellers);
        return entry.quantity > 1
          ? `${entry.quantity} u. para ${sellerLabel}`
          : `1 u. para ${sellerLabel}`;
      })
      .join(" · ");

    return `Talle ${trimmedSize} con stock reservado: ${detail}.`;
  }

  if (isSizeReserved(product, trimmedSize) && hasLegacyProductReservation(product)) {
    const sellerLabel = getProductReservationLabel(product, assignableUsers, externalSellers);
    return `Talle ${trimmedSize} reservado para ${sellerLabel}.`;
  }

  return null;
}

export function getLineItemReservationLabel(
  item: LineItemReservationFields & { product_id?: string },
  assignableUsers: SaleAssignableUser[] = [],
  externalSellers: ExternalSeller[] = []
): string | null {
  if (!item.reserved) return null;
  return getProductReservationLabel(item, assignableUsers, externalSellers);
}

export function lineItemReservationToPayload(
  item: LineItemReservationFields & { productId?: string },
  sellerPayload?: {
    seller_type?: "internal" | "external";
    seller_user_id?: string;
    external_seller_id?: string;
    external_seller_name?: string;
  }
): LineItemReservationFields {
  if (!item.reserved || !item.productId) {
    return { reserved: false };
  }

  if (sellerPayload) {
    if (sellerPayload.seller_type === "external") {
      return {
        reserved: true,
        ...(sellerPayload.external_seller_id
          ? { reserved_for_external_seller_id: sellerPayload.external_seller_id }
          : {}),
        ...(sellerPayload.external_seller_name
          ? { reserved_for_external_seller_name: sellerPayload.external_seller_name }
          : {}),
      };
    }

    if (sellerPayload.seller_user_id) {
      return {
        reserved: true,
        reserved_for_user_id: sellerPayload.seller_user_id,
      };
    }
  }

  return {
    reserved: true,
    ...(item.reserved_for_user_id ? { reserved_for_user_id: item.reserved_for_user_id } : {}),
    ...(item.reserved_for_external_seller_id
      ? { reserved_for_external_seller_id: item.reserved_for_external_seller_id }
      : {}),
    ...(item.reserved_for_external_seller_name
      ? { reserved_for_external_seller_name: item.reserved_for_external_seller_name }
      : {}),
  };
}
