import { NextRequest, NextResponse } from "next/server";
import {
  ensureIndexes,
  getSupplierOrdersCollection,
  getSuppliersCollection,
} from "@/lib/server/db";
import { SupplierDocument, SupplierOrderDocument } from "@/lib/server/models";
import {
  isNextResponse,
  jsonError,
  assertCanDeleteOwnedResource,
  requireStaff,
  requireAuth,
} from "@/lib/server/auth-middleware";
import { resolveSupplier } from "@/lib/server/suppliers";
import {
  normalizeSupplierOrderForResponse,
  parseSupplierOrderLineItems,
  applySupplierOrderDateField,
  parseSupplierOrderOptionalCost,
  parseSupplierOrderStatus,
  type SupplierOrderLineItemInput,
} from "@/lib/server/supplier-orders";
import {
  normalizeSupplierOrderTrackingLink,
  validateSupplierOrderTrackingLink,
} from "@/lib/supplier-order-display";
import { parseSaleDateInput } from "@/lib/sale-date";
import { trackAdminAction } from "@/lib/server/admin-history";

type RouteContext = { params: Promise<{ id: string }> };

type UpdateSupplierOrderBody = {
  name?: string;
  supplier_id?: string;
  supplier_name?: string;
  supplier_contact_name?: string;
  supplier_email?: string;
  supplier_phone?: string;
  supplier_notes?: string;
  supplier_link?: string;
  status?: string;
  notes?: string;
  order_date?: string;
  tracking_number?: string;
  tracking_link?: string;
  tax_cost?: number | string | null;
  shipping_cost?: number | string | null;
  paid_at?: string;
  sent_at?: string;
  received_at?: string;
  items?: SupplierOrderLineItemInput[];
};

