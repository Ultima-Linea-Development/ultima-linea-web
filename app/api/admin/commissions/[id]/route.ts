import { NextRequest, NextResponse } from "next/server";
import {
  ensureIndexes,
  getCommissionsCollection,
  getExternalSellersCollection,
  getProductsCollection,
} from "@/lib/server/db";
import {
  CommissionDocument,
  ExternalSellerDocument,
  ProductDocument,
} from "@/lib/server/models";
import {
  isNextResponse,
  jsonError,
  assertCanDeleteOwnedResource,
  assertCanModifyOwnedResource,
  requireStaff,
  requireAuth,
} from "@/lib/server/auth-middleware";
import { isAdminRole } from "@/lib/roles";
import {
  normalizeCommissionForResponse,
  parseCommissionLineItems,
  parseCommissionStatus,
  type CommissionLineItemInput,
} from "@/lib/server/commissions";
import { resolveSaleSellerForUpdate } from "@/lib/server/sale-seller";
import { buildDefaultCommissionName } from "@/lib/server/commissions";
import { parseSaleDateInput } from "@/lib/sale-date";
import { trackAdminAction } from "@/lib/server/admin-history";
import {
  applyLineItemReservations,
  clearProductSizeReservations,
  getReservedProductSizeKeys,
  reconcileProductReservations,
} from "@/lib/server/product-reservation";

type RouteContext = { params: Promise<{ id: string }> };

