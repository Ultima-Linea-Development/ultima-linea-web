import {
  SupplierOrder,
  SupplierOrderDocument,
  SupplierOrderItemType,
  SupplierOrderLineItem,
  SupplierOrderStatus,
  generateULID,
  supplierOrderFromDoc,
} from "@/lib/server/models";
import {
  formatSupplierOrderSizesDisplay,
  getSupplierOrderLineItemQuantity,
} from "@/lib/supplier-order-sizes";
import { parseSaleDateInput } from "@/lib/sale-date";

const VALID_TYPES: SupplierOrderItemType[] = ["FAN", "PLAYER", "RETRO"];
const VALID_STATUSES: SupplierOrderStatus[] = [
  "draft",
  "sent",
  "partial",
  "completed",
  "cancelled",
];

export type SupplierOrderLineItemInput = {
  id?: string;
  product_id?: string;
  shirt_name?: string;
  product_type?: string;
  kit_type?: string;
  team?: string;
  league?: string;
  season?: string;
  quantity?: number;
  type?: string;
  sizes?: string;
  quantity_by_sizes?: Record<string, number>;
  dorsal?: string;
  description?: string;
  link?: string;
  downloaded?: boolean;
  cleaned?: boolean;
  price?: number;
  ordered?: boolean;
};

function trimOptional(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function parseItemType(value?: string): SupplierOrderItemType | null {
  const normalized = value?.trim().toUpperCase();
  if (normalized && VALID_TYPES.includes(normalized as SupplierOrderItemType)) {
    return normalized as SupplierOrderItemType;
  }
  return null;
}

function parseQuantityBySizes(
  value: Record<string, number> | undefined
): Record<string, number> | null {
  if (!value || typeof value !== "object") return null;

  const parsed: Record<string, number> = {};

  for (const [size, quantity] of Object.entries(value)) {
    const trimmedSize = size.trim();
    const numericQuantity = Number(quantity);

    if (!trimmedSize) continue;
    if (!Number.isInteger(numericQuantity) || numericQuantity <= 0) return null;

    const key = trimmedSize.toLocaleLowerCase();
    const existing = Object.entries(parsed).find(
      ([existingSize]) => existingSize.toLocaleLowerCase() === key
    );

    if (existing) {
      parsed[existing[0]] += numericQuantity;
    } else {
      parsed[trimmedSize] = numericQuantity;
    }
  }

  return Object.keys(parsed).length > 0 ? parsed : null;
}

export function parseSupplierOrderStatus(value?: string): SupplierOrderStatus | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized && VALID_STATUSES.includes(normalized as SupplierOrderStatus)) {
    return normalized as SupplierOrderStatus;
  }
  return null;
}

export function parseSupplierOrderOptionalCost(
  value: number | string | undefined | null
): number | null | "invalid" {
  if (value == null || value === "") return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return "invalid";

  return parsed;
}

export function parseSupplierOrderOptionalDate(
  value?: string | null
): Date | null | "invalid" {
  if (value == null) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = parseSaleDateInput(trimmed);
  if (!parsed) return "invalid";
  return parsed;
}

export function applySupplierOrderDateField(
  bodyValue: string | undefined,
  fieldPresent: boolean,
  updateFields: Record<string, unknown>,
  unsetFields: Record<string, "">,
  fieldName: "paid_at" | "sent_at" | "received_at"
): "invalid" | void {
  if (!fieldPresent) return;

  const parsed = parseSupplierOrderOptionalDate(bodyValue);
  if (parsed === "invalid") return "invalid";
  if (parsed) {
    updateFields[fieldName] = parsed;
  } else {
    unsetFields[fieldName] = "";
  }
}

export function parseSupplierOrderLineItems(
  items: SupplierOrderLineItemInput[] | undefined
): { items: SupplierOrderLineItem[] } | { error: string } {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "Agregá al menos un ítem" };
  }

  const parsed: SupplierOrderLineItem[] = [];

  for (const item of items) {
    const shirtName = item.shirt_name?.trim();
    if (!shirtName) {
      return { error: "Cada ítem necesita un nombre de producto" };
    }

    const type = parseItemType(item.type);
    if (!type) {
      return { error: `Tipo inválido para ${shirtName}` };
    }

    const quantityBySizes = parseQuantityBySizes(item.quantity_by_sizes);
    const sizes = item.sizes?.trim();
    const quantityFromSizes = quantityBySizes
      ? getSupplierOrderLineItemQuantity(quantityBySizes)
      : null;

    const quantity = quantityFromSizes ?? Number(item.quantity);
    let normalizedSizes = sizes;
    const normalizedQuantityBySizes = quantityBySizes ?? undefined;

    if (quantityFromSizes !== null) {
      normalizedSizes = formatSupplierOrderSizesDisplay(quantityBySizes ?? undefined, sizes);
    } else {
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return { error: `Cantidad inválida para ${shirtName}` };
      }

      if (!normalizedSizes) {
        return { error: `Indicá al menos un talle para ${shirtName}` };
      }
    }

    const price = Number(item.price);
    if (!Number.isFinite(price) || price < 0) {
      return { error: `Precio inválido para ${shirtName}` };
    }

    parsed.push({
      id: item.id?.trim() || generateULID(),
      product_id: trimOptional(item.product_id),
      shirt_name: shirtName,
      product_type: trimOptional(item.product_type),
      kit_type: trimOptional(item.kit_type),
      team: trimOptional(item.team),
      league: trimOptional(item.league),
      season: trimOptional(item.season),
      quantity,
      type,
      sizes: normalizedSizes ?? "",
      quantity_by_sizes: normalizedQuantityBySizes,
      dorsal: trimOptional(item.dorsal),
      description: trimOptional(item.description),
      link: trimOptional(item.link),
      downloaded: Boolean(item.downloaded),
      cleaned: Boolean(item.cleaned),
      price,
      ordered: Boolean(item.ordered),
    });
  }

  return { items: parsed };
}

export function normalizeSupplierOrderForResponse(
  doc: SupplierOrderDocument | SupplierOrder
): SupplierOrder {
  const order = "_id" in doc ? supplierOrderFromDoc(doc) : doc;
  return {
    ...order,
    items: Array.isArray(order.items) ? order.items : [],
    tax_cost: order.tax_cost ?? undefined,
    shipping_cost: order.shipping_cost ?? undefined,
  };
}

export function getSupplierOrderProgress(order: SupplierOrder): {
  totalItems: number;
  totalQuantity: number;
  totalPrice: number;
} {
  const items = order.items ?? [];
  return {
    totalItems: items.length,
    totalQuantity: items.reduce(
      (sum, item) =>
        sum + getSupplierOrderLineItemQuantity(item.quantity_by_sizes, item.quantity),
      0
    ),
    totalPrice: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  };
}
