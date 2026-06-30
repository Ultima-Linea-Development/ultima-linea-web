import type { ExternalSeller, Product, SaleAssignableUser } from "@/lib/api";
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

export function getProductReservedSizeEntries(
  product: Pick<Product, "reserved_by_sizes" | "reserved_for_user_id" | "reserved_for_external_seller_id" | "reserved_for_external_seller_name">
): Array<{ size: string; reservation: ProductReservationFields }> {
  if (product.reserved_by_sizes && Object.keys(product.reserved_by_sizes).length > 0) {
    return sortSizeEntries(Object.entries(product.reserved_by_sizes))
      .filter(([, reservation]) => reservationFieldsAreActive(reservation))
      .map(([size, reservation]) => ({ size, reservation }));
  }

  return [];
}

export function isProductReserved(
  product: ProductReservationFields & { reserved_by_sizes?: SizeReservationMap }
): boolean {
  if (getProductReservedSizeEntries(product).length > 0) return true;
  return hasLegacyProductReservation(product);
}

export function isSizeReserved(
  product: Pick<Product, "reserved_by_sizes" | "reserved_for_user_id" | "reserved_for_external_seller_id" | "reserved_for_external_seller_name">,
  size: string
): boolean {
  const trimmedSize = size.trim();
  if (!trimmedSize) return false;

  const entries = getProductReservedSizeEntries(product);
  if (entries.length > 0) {
    return entries.some(
      ({ size: reservedSize }) =>
        reservedSize.trim().toLocaleLowerCase() === trimmedSize.toLocaleLowerCase()
    );
  }

  return hasLegacyProductReservation(product);
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
    return reservation.reserved_for_user_id;
  }

  return "Vendedor desconocido";
}

export function getProductReservationSummary(
  product: Pick<Product, "reserved_by_sizes" | "reserved_for_user_id" | "reserved_for_external_seller_id" | "reserved_for_external_seller_name">,
  assignableUsers: SaleAssignableUser[] = [],
  externalSellers: ExternalSeller[] = []
): string | null {
  const entries = getProductReservedSizeEntries(product);

  if (entries.length > 0) {
    const labels = new Set(
      entries.map(({ reservation }) =>
        getProductReservationLabel(reservation, assignableUsers, externalSellers)
      )
    );

    const sizesLabel = entries.map(({ size }) => size).join(", ");
    const sellerLabel =
      labels.size === 1
        ? [...labels][0]
        : entries
            .map(({ size, reservation }) =>
              `${size}: ${getProductReservationLabel(reservation, assignableUsers, externalSellers)}`
            )
            .join(" · ");

    return `${sizesLabel} · ${sellerLabel}`;
  }

  if (!hasLegacyProductReservation(product)) return null;

  return getProductReservationLabel(product, assignableUsers, externalSellers);
}

export function getProductReservationBadgeText(
  product: Pick<Product, "reserved_by_sizes" | "reserved_for_user_id" | "reserved_for_external_seller_id" | "reserved_for_external_seller_name">,
  assignableUsers: SaleAssignableUser[] = [],
  externalSellers: ExternalSeller[] = []
): { label: string; title: string } | null {
  const entries = getProductReservedSizeEntries(product);

  if (entries.length === 0) {
    if (!hasLegacyProductReservation(product)) return null;

    const sellerLabel = getProductReservationLabel(product, assignableUsers, externalSellers);
    return {
      label: `Reservado para ${sellerLabel}`,
      title: `Reservado para ${sellerLabel}`,
    };
  }

  const sizesLabel = entries.map(({ size }) => size).join(", ");
  const sellerLabels = entries.map(({ reservation }) =>
    getProductReservationLabel(reservation, assignableUsers, externalSellers)
  );
  const uniqueSellerLabels = new Set(sellerLabels);

  if (uniqueSellerLabels.size === 1) {
    const sellerLabel = sellerLabels[0];
    const label = `Reservado para ${sellerLabel} · ${sizesLabel}`;
    return { label, title: label };
  }

  const detail = entries
    .map(({ size, reservation }) =>
      `${size}: ${getProductReservationLabel(reservation, assignableUsers, externalSellers)}`
    )
    .join(" · ");
  const label = `Reservado · ${detail}`;

  return { label, title: label };
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