type UpdateCommissionBody = {
  customer_name?: string;
  customer_contact?: string;
  commission_date?: string;
  seller_type?: "internal" | "external";
  seller_user_id?: string;
  external_seller_id?: string;
  external_seller_name?: string;
  status?: string;
  notes?: string;
  items?: CommissionLineItemInput[];
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
    const collection = await getCommissionsCollection<CommissionDocument>();
    const doc = await collection.findOne({ _id: id });

    if (!doc) {
      return jsonError("Encargo no encontrado", 404);
    }

    return NextResponse.json({ commission: normalizeCommissionForResponse(doc) });
  } catch {
    return jsonError("Failed to fetch commission", 500);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = requireStaff(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();
    const { id } = await context.params;
    const body = (await request.json()) as UpdateCommissionBody;
    const collection = await getCommissionsCollection<CommissionDocument>();
    const existing = await collection.findOne({ _id: id });

    if (!existing) {
      return jsonError("Encargo no encontrado", 404);
    }

    if (existing.status === "exported") {
      return jsonError("No se puede editar un encargo exportado", 400);
    }

    const denied = assertCanModifyOwnedResource(auth, existing.created_by);
    if (denied) return denied;

    const updateFields: Record<string, unknown> = {
      updated_at: new Date(),
    };
    const unsetFields: Record<string, ""> = {};

    const commissionDateInput = body.commission_date?.trim();
    if (commissionDateInput) {
      const parsedCommissionDate = parseSaleDateInput(commissionDateInput);
      if (!parsedCommissionDate) return jsonError("Fecha del encargo inválida", 400);
      updateFields.created_at = parsedCommissionDate;
    }

    if (body.customer_name != null) {
      const customerName = body.customer_name.trim();
      if (!customerName) return jsonError("El nombre del cliente es obligatorio", 400);
      updateFields.customer_name = customerName;
      updateFields.name = buildDefaultCommissionName(customerName);
    }

    if ("customer_contact" in body) {
      const contact = trimOptional(body.customer_contact);
      if (contact) {
        updateFields.customer_contact = contact;
      } else {
        unsetFields.customer_contact = "";
      }
    }

    if ("notes" in body) {
      const notes = trimOptional(body.notes);
      if (notes) {
        updateFields.notes = notes;
      } else {
        unsetFields.notes = "";
      }
    }

    if (body.status != null) {
      const status = parseCommissionStatus(body.status);
      if (!status) return jsonError("Estado inválido", 400);
      if (status === "exported") {
        return jsonError("Usá exportar para asignar el encargo a un pedido", 400);
      }
      updateFields.status = status;
    }

    if (
      body.seller_type != null ||
      body.seller_user_id != null ||
      body.external_seller_id != null ||
      body.external_seller_name != null
    ) {
      if (!isAdminRole(auth.role)) {
        return jsonError("No tenés permiso para modificar el vendedor", 403);
      }

      const externalSellers = await getExternalSellersCollection<ExternalSellerDocument>();
      const sellerResult = await resolveSaleSellerForUpdate(auth, externalSellers, {
        seller_type: body.seller_type,
        created_by: body.seller_user_id,
        external_seller_id: body.external_seller_id,
        external_seller_name: body.external_seller_name,
      });

      if ("error" in sellerResult) {
        return jsonError(sellerResult.error, sellerResult.status);
      }

      const isExternal =
        body.seller_type === "external" ||
        Boolean(body.external_seller_id?.trim() || body.external_seller_name?.trim());

      if (isExternal) {
        updateFields.external_seller_id = sellerResult.set.external_seller_id;
        updateFields.external_seller_name = sellerResult.set.external_seller_name;
        unsetFields.seller_user_id = "";
      } else {
        updateFields.seller_user_id =
          sellerResult.set.created_by ?? existing.seller_user_id ?? auth.user_id;
        unsetFields.external_seller_id = "";
        unsetFields.external_seller_name = "";
      }
    }

    if (body.items != null) {
      const itemsResult = parseCommissionLineItems(body.items);
      if ("error" in itemsResult) {
        return jsonError(itemsResult.error, 400);
      }

      const externalSellers = await getExternalSellersCollection<ExternalSellerDocument>();
      const defaultSeller = {
        seller_user_id:
          (updateFields.seller_user_id as string | undefined) ?? existing.seller_user_id,
        external_seller_id:
          (updateFields.external_seller_id as string | undefined) ?? existing.external_seller_id,
        external_seller_name:
          (updateFields.external_seller_name as string | undefined) ??
          existing.external_seller_name,
      };
      const reservationResult = await applyLineItemReservations(
        externalSellers,
        itemsResult.items,
        defaultSeller
      );

      if ("error" in reservationResult) {
        return jsonError(reservationResult.error, 400);
      }

      updateFields.items = reservationResult.items;
    }

    const nextStatus =
      (updateFields.status as string | undefined) ?? existing.status;
    const previousItems = existing.items ?? [];
    const nextItems =
      (updateFields.items as typeof previousItems | undefined) ?? previousItems;

    const updateDoc: Record<string, unknown> = { $set: updateFields };
    if (Object.keys(unsetFields).length > 0) {
      updateDoc.$unset = unsetFields;
    }

    const result = await collection.findOneAndUpdate({ _id: id }, updateDoc, {
      returnDocument: "after",
    });

    if (!result) {
      return jsonError("Encargo no encontrado", 404);
    }

    const products = await getProductsCollection<ProductDocument>();
    if (nextStatus === "cancelled") {
      await clearProductSizeReservations(products, getReservedProductSizeKeys(previousItems));
    } else {
      await reconcileProductReservations(products, previousItems, nextItems);
    }

    await trackAdminAction({
      auth,
      action: "update",
      resource: "commission",
      resourceId: id,
      resourceLabel: result.name,
    });

    return NextResponse.json({ commission: normalizeCommissionForResponse(result) });
  } catch {
    return jsonError("Failed to update commission", 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = requireStaff(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();
    const { id } = await context.params;
    const collection = await getCommissionsCollection<CommissionDocument>();
    const existing = await collection.findOne({ _id: id });

    if (!existing) {
      return jsonError("Encargo no encontrado", 404);
    }

    const deleteCheck = assertCanDeleteOwnedResource(auth, existing.created_by);
    if (isNextResponse(deleteCheck)) return deleteCheck;

    const products = await getProductsCollection<ProductDocument>();
    await clearProductSizeReservations(products, getReservedProductSizeKeys(existing.items ?? []));

    await collection.deleteOne({ _id: id });
    await trackAdminAction({
      auth,
      action: "delete",
      resource: "commission",
      resourceId: id,
      resourceLabel: existing.name,
    });

    return NextResponse.json({ message: "Encargo eliminado" });
  } catch {
    return jsonError("Failed to delete commission", 500);
  }
}
