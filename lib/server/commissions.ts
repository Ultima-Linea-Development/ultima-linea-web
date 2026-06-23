import {
  Commission,
  CommissionDocument,
  CommissionLineItem,
  CommissionStatus,
  SupplierOrder,
  SupplierOrderLineItem,
  generateULID,
  commissionFromDoc,
} from "@/lib/server/models";
import {
  parseSupplierOrderLineItems,
  type SupplierOrderLineItemInput,
} from "@/lib/server/supplier-orders";

const VALID_STATUSES: CommissionStatus[] = ["pending", "exported", "cancelled"];

export type CommissionLineItemInput = Omit<
  SupplierOrderLineItemInput,
  "downloaded" | "cleaned" | "ordered"
>;

export type CommissionSellerInput = {
  seller_type?: "internal" | "external";
  seller_user_id?: string;
  external_seller_id?: string;
  external_seller_name?: string;
};

export type ResolvedCommissionSeller = {
  seller_user_id?: string;
  external_seller_id?: string;
  external_seller_name?: string;
};

function trimOptional(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function parseCommissionStatus(value?: string): CommissionStatus | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized && VALID_STATUSES.includes(normalized as CommissionStatus)) {
    return normalized as CommissionStatus;
  }
  return null;
}

export function parseCommissionLineItems(
  items: CommissionLineItemInput[] | undefined
): { items: CommissionLineItem[] } | { error: string } {
  const parsed = parseSupplierOrderLineItems(items);
  if ("error" in parsed) return parsed;

  return {
    items: parsed.items.map(({ downloaded: _d, cleaned: _c, ordered: _o, ...item }) => item),
  };
}

export function normalizeCommissionForResponse(
  doc: CommissionDocument | Commission
): Commission {
  const commission = "_id" in doc ? commissionFromDoc(doc) : doc;
  return {
    ...commission,
    items: Array.isArray(commission.items) ? commission.items : [],
  };
}

export function buildCommissionExportNote(commission: Commission): string {
  const seller = commission.external_seller_name?.trim() || "vendedor del sistema";
  const customer = commission.customer_name.trim();
  const contact = commission.customer_contact?.trim();
  return contact
    ? `Encargo de ${customer} (${contact}) via ${seller}`
    : `Encargo de ${customer} via ${seller}`;
}

export function commissionItemsToSupplierOrderItems(
  commission: Commission
): SupplierOrderLineItem[] {
  const exportNote = buildCommissionExportNote(commission);

  return commission.items.map((item) => {
    const description = [exportNote, item.description?.trim()].filter(Boolean).join(" · ");

    return {
      id: generateULID(),
      product_id: item.product_id,
      shirt_name: item.shirt_name,
      product_type: item.product_type,
      kit_type: item.kit_type,
      team: item.team,
      league: item.league,
      season: item.season,
      quantity: item.quantity,
      type: item.type,
      sizes: item.sizes,
      quantity_by_sizes: item.quantity_by_sizes,
      dorsal: item.dorsal,
      description: description || undefined,
      link: item.link,
      downloaded: false,
      cleaned: false,
      price: item.price,
      ordered: false,
    };
  });
}

export function appendCommissionToSupplierOrder(
  order: SupplierOrder,
  commission: Commission
): SupplierOrder {
  const exportNote = buildCommissionExportNote(commission);
  const existingNotes = order.notes?.trim();
  const nextNotes = existingNotes ? `${existingNotes}\n${exportNote}` : exportNote;

  return {
    ...order,
    notes: nextNotes,
    items: [...order.items, ...commissionItemsToSupplierOrderItems(commission)],
    updated_at: new Date(),
  };
}

export function buildDefaultCommissionName(customerName: string): string {
  return `Encargo - ${customerName.trim()}`;
}

export function resolveCommissionSellerFromSaleInput(
  seller: ResolvedCommissionSeller
): CommissionSellerInput {
  if (seller.external_seller_id || seller.external_seller_name) {
    return {
      seller_type: "external",
      external_seller_id: seller.external_seller_id,
      external_seller_name: seller.external_seller_name,
    };
  }

  return {
    seller_type: "internal",
    seller_user_id: seller.seller_user_id,
  };
}

export function mapSaleSellerToCommissionFields(
  resolved: {
    created_by: string;
    external_seller_id?: string;
    external_seller_name?: string;
  }
): ResolvedCommissionSeller {
  if (resolved.external_seller_id || resolved.external_seller_name) {
    return {
      external_seller_id: resolved.external_seller_id,
      external_seller_name: resolved.external_seller_name,
    };
  }

  return { seller_user_id: resolved.created_by };
}

export function trimCommissionCustomerContact(value?: string): string | undefined {
  return trimOptional(value);
}
