import { NextRequest, NextResponse } from "next/server";
import { ensureIndexes, getProductsCollection } from "@/lib/server/db";
import {
  generateSKUBase,
  normalizeProductUpdates,
  ProductDocument,
  productFromDoc,
} from "@/lib/server/models";
import {
  isNextResponse,
  jsonError,
  assertCanDeleteOwnedResource,
  requireStaff,
  requireAuth,
} from "@/lib/server/auth-middleware";
import {
  findProductByIdOrSlugOrSku,
  getNextSKUVariant,
  sumStockBySizes,
  toProductResponse,
} from "@/lib/server/products";
import { trackAdminAction } from "@/lib/server/admin-history";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = requireStaff(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const { id } = await context.params;
    const collection = await getProductsCollection<ProductDocument>();
    const product = await findProductByIdOrSlugOrSku(collection, id, false);

    if (!product) {
      return jsonError("Product not found", 404);
    }

    return NextResponse.json(toProductResponse(product, product.image_urls.length));
  } catch {
    return jsonError("Failed to fetch product", 500);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = requireStaff(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const { id } = await context.params;
    const updates = await request.json();
    const collection = await getProductsCollection<ProductDocument>();

    const currentDoc = await collection.findOne({
      _id: id,
      deleted_at: { $exists: false },
    });
    if (!currentDoc) {
      return jsonError("Product not found", 404);
    }

    const currentProduct = productFromDoc(currentDoc);
    const setFields: Record<string, unknown> = { updated_at: new Date() };

    let team = currentProduct.team;
    let productType = currentProduct.type;
    let needsSKUUpdate = false;

    if (updates.description) setFields.description = updates.description;
    if ("team" in updates) {
      const nextTeam = String(updates.team ?? "").trim();
      setFields.team = nextTeam;
      team = nextTeam;
      needsSKUUpdate = true;
    }
    if ("league" in updates) setFields.league = String(updates.league ?? "").trim();
    if ("type" in updates) {
      const nextType = String(updates.type ?? "").trim();
      setFields.type = nextType;
      productType = nextType;
      needsSKUUpdate = true;
    }

    const normalizedFields = normalizeProductUpdates(currentProduct, updates);
    if (normalizedFields.name !== undefined) setFields.name = normalizedFields.name;
    if (normalizedFields.slug !== undefined) setFields.slug = normalizedFields.slug;
    if (normalizedFields.season !== undefined) setFields.season = normalizedFields.season;
    if (normalizedFields.type !== undefined) setFields.type = normalizedFields.type;
    if (updates.price > 0) setFields.price = updates.price;

    if (updates.stock_by_sizes !== undefined) {
      setFields.stock_by_sizes = updates.stock_by_sizes;
      setFields.stock = sumStockBySizes(updates.stock_by_sizes);
    } else if (updates.stock >= 0) {
      setFields.stock = updates.stock;
    }

    if (updates.sizes !== undefined) setFields.sizes = updates.sizes;
    if (updates.size) setFields.size = updates.size;
    if (updates.image_urls?.length > 0) setFields.image_urls = updates.image_urls;
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

    await trackAdminAction({
      auth,
      action: "update",
      resource: "product",
      resourceId: id,
      resourceLabel: productFromDoc(updatedDoc).name,
    });

    return NextResponse.json(productFromDoc(updatedDoc));
  } catch {
    return jsonError("Failed to update product", 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = requireStaff(requireAuth(_request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const { id } = await context.params;
    const collection = await getProductsCollection<ProductDocument>();

    const doc = await collection.findOne({
      _id: id,
      deleted_at: { $exists: false },
    });
    if (!doc) {
      return jsonError("Product not found", 404);
    }

    const denied = assertCanDeleteOwnedResource(auth, doc.created_by);
    if (denied) return denied;

    const product = productFromDoc(doc);
    const result = await collection.updateOne(
      { _id: id, deleted_at: { $exists: false } },
      {
        $set: {
          deleted_restore_is_active: doc.is_active,
          deleted_at: new Date(),
          updated_at: new Date(),
        },
      }
    );
    if (result.matchedCount === 0) {
      return jsonError("Product not found", 404);
    }

    await trackAdminAction({
      auth,
      action: "delete",
      resource: "product",
      resourceId: id,
      resourceLabel: product.name,
    });

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch {
    return jsonError("Failed to delete product", 500);
  }
}
