import { Collection } from "mongodb";
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
      reserved: item.reserved,
      reserved_sizes: item.reserved_sizes,
      reserved_quantity_by_sizes: item.reserved_quantity_by_sizes,
      reservation_entries: item.reservation_entries,
      reserved_for_user_id: item.reserved_for_user_id,
      reserved_for_external_seller_id: item.reserved_for_external_seller_id,
      reserved_for_external_seller_name: item.reserved_for_external_seller_name,
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

export async function validateCommissionsForOrderExport(
  collection: Collection<CommissionDocument>,
  commissionIds: string[]
): Promise<{ error: string } | null> {
  const uniqueIds = [...new Set(commissionIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) return null;

  for (const id of uniqueIds) {
    const commissionDoc = await collection.findOne({ _id: id });
    if (!commissionDoc) {
      return { error: "Uno de los encargos seleccionados no existe" };
    }

    const commission = normalizeCommissionForResponse(commissionDoc);
    if (commission.status === "exported") {
      return { error: `El encargo de ${commission.customer_name} ya fue exportado` };
    }

    if (commission.status === "cancelled") {
      return { error: `El encargo de ${commission.customer_name} está cancelado` };
    }
  }

  return null;
}

export async function markCommissionsExportedForOrder(
  collection: Collection<CommissionDocument>,
  commissionIds: string[],
  order: Pick<SupplierOrder, "id" | "name">
): Promise<{ error: string } | { updated: number }> {
  const uniqueIds = [...new Set(commissionIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { updated: 0 };
  }

  const validationError = await validateCommissionsForOrderExport(collection, uniqueIds);
  if (validationError) {
    return validationError;
  }

  const now = new Date();
  const result = await collection.updateMany(
    { _id: { $in: uniqueIds }, status: "pending" },
    {
      $set: {
        status: "exported",
        supplier_order_id: order.id,
        supplier_order_name: order.name,
        updated_at: now,
      },
    }
  );

  return { updated: result.modifiedCount };
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
