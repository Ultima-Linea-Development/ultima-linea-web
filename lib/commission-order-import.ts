import type { Commission, CommissionLineItem, Product, SaleAssignableUser } from "@/lib/api";
import type { SupplierOrderLineItemDraft } from "@/components/admin/AdminSupplierOrderLineItemRow";
import { createLineItemReservationSellerValue } from "@/components/admin/AdminSupplierOrderLineItemRow";
import { getCommissionSellerLabel } from "@/lib/commission-display";
import {
  buildProductName,
  DEFAULT_PRODUCT_TYPE,
  extractKitTypeFromName,
  extractProductTypeFromName,
} from "@/lib/product-name";
import { reservationRowsFromLineItem, sizeRowsFromLineItem, buildReservationRowsFromSizeRows } from "@/lib/supplier-order-sizes";
import { commissionToSellerFormValue } from "@/lib/commission-seller";

export function buildCommissionExportNote(
  commission: Pick<Commission, "customer_name" | "customer_contact" | "seller_user_id" | "external_seller_name">,
  assignableUsers: SaleAssignableUser[] = []
): string {
  const seller = getCommissionSellerLabel(commission, assignableUsers);
  const customer = commission.customer_name.trim();
  const contact = commission.customer_contact?.trim();
  return contact
    ? `Encargo de ${customer} (${contact}) via ${seller}`
    : `Encargo de ${customer} via ${seller}`;
}

export function commissionLineItemToSupplierOrderDraft(
  item: CommissionLineItem,
  commission: Commission,
  products: Product[],
  currentUserId: string | null,
  assignableUsers: SaleAssignableUser[] = []
): SupplierOrderLineItemDraft {
  const matchedProduct = item.product_id
    ? products.find((product) => product.id === item.product_id)
    : products.find(
        (product) => product.name.toLocaleLowerCase() === item.shirt_name.toLocaleLowerCase()
      );

  const productType =
    item.product_type ?? extractProductTypeFromName(item.shirt_name) ?? DEFAULT_PRODUCT_TYPE;
  const kitType = item.kit_type ?? extractKitTypeFromName(item.shirt_name) ?? "";
  const team = item.team ?? matchedProduct?.team ?? "";
  const season = item.season ?? matchedProduct?.season ?? "";
  const generatedName = buildProductName({
    productType,
    kitType,
    team,
    season,
    type: item.type,
  });

  const exportNote = buildCommissionExportNote(commission, assignableUsers);
  const description = [exportNote, item.description?.trim()].filter(Boolean).join(" · ");
  const sizeRows = sizeRowsFromLineItem(item);
  const reservationRows = reservationRowsFromLineItem(item, currentUserId);
  const sellerValue = createLineItemReservationSellerValue(
    {
      reservationSellerValue: commissionToSellerFormValue(commission, currentUserId),
      reserved_for_user_id: item.reserved_for_user_id ?? commission.seller_user_id,
      reserved_for_external_seller_id:
        item.reserved_for_external_seller_id ?? commission.external_seller_id,
      reserved_for_external_seller_name:
        item.reserved_for_external_seller_name ?? commission.external_seller_name,
    },
    currentUserId
  );
  const resolvedReservationRows =
    item.reserved && reservationRows.length === 0
      ? buildReservationRowsFromSizeRows(sizeRows, sellerValue)
      : reservationRows;

  return {
    key: `${commission.id}-${item.id}`,
    productId: item.product_id ?? matchedProduct?.id,
    productName: item.shirt_name,
    isNameManuallyEdited: item.shirt_name.trim() !== generatedName.trim(),
    productType,
    kitType,
    team,
    league: item.league ?? matchedProduct?.league ?? "",
    season,
    isCustomProductType: false,
    isCustomKitType: false,
    isCustomTeam: false,
    isCustomLeague: false,
    isCustomSeason: false,
    isCustomProduct: !item.product_id && !matchedProduct,
    type: item.type,
    sizeRows,
    reservationRows: resolvedReservationRows,
    dorsal: item.dorsal ?? "",
    description,
    link: item.link ?? "",
    price: String(item.price),
    isCustomPrice: true,
    reserveProduct: Boolean(item.reserved) || resolvedReservationRows.length > 0,
    reservationSellerValue: sellerValue,
  };
}

export function pendingCommissionsToSupplierOrderDrafts(
  commissions: Commission[],
  products: Product[],
  currentUserId: string | null,
  assignableUsers: SaleAssignableUser[] = [],
  loadedCommissionIds: string[] = []
): {
  drafts: SupplierOrderLineItemDraft[];
  commissionIds: string[];
  exportNotes: string[];
} {
  const loaded = new Set(loadedCommissionIds);
  const pending = commissions.filter(
    (commission) => commission.status === "pending" && !loaded.has(commission.id)
  );

  const drafts: SupplierOrderLineItemDraft[] = [];
  const commissionIds: string[] = [];
  const exportNotes: string[] = [];

  for (const commission of pending) {
    commissionIds.push(commission.id);
    exportNotes.push(buildCommissionExportNote(commission, assignableUsers));

    for (const item of commission.items) {
      drafts.push(
        commissionLineItemToSupplierOrderDraft(
          item,
          commission,
          products,
          currentUserId,
          assignableUsers
        )
      );
    }
  }

  return { drafts, commissionIds, exportNotes };
}

export function isEmptySupplierOrderLineItemDraft(
  item: Pick<SupplierOrderLineItemDraft, "productName">
): boolean {
  return !item.productName.trim();
}
