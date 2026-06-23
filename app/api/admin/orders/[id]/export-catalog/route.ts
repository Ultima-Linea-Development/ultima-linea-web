import { NextRequest, NextResponse } from "next/server";
import {
  ensureIndexes,
  getProductsCollection,
  getSupplierOrdersCollection,
} from "@/lib/server/db";
import { ProductDocument, SupplierOrderDocument } from "@/lib/server/models";
import {
  isNextResponse,
  jsonError,
  requireAuth,
  requireStaff,
} from "@/lib/server/auth-middleware";
import { normalizeSupplierOrderForResponse } from "@/lib/server/supplier-orders";
import { sumStockBySizes } from "@/lib/server/products";
import { sortSizeLabels } from "@/lib/product-inventory";
import { getSupplierOrderSizeQuantityEntries } from "@/lib/supplier-order-sizes";

type RouteContext = { params: Promise<{ id: string }> };

type ProductStockIncrement = {
  itemCount: number;
  sizes: Map<string, number>;
};

function addSizeQuantity(
  stockBySizes: Record<string, number>,
  size: string,
  quantity: number
) {
  const trimmedSize = size.trim();
  if (!trimmedSize || quantity <= 0) return;

  const existingSize =
    Object.keys(stockBySizes).find(
      (current) => current.toLocaleLowerCase() === trimmedSize.toLocaleLowerCase()
    ) ?? trimmedSize;

  stockBySizes[existingSize] = (stockBySizes[existingSize] ?? 0) + quantity;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = requireStaff(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const { id } = await context.params;
    const orders = await getSupplierOrdersCollection<SupplierOrderDocument>();
    const order = await orders.findOne({ _id: id });

    if (!order) {
      return jsonError("Pedido no encontrado", 404);
    }

    if (order.catalog_exported_at) {
      return jsonError("Este pedido ya fue exportado al catálogo", 400);
    }

    const increments = new Map<string, ProductStockIncrement>();

    for (const item of order.items ?? []) {
      if (!item.product_id) continue;

      const entries = getSupplierOrderSizeQuantityEntries(item);
      if (entries.length === 0) continue;

      const increment = increments.get(item.product_id) ?? {
        itemCount: 0,
        sizes: new Map<string, number>(),
      };

      increment.itemCount += 1;
      for (const [size, quantity] of entries) {
        increment.sizes.set(size, (increment.sizes.get(size) ?? 0) + quantity);
      }

      increments.set(item.product_id, increment);
    }

    if (increments.size === 0) {
      return jsonError("No hay productos del catálogo para exportar stock", 400);
    }

    const products = await getProductsCollection<ProductDocument>();
    const now = new Date();
    let updatedProducts = 0;
    let updatedItems = 0;

    for (const [productId, increment] of increments) {
      const product = await products.findOne({ _id: productId });
      if (!product) continue;

      const stockBySizes = { ...(product.stock_by_sizes ?? {}) };

      if (
        Object.keys(stockBySizes).length === 0 &&
        product.size?.trim() &&
        product.stock > 0
      ) {
        stockBySizes[product.size.trim()] = product.stock;
      }

      for (const [size, quantity] of increment.sizes) {
        addSizeQuantity(stockBySizes, size, quantity);
      }

      const sizes = sortSizeLabels(Object.keys(stockBySizes));
      const sortedStockBySizes: Record<string, number> = {};
      for (const size of sizes) {
        sortedStockBySizes[size] = stockBySizes[size] ?? 0;
      }

      const result = await products.updateOne(
        { _id: productId },
        {
          $set: {
            sizes,
            stock_by_sizes: sortedStockBySizes,
            stock: sumStockBySizes(sortedStockBySizes),
            updated_at: now,
          },
        }
      );

      if (result.modifiedCount > 0 || result.matchedCount > 0) {
        updatedProducts += 1;
        updatedItems += increment.itemCount;
      }
    }

    if (updatedProducts === 0) {
      return jsonError("No se encontraron productos del catálogo para actualizar", 400);
    }

    const updatedOrder = await orders.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          catalog_exported_at: now,
          updated_at: now,
        },
      },
      { returnDocument: "after" }
    );

    return NextResponse.json({
      order: normalizeSupplierOrderForResponse(updatedOrder ?? order),
      updated_products: updatedProducts,
      updated_items: updatedItems,
    });
  } catch {
    return jsonError("Failed to export supplier order to catalog", 500);
  }
}
