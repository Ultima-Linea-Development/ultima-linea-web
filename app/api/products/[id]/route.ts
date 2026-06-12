import { NextRequest, NextResponse } from "next/server";
import { ensureIndexes, getProductsCollection } from "@/lib/server/db";
import { ProductDocument } from "@/lib/server/models";
import { jsonError } from "@/lib/server/auth-middleware";
import { findProductByIdOrSlugOrSku, toProductResponse } from "@/lib/server/products";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await ensureIndexes();

    const { id } = await context.params;
    const collection = await getProductsCollection<ProductDocument>();
    const product = await findProductByIdOrSlugOrSku(collection, id, true);

    if (!product) {
      return jsonError("Product not found", 404);
    }

    return NextResponse.json(toProductResponse(product, product.image_urls.length));
  } catch {
    return jsonError("Failed to fetch product", 500);
  }
}
