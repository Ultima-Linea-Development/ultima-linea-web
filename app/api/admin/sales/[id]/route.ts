import { NextRequest, NextResponse } from "next/server";
import { ensureIndexes, getProductsCollection, getSalesCollection } from "@/lib/server/db";
import { ProductDocument, SaleDocument, saleFromDoc } from "@/lib/server/models";
import {
  isNextResponse,
  jsonError,
  requireAdmin,
  requireAuth,
} from "@/lib/server/auth-middleware";
import { toProductResponse } from "@/lib/server/products";
import { adjustProductStock } from "@/lib/server/sales";
import { parseSaleDateInput } from "@/lib/sale-date";

type RouteContext = { params: Promise<{ id: string }> };

type UpdateSaleBody = {
  sale_date?: string;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = requireAdmin(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const { id } = await context.params;
    const body = (await request.json()) as UpdateSaleBody;
    const saleDateInput = body.sale_date?.trim();
    if (!saleDateInput) return jsonError("Fecha requerida", 400);

    const parsedSaleDate = parseSaleDateInput(saleDateInput);
    if (!parsedSaleDate) return jsonError("Fecha inválida", 400);

    const sales = await getSalesCollection<SaleDocument>();
    const updatedDoc = await sales.findOneAndUpdate(
      { _id: id },
      { $set: { created_at: parsedSaleDate, updated_at: new Date() } },
      { returnDocument: "after" }
    );

    if (!updatedDoc) return jsonError("Venta no encontrada", 404);

    return NextResponse.json({ sale: saleFromDoc(updatedDoc) });
  } catch {
    return jsonError("Failed to update sale", 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = requireAdmin(requireAuth(_request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const { id } = await context.params;
    const sales = await getSalesCollection<SaleDocument>();
    const saleDoc = await sales.findOne({ _id: id });
    if (!saleDoc) return jsonError("Venta no encontrada", 404);

    const sale = saleFromDoc(saleDoc);
    const products = await getProductsCollection<ProductDocument>();
    const productDoc = await products.findOne({ _id: sale.product_id });

    let restoredProduct = null;
    if (productDoc) {
      const restored = await adjustProductStock(products, {
        productId: sale.product_id,
        size: sale.size,
        quantity: sale.quantity,
        direction: "restore",
      });

      if (!restored) return jsonError("No se pudo restaurar el stock", 409);
      restoredProduct = toProductResponse(restored, 2);
    }

    const result = await sales.deleteOne({ _id: id });
    if (result.deletedCount === 0) return jsonError("Venta no encontrada", 404);

    return NextResponse.json({
      message: "Venta eliminada correctamente",
      ...(restoredProduct ? { product: restoredProduct } : {}),
    });
  } catch {
    return jsonError("Failed to delete sale", 500);
  }
}
