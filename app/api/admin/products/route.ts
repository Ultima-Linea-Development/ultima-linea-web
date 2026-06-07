import { NextRequest, NextResponse } from "next/server";
import { ensureIndexes, getProductsCollection } from "@/lib/server/db";
import {
  beforeCreateProduct,
  ProductDocument,
  productToDoc,
} from "@/lib/server/models";
import {
  isNextResponse,
  jsonError,
  requireAdmin,
  requireAuth,
} from "@/lib/server/auth-middleware";
import { getNextSKUVariant, sumStockBySizes } from "@/lib/server/products";

export async function POST(request: NextRequest) {
  const auth = requireAdmin(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const body = await request.json();
    let product = beforeCreateProduct(body);

    const collection = await getProductsCollection<ProductDocument>();
    const variant = await getNextSKUVariant(collection, product.sku);
    product = { ...product, sku: `${product.sku}-${variant}` };

    if (Object.keys(product.stock_by_sizes).length > 0) {
      product.stock = sumStockBySizes(product.stock_by_sizes);
    }

    await collection.insertOne(productToDoc(product));
    return NextResponse.json(product, { status: 201 });
  } catch {
    return jsonError("Failed to create product", 500);
  }
}
