import { NextRequest, NextResponse } from "next/server";
import {
  ensureIndexes,
  getCommissionsCollection,
  getExternalSellersCollection,
  getProductsCollection,
  getSupplierOrdersCollection,
  getSuppliersCollection,
} from "@/lib/server/db";
import {
  ExternalSellerDocument,
  CommissionDocument,
  ProductDocument,
  SupplierDocument,
  SupplierOrder,
  SupplierOrderDocument,
  generateULID,
  supplierOrderToDoc,
} from "@/lib/server/models";
import {
  isNextResponse,
  jsonError,
  requireStaff,
  requireAuth,
} from "@/lib/server/auth-middleware";
import { resolveSupplier } from "@/lib/server/suppliers";
import {
  normalizeSupplierOrderForResponse,
  parseSupplierOrderLineItems,
  parseSupplierOrderOptionalCost,
  parseSupplierOrderOptionalDate,
  parseSupplierOrderStatus,
  type SupplierOrderLineItemInput,
} from "@/lib/server/supplier-orders";
import {
  normalizeSupplierOrderTrackingLink,
  validateSupplierOrderTrackingLink,
} from "@/lib/supplier-order-display";
import { trackAdminAction } from "@/lib/server/admin-history";
import {
  applyLineItemReservations,
  syncProductReservationsFromItems,
} from "@/lib/server/product-reservation";
import { markCommissionsExportedForOrder, validateCommissionsForOrderExport } from "@/lib/server/commissions";

import { parseSaleDateInput } from "@/lib/sale-date";

type CreateSupplierOrderBody = {
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
  commission_ids?: string[];
};

function trimOptional(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export async function GET(request: NextRequest) {
  const auth = requireStaff(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const { searchParams } = request.nextUrl;
    let page = parseInt(searchParams.get("page") || "1", 10);
    let perPage = parseInt(searchParams.get("per_page") || "10", 10);

    if (Number.isNaN(page) || page < 1) page = 1;
    if (Number.isNaN(perPage) || perPage < 1) perPage = 10;
    if (perPage > 50) perPage = 50;

    const collection = await getSupplierOrdersCollection<SupplierOrderDocument>();
    const total = await collection.countDocuments({});
    const skip = (page - 1) * perPage;
    const docs = await collection
      .find({})
      .sort({ created_at: -1, _id: -1 })
      .skip(skip)
      .limit(perPage)
      .toArray();

    return NextResponse.json({
      orders: docs.map(normalizeSupplierOrderForResponse),
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage),
    });
  } catch {
    return jsonError("Failed to fetch supplier orders", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = requireStaff(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const body = (await request.json()) as CreateSupplierOrderBody;
    const name = body.name?.trim();
    if (!name) {
      return jsonError("El nombre del pedido es obligatorio", 400);
    }

    const itemsResult = parseSupplierOrderLineItems(body.items);
    if ("error" in itemsResult) {
      return jsonError(itemsResult.error, 400);
    }

    const externalSellers = await getExternalSellersCollection<ExternalSellerDocument>();
    const reservationResult = await applyLineItemReservations(
      externalSellers,
      itemsResult.items
    );

    if ("error" in reservationResult) {
      return jsonError(reservationResult.error, 400);
    }

    const status = parseSupplierOrderStatus(body.status) ?? "draft";
    const paidAt = parseSupplierOrderOptionalDate(body.paid_at);
    if (paidAt === "invalid") return jsonError("Fecha de pago inválida", 400);
    const sentAt = parseSupplierOrderOptionalDate(body.sent_at);
    if (sentAt === "invalid") return jsonError("Fecha de envío inválida", 400);
    const receivedAt = parseSupplierOrderOptionalDate(body.received_at);
    if (receivedAt === "invalid") return jsonError("Fecha de recepción inválida", 400);

    const trackingLinkError = validateSupplierOrderTrackingLink(body.tracking_link ?? "");
    if (trackingLinkError) return jsonError(trackingLinkError, 400);

    const taxCost = parseSupplierOrderOptionalCost(body.tax_cost);
    if (taxCost === "invalid") return jsonError("Costo de impuesto inválido", 400);
    const shippingCost = parseSupplierOrderOptionalCost(body.shipping_cost);
    if (shippingCost === "invalid") return jsonError("Costo de envío inválido", 400);

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

    const now = new Date();
    const orderDateInput = body.order_date?.trim();
    let createdAt = now;
    if (orderDateInput) {
      const parsedOrderDate = parseSaleDateInput(orderDateInput);
      if (!parsedOrderDate) return jsonError("Fecha del pedido inválida", 400);
      createdAt = parsedOrderDate;
    }

    const commissionIds = Array.isArray(body.commission_ids)
      ? body.commission_ids.map((id) => id.trim()).filter(Boolean)
      : [];

    if (commissionIds.length > 0) {
      const commissions = await getCommissionsCollection<CommissionDocument>();
      const validationError = await validateCommissionsForOrderExport(commissions, commissionIds);
      if (validationError) {
        return jsonError(validationError.error, 409);
      }
    }

    const order: SupplierOrder = {
      id: generateULID(),
      name,
      ...(supplier
        ? {
            supplier_id: supplier.id,
            supplier_name: supplier.name,
          }
        : {}),
      status,
      notes: trimOptional(body.notes),
      ...(trimOptional(body.tracking_number)
        ? { tracking_number: trimOptional(body.tracking_number) }
        : {}),
      ...(normalizeSupplierOrderTrackingLink(body.tracking_link ?? "")
        ? { tracking_link: normalizeSupplierOrderTrackingLink(body.tracking_link ?? "") }
        : {}),
      ...(taxCost !== null ? { tax_cost: taxCost } : {}),
      ...(shippingCost !== null ? { shipping_cost: shippingCost } : {}),
      ...(paidAt ? { paid_at: paidAt } : {}),
      ...(sentAt ? { sent_at: sentAt } : {}),
      ...(receivedAt ? { received_at: receivedAt } : {}),
      items: reservationResult.items,
      created_by: auth.user_id,
      created_at: createdAt,
      updated_at: now,
    };

    const collection = await getSupplierOrdersCollection<SupplierOrderDocument>();
    const products = await getProductsCollection<ProductDocument>();
    await collection.insertOne(supplierOrderToDoc(order));
    await syncProductReservationsFromItems(products, reservationResult.items);

    if (commissionIds.length > 0) {
      const commissions = await getCommissionsCollection<CommissionDocument>();
      const exportResult = await markCommissionsExportedForOrder(
        commissions,
        commissionIds,
        order
      );

      if ("error" in exportResult) {
        await collection.deleteOne({ _id: order.id });
        return jsonError(exportResult.error, 409);
      }
    }

    await trackAdminAction({
      auth,
      action: "create",
      resource: "supplier_order",
      resourceId: order.id,
      resourceLabel: order.name,
    });

    return NextResponse.json(
      { order: normalizeSupplierOrderForResponse(order) },
      { status: 201 }
    );
  } catch {
    return jsonError("Failed to create supplier order", 500);
  }
}
