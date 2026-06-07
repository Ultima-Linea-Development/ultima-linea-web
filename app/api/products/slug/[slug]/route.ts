import { NextRequest, NextResponse } from "next/server";
import { ensureIndexes, getProductsCollection } from "@/lib/server/db";
import { ProductDocument, productFromDoc } from "@/lib/server/models";
import { jsonError } from "@/lib/server/auth-middleware";
import {
  extractULIDFromSlug,
  getCanonicalSlug,
  toProductResponse,
} from "@/lib/server/products";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await ensureIndexes();

    const { slug: slugParam } = await context.params;
    const collection = await getProductsCollection<ProductDocument>();
    const { slugPart, ulid } = extractULIDFromSlug(slugParam);

    if (ulid) {
      const doc = await collection.findOne({ _id: ulid, is_active: true });
      if (!doc) {
        return jsonError("Product not found", 404);
      }

      const product = productFromDoc(doc);
      const canonicalSlug = getCanonicalSlug(product);

      if (slugPart !== canonicalSlug) {
        let canonicalPath = `/api/products/slug/${canonicalSlug}-${product.id}`;
        const queryString = request.nextUrl.searchParams.toString();
        if (queryString) canonicalPath += `?${queryString}`;
        return NextResponse.redirect(new URL(canonicalPath, request.url), 301);
      }

      return NextResponse.json(toProductResponse(product, product.image_urls.length));
    }

    const doc = await collection.findOne({ slug: slugParam, is_active: true });
    if (!doc) {
      return jsonError("Product not found", 404);
    }

    const product = productFromDoc(doc);
    const canonicalSlug = getCanonicalSlug(product);
    let canonicalPath = `/api/products/slug/${canonicalSlug}-${product.id}`;
    const queryString = request.nextUrl.searchParams.toString();
    if (queryString) canonicalPath += `?${queryString}`;

    return NextResponse.redirect(new URL(canonicalPath, request.url), 301);
  } catch {
    return jsonError("Failed to fetch product", 500);
  }
}
