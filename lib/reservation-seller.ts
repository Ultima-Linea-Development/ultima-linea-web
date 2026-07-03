import type { ProductReservationFields } from "@/lib/product-reservation";
import {
  createDefaultSaleSellerValue,
  NEW_EXTERNAL_SELLER_VALUE,
  saleSellerValueToPayload,
  saleToSellerFormValue,
  type SaleSellerFormValue,
} from "@/lib/sale-seller";

export type ReservationSellerPayload = {
  reserved_seller_type?: "internal" | "external";
  reserved_for_user_id?: string;
  reserved_for_external_seller_id?: string;
  reserved_for_external_seller_name?: string;
};

export function reservationSellerFieldsFromFormValue(
  value: SaleSellerFormValue,
  canAssignUser: boolean
): ReservationSellerPayload {
  const payload = saleSellerValueToPayload(value, canAssignUser);

  if (payload.seller_type === "external") {
    return {
      reserved_seller_type: "external",
      ...(payload.external_seller_id
        ? { reserved_for_external_seller_id: payload.external_seller_id }
        : {}),
      ...(payload.external_seller_name
        ? { reserved_for_external_seller_name: payload.external_seller_name }
        : {}),
    };
  }

  const reservedForUserId =
    payload.created_by ??
    (value.sellerType === "internal" ? value.internalUserId.trim() : "");

  return {
    reserved_seller_type: "internal",
    ...(reservedForUserId ? { reserved_for_user_id: reservedForUserId } : {}),
  };
}

export function reservationSellerFieldsFromCommissionPayload(payload: {
  seller_type?: "internal" | "external";
  seller_user_id?: string;
  external_seller_id?: string;
  external_seller_name?: string;
}): ReservationSellerPayload {
  if (payload.seller_type === "external") {
    return {
      reserved_seller_type: "external",
      ...(payload.external_seller_id
        ? { reserved_for_external_seller_id: payload.external_seller_id }
        : {}),
      ...(payload.external_seller_name
        ? { reserved_for_external_seller_name: payload.external_seller_name }
        : {}),
    };
  }

  return {
    reserved_seller_type: "internal",
    ...(payload.seller_user_id ? { reserved_for_user_id: payload.seller_user_id } : {}),
  };
}

export function sellerFormValueFromReservationFields(
  fields: ProductReservationFields,
  currentUserId: string | null
): SaleSellerFormValue {
  return saleToSellerFormValue(
    {
      created_by: fields.reserved_for_user_id,
      external_seller_id: fields.reserved_for_external_seller_id,
      external_seller_name: fields.reserved_for_external_seller_name,
    },
    currentUserId
  );
}

export function getReservationSellerKey(value: SaleSellerFormValue): string {
  if (value.sellerType === "external") {
    if (value.externalSellerId && value.externalSellerId !== NEW_EXTERNAL_SELLER_VALUE) {
      return `external:${value.externalSellerId}`;
    }
    return `external-name:${value.externalSellerName.trim().toLocaleLowerCase()}`;
  }

  return `internal:${value.internalUserId}`;
}