function trimOptional(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = requireStaff(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();
    const { id } = await context.params;
    const collection = await getSupplierOrdersCollection<SupplierOrderDocument>();
    const doc = await collection.findOne({ _id: id });

    if (!doc) {
      return jsonError("Pedido no encontrado", 404);
    }

    return NextResponse.json({ order: normalizeSupplierOrderForResponse(doc) });
  } catch {
    return jsonError("Failed to fetch supplier order", 500);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = requireStaff(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();
    const { id } = await context.params;
    const body = (await request.json()) as UpdateSupplierOrderBody;
    const collection = await getSupplierOrdersCollection<SupplierOrderDocument>();
    const existing = await collection.findOne({ _id: id });

    if (!existing) {
      return jsonError("Pedido no encontrado", 404);
    }

    const updateFields: Record<string, unknown> = {
      updated_at: new Date(),
    };
    const unsetFields: Record<string, ""> = {};

    const orderDateInput = body.order_date?.trim();
    if (orderDateInput) {
      const parsedOrderDate = parseSaleDateInput(orderDateInput);
      if (!parsedOrderDate) return jsonError("Fecha del pedido inválida", 400);
      updateFields.created_at = parsedOrderDate;
    }

    if (body.name != null) {
      const name = body.name.trim();
      if (!name) return jsonError("El nombre del pedido es obligatorio", 400);
      updateFields.name = name;
    }

    if (body.status != null) {
      const status = parseSupplierOrderStatus(body.status);
      if (!status) return jsonError("Estado inválido", 400);
      updateFields.status = status;
    }

    if ("notes" in body) {
      const notes = trimOptional(body.notes);
      if (notes) {
        updateFields.notes = notes;
      } else {
        unsetFields.notes = "";
      }
    }

    if ("tracking_number" in body) {
      const trackingNumber = trimOptional(body.tracking_number);
      if (trackingNumber) {
        updateFields.tracking_number = trackingNumber;
      } else {
        unsetFields.tracking_number = "";
      }
    }

    if ("tracking_link" in body) {
      const trackingLinkError = validateSupplierOrderTrackingLink(body.tracking_link ?? "");
      if (trackingLinkError) return jsonError(trackingLinkError, 400);

      const trackingLink = normalizeSupplierOrderTrackingLink(body.tracking_link ?? "");
      if (trackingLink) {
        updateFields.tracking_link = trackingLink;
      } else {
        unsetFields.tracking_link = "";
      }
    }

    if ("tax_cost" in body) {
      const taxCost = parseSupplierOrderOptionalCost(body.tax_cost);
      if (taxCost === "invalid") return jsonError("Costo de impuesto inválido", 400);
      if (taxCost !== null) {
        updateFields.tax_cost = taxCost;
      } else {
        unsetFields.tax_cost = "";
      }
    }

    if ("shipping_cost" in body) {
      const shippingCost = parseSupplierOrderOptionalCost(body.shipping_cost);
      if (shippingCost === "invalid") return jsonError("Costo de envío inválido", 400);
      if (shippingCost !== null) {
        updateFields.shipping_cost = shippingCost;
      } else {
        unsetFields.shipping_cost = "";
      }
    }

    const paidAtResult = applySupplierOrderDateField(
      body.paid_at,
      "paid_at" in body,
      updateFields,
      unsetFields,
      "paid_at"
    );
    if (paidAtResult === "invalid") return jsonError("Fecha de pago inválida", 400);

    const sentAtResult = applySupplierOrderDateField(
      body.sent_at,
      "sent_at" in body,
      updateFields,
      unsetFields,
      "sent_at"
    );
    if (sentAtResult === "invalid") return jsonError("Fecha de envío inválida", 400);

    const receivedAtResult = applySupplierOrderDateField(
      body.received_at,
      "received_at" in body,
      updateFields,
      unsetFields,
      "received_at"
    );
    if (receivedAtResult === "invalid") return jsonError("Fecha de recepción inválida", 400);

    if (
      body.supplier_id != null ||
      body.supplier_name != null ||
      body.supplier_contact_name != null ||
      body.supplier_email != null ||
      body.supplier_phone != null ||
      body.supplier_notes != null ||
      body.supplier_link != null
    ) {
      const suppliers = await getSuppliersCollection<SupplierDocument>();
      const supplier = await resolveSupplier(suppliers, {
        id: body.supplier_id,
        name: body.supplier_name,
        contact_name: body.supplier_contact_name,
        email: body.supplier_email,
        phone: body.supplier_phone,
        notes: body.supplier_notes,
        link: body.supplier_link,
      });

      if (supplier) {
        updateFields.supplier_id = supplier.id;
        updateFields.supplier_name = supplier.name;
      } else {
        unsetFields.supplier_id = "";
        unsetFields.supplier_name = "";
      }
    }

    if (body.items != null) {
      const itemsResult = parseSupplierOrderLineItems(body.items);
      if ("error" in itemsResult) {
        return jsonError(itemsResult.error, 400);
      }
      updateFields.items = itemsResult.items;
    }

    const updateDoc: Record<string, unknown> = { $set: updateFields };
    if (Object.keys(unsetFields).length > 0) {
      updateDoc.$unset = unsetFields;
    }

    const result = await collection.findOneAndUpdate({ _id: id }, updateDoc, {
      returnDocument: "after",
    });

    if (!result) {
      return jsonError("Pedido no encontrado", 404);
    }

    await trackAdminAction({
      auth,
      action: "update",
      resource: "supplier_order",
      resourceId: id,
      resourceLabel: result.name,
    });

    return NextResponse.json({ order: normalizeSupplierOrderForResponse(result) });
  } catch {
    return jsonError("Failed to update supplier order", 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = requireStaff(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();
    const { id } = await context.params;
    const collection = await getSupplierOrdersCollection<SupplierOrderDocument>();
    const existing = await collection.findOne({ _id: id });

    if (!existing) {
      return jsonError("Pedido no encontrado", 404);
    }

    const deleteCheck = assertCanDeleteOwnedResource(auth, existing.created_by);
    if (isNextResponse(deleteCheck)) return deleteCheck;

    await collection.deleteOne({ _id: id });
    await trackAdminAction({
      auth,
      action: "delete",
      resource: "supplier_order",
      resourceId: id,
      resourceLabel: existing.name,
    });

    return NextResponse.json({ message: "Pedido eliminado" });
  } catch {
    return jsonError("Failed to delete supplier order", 500);
  }
}
