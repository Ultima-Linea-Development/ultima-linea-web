import { NextRequest, NextResponse } from "next/server";
import { ensureIndexes, getExternalSellersCollection, getProductsCollection, getSalesCollection } from "@/lib/server/db";
import { ExternalSellerDocument, ProductDocument, SaleDocument } from "@/lib/server/models";
import {
  isNextResponse,
  jsonError,
  assertCanDeleteOwnedResource,
  assertCanModifyOwnedResource,
  requireStaff,
  requireAuth,
} from "@/lib/server/auth-middleware";
import { isAdminRole } from "@/lib/roles";
import { toProductResponse } from "@/lib/server/products";
import { adjustProductStock } from "@/lib/server/sales";
import { parseSaleDateInput } from "@/lib/sale-date";
import { getSaleLineItemsFromDoc, normalizeSaleForResponse } from "@/lib/server/sale-items";
import { CreateSaleItemInput, processSaleItem } from "@/lib/server/create-sale";
import {
  parseOptionalSaleText,
  resolveSaleSellerForUpdate,
  shouldUnsetOptionalSaleText,
  type SaleSellerType,
} from "@/lib/server/sale-seller";
import { trackAdminAction } from "@/lib/server/admin-history";
import { validateProductReservationForSale, consumeProductReservationsForSale } from "@/lib/server/product-reservation";
import type { ResolvedSaleSeller } from "@/lib/server/sale-seller";

type RouteContext = { params: Promise<{ id: string }> };

type UpdateSaleBody = {
  items?: {
    product_id?: string;
    size?: string;
    quantity?: number;
    unit_price?: number;
    skip_stock_deduction?: boolean;
  }[];
  sale_date?: string;
  seller_type?: SaleSellerType;
  created_by?: string;
  external_seller_id?: string;
  external_seller_name?: string;
  skip_stock_deduction?: boolean;
  transfer_alias?: string;
  description?: string;
};

