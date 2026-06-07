import { NextRequest, NextResponse } from "next/server";
import { ensureIndexes, getProductsCollection } from "@/lib/server/db";
import {
  generateSKUBase,
  generateSlug,
  ProductDocument,
  productFromDoc,
} from "@/lib/server/models";
import {
  isNextResponse,
  jsonError,
  requireAdmin,
  requireAuth,
} from "@/lib/server/auth-middleware";
import { deleteProductImages } from "@/lib/server/storage";
import { getNextSKUVariant, sumStockBySizes } from "@/lib/server/products";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = requireAdmin(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const { id } = await context.params;
    const updates = await request.json();
    const collection = await getProductsCollection<ProductDocument>();

    const currentDoc = await collection.findOne({ _id: id });
    if (!currentDoc) {
      return jsonError("Product not found", 404);
    }

    const currentProduct = productFromDoc(currentDoc);
    const setFields: Record<string, unknown> = { updated_at: new Date() };

    let team = currentProduct.team;
    let productType = currentProduct.type;
    let needsSKUUpdate = false;

    if (updates.name) {
      setFields.name = updates.name;
      setFields.slug = generateSlug(updates.name);
    }
    if (updates.description) setFields.description = updates.description;
    if (updates.team) {
      setFields.team = updates.team;
      team = updates.team;
      needsSKUUpdate = true;
    }
    if (updates.league) setFields.league = updates.league;
    if (updates.season) setFields.season = updates.season;
    if (updates.type) {
      setFields.type = updates.type;
      productType = updates.type;
      needsSKUUpdate = true;
    }
    if (updates.price > 0) setFields.price = updates.price;

    if (updates.stock_by_sizes && Object.keys(updates.stock_by_sizes).length > 0) {
      setFields.stock_by_sizes = updates.stock_by_sizes;
      setFields.stock = sumStockBySizes(updates.stock_by_sizes);
    } else if (updates.stock >= 0) {
      setFields.stock = updates.stock;
    }

    if (updates.sizes?.length > 0) setFields.sizes = updates.sizes;
    if (updates.size) setFields.size = updates.size;
    if (updates.image_urls?.length > 0) setFields.image_urls = updates.image_urls;
    if (updates.category) setFields.category = updates.category;
    if (updates.is_active !== undefined) setFields.is_active = updates.is_active;

    if (needsSKUUpdate) {
      const skuBase = generateSKUBase(team, productType);
      const variant = await getNextSKUVariant(collection, skuBase);
      setFields.sku = `${skuBase}-${variant}`;
    }

    const result = await collection.updateOne({ _id: id }, { $set: setFields });
    if (result.matchedCount === 0) {
      return jsonError("Product not found", 404);
    }

    const updatedDoc = await collection.findOne({ _id: id });
    if (!updatedDoc) {
      return jsonError("Failed to fetch updated product", 500);
    }

    return NextResponse.json(productFromDoc(updatedDoc));
  } catch {
    return jsonError("Failed to update product", 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = requireAdmin(requireAuth(_request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const { id } = await context.params;
    const collection = await getProductsCollection<ProductDocument>();

    const doc = await collection.findOne({ _id: id });
    if (!doc) {
      return jsonError("Product not found", 404);
    }

    const product = productFromDoc(doc);
    await deleteProductImages(product.image_urls);

    const result = await collection.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return jsonError("Product not found", 404);
    }

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch {
    return jsonError("Failed to delete product", 500);
  }
}