function parseUpdateSaleItems(body: UpdateSaleBody): CreateSaleItemInput[] | null {
  if (!("items" in body)) return null;
  if (!Array.isArray(body.items)) return [];

  return body.items.map((item) => ({
    product_id: item.product_id?.trim() ?? "",
    size: item.size,
    quantity: Number(item.quantity),
    unit_price: item.unit_price != null ? Number(item.unit_price) : undefined,
    skip_stock_deduction: Boolean(item.skip_stock_deduction),
  }));
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = requireStaff(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const { id } = await context.params;
    const body = (await request.json()) as UpdateSaleBody;

    const sales = await getSalesCollection<SaleDocument>();
    const currentSale = await sales.findOne({ _id: id });
    if (!currentSale) return jsonError("Venta no encontrada", 404);

    const denied = assertCanModifyOwnedResource(auth, currentSale.created_by);
    if (denied) return denied;

    const itemInputs = parseUpdateSaleItems(body);
    const saleDateInput = body.sale_date?.trim();
    const updateFields: Record<string, unknown> = {
      updated_at: new Date(),
    };
    const unsetFields: Record<string, ""> = {};

    if (saleDateInput) {
      const parsedSaleDate = parseSaleDateInput(saleDateInput);
      if (!parsedSaleDate) return jsonError("Fecha inválida", 400);
      updateFields.created_at = parsedSaleDate;
    }

    if ("transfer_alias" in body) {
      if (shouldUnsetOptionalSaleText(body.transfer_alias)) {
        unsetFields.transfer_alias = "";
      } else {
        const transferAlias = parseOptionalSaleText(body.transfer_alias);
        if (transferAlias) updateFields.transfer_alias = transferAlias;
      }
    }

    if ("description" in body) {
      if (shouldUnsetOptionalSaleText(body.description)) {
        unsetFields.description = "";
      } else {
        const description = parseOptionalSaleText(body.description);
        if (description) updateFields.description = description;
      }
    }

    const hasSellerUpdate =
      body.seller_type != null ||
      body.created_by != null ||
      body.external_seller_id != null ||
      body.external_seller_name != null;

    if (hasSellerUpdate) {
      if (!isAdminRole(auth.role)) {
        return jsonError("No tenés permiso para modificar el vendedor", 403);
      }

      const externalSellers = await getExternalSellersCollection<ExternalSellerDocument>();
      const sellerResult = await resolveSaleSellerForUpdate(auth, externalSellers, {
        seller_type: body.seller_type,
        created_by: body.created_by,
        external_seller_id: body.external_seller_id,
        external_seller_name: body.external_seller_name,
      });

      if ("error" in sellerResult) {
        return jsonError(sellerResult.error, sellerResult.status);
      }

      Object.assign(updateFields, sellerResult.set);
      for (const field of sellerResult.unset) {
        unsetFields[field] = "";
      }
    }

    if (itemInputs) {
      if (itemInputs && itemInputs.length === 0) {
        return jsonError("Agregá al menos un producto", 400);
      }

      const products = await getProductsCollection<ProductDocument>();
      const previousItems = getSaleLineItemsFromDoc(currentSale);

      for (const item of previousItems) {
        if (item.skip_stock_deduction) continue;

        const restored = await adjustProductStock(products, {
          productId: item.product_id,
          size: item.size,
          quantity: item.quantity,
          direction: "restore",
        });

        if (!restored) return jsonError("No se pudo restaurar el stock actual", 409);
      }

      const nextLineItems = [];
      const deductedItems = [];
      let itemProcessingError: { error: string; status: number } | null = null;

      for (const input of itemInputs) {
        const result = await processSaleItem(products, input, {
          deductStock: !input.skip_stock_deduction,
        });
        if ("error" in result) {
          itemProcessingError = result;
          break;
        }

        nextLineItems.push(result.lineItem);
        if (!result.lineItem.skip_stock_deduction) deductedItems.push(result.lineItem);
      }

      if (itemProcessingError) {
        for (const item of deductedItems) {
          await adjustProductStock(products, {
            productId: item.product_id,
            size: item.size,
            quantity: item.quantity,
            direction: "restore",
          });
        }

        for (const item of previousItems) {
          if (item.skip_stock_deduction) continue;

          await adjustProductStock(products, {
            productId: item.product_id,
            size: item.size,
            quantity: item.quantity,
            direction: "deduct",
          });
        }

        return jsonError(itemProcessingError.error, itemProcessingError.status);
      }

      const sellerForReservation: ResolvedSaleSeller = {
        created_by:
          (typeof updateFields.created_by === "string"
            ? updateFields.created_by
            : currentSale.created_by) ?? auth.user_id,
        external_seller_id:
          typeof updateFields.external_seller_id === "string"
            ? updateFields.external_seller_id
            : currentSale.external_seller_id,
        external_seller_name:
          typeof updateFields.external_seller_name === "string"
            ? updateFields.external_seller_name
            : currentSale.external_seller_name,
      };

      await consumeProductReservationsForSale(
        products,
        sellerForReservation,
        nextLineItems.map((item) => ({
          product_id: item.product_id,
          size: item.size,
          quantity: item.quantity,
          skip_stock_deduction: item.skip_stock_deduction,
        }))
      );

      updateFields.items = nextLineItems;
      updateFields.total = nextLineItems.reduce((sum, item) => sum + item.total, 0);
      unsetFields.product_id = "";
      unsetFields.product_name = "";
      unsetFields.product_sku = "";
      unsetFields.size = "";
      unsetFields.quantity = "";
      unsetFields.unit_price = "";
      unsetFields.skip_stock_deduction = "";
    }

    if (
      Object.keys(updateFields).length === 1 &&
      Object.keys(unsetFields).length === 0
    ) {
      return jsonError("No hay cambios para guardar", 400);
    }

    const updateQuery: Record<string, unknown> = { $set: updateFields };
    if (Object.keys(unsetFields).length > 0) {
      updateQuery.$unset = unsetFields;
    }

    const updatedDoc = await sales.findOneAndUpdate({ _id: id }, updateQuery, {
      returnDocument: "after",
    });

    if (!updatedDoc) return jsonError("Venta no encontrada", 404);

    await trackAdminAction({
      auth,
      action: "update",
      resource: "sale",
      resourceId: id,
      resourceLabel: `Venta ${id}`,
    });

    return NextResponse.json({ sale: normalizeSaleForResponse(updatedDoc) });
  } catch {
    return jsonError("Failed to update sale", 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = requireStaff(requireAuth(_request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const { id } = await context.params;
    const sales = await getSalesCollection<SaleDocument>();
    const saleDoc = await sales.findOne({ _id: id });
    if (!saleDoc) return jsonError("Venta no encontrada", 404);

    const denied = assertCanDeleteOwnedResource(auth, saleDoc.created_by);
    if (denied) return denied;

    const lineItems = getSaleLineItemsFromDoc(saleDoc);
    const products = await getProductsCollection<ProductDocument>();
    const restoredProducts = [];
    const restoredProductIds = new Set<string>();

    for (const item of lineItems) {
      if (item.skip_stock_deduction) continue;

      const productDoc = await products.findOne({ _id: item.product_id });
      if (!productDoc) continue;

      const restored = await adjustProductStock(products, {
        productId: item.product_id,
        size: item.size,
        quantity: item.quantity,
        direction: "restore",
      });

      if (!restored) return jsonError("No se pudo restaurar el stock", 409);

      if (!restoredProductIds.has(restored.id)) {
        restoredProductIds.add(restored.id);
        restoredProducts.push(toProductResponse(restored, 2));
      }
    }

    const result = await sales.deleteOne({ _id: id });
    if (result.deletedCount === 0) return jsonError("Venta no encontrada", 404);

    await trackAdminAction({
      auth,
      action: "delete",
      resource: "sale",
      resourceId: id,
      resourceLabel: `Venta ${id}`,
    });

    return NextResponse.json({
      message: "Venta eliminada correctamente",
      ...(restoredProducts.length > 0 ? { products: restoredProducts } : {}),
    });
  } catch {
    return jsonError("Failed to delete sale", 500);
  }
}
