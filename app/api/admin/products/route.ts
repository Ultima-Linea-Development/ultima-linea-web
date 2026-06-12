import { NextRequest, NextResponse } from "next/server";
import { ensureIndexes, getProductsCollection } from "@/lib/server/db";
import {
  beforeCreateProduct,
  ProductDocument,
  productFromDoc,
  productToDoc,
} from "@/lib/server/models";
import {
  isNextResponse,
  jsonError,
  requireAdmin,
  requireAuth,
} from "@/lib/server/auth-middleware";
import {
  ensureProductSlugs,
  getNextSKUVariant,
  sumStockBySizes,
  toProductResponse,
} from "@/lib/server/products";
import { buildAdminCatalogMongoFilter } from "@/lib/admin-catalog-filters";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const { searchParams } = request.nextUrl;
    let page = parseInt(searchParams.get("page") || "1", 10);
    let perPage = parseInt(searchParams.get("per_page") || "10", 10);

    if (Number.isNaN(page) || page < 1) page = 1;
    if (Number.isNaN(perPage) || perPage < 1) perPage = 10;
    if (perPage > 50) perPage = 50;

    const filter = buildAdminCatalogMongoFilter(searchParams);
    const collection = await getProductsCollection<ProductDocument>();
    const total = await collection.countDocuments(filter);
    const skip = (page - 1) * perPage;

    const docs = await collection
      .find(filter)
      .sort({ created_at: -1, _id: -1 })
      .skip(skip)
      .limit(perPage)
      .toArray();

    const products = docs.map(productFromDoc);
    await ensureProductSlugs(collection, products);

    const totalPages = Math.ceil(total / perPage);

    return NextResponse.json({
      products: products.map((p) => toProductResponse(p, 2)),
      page,
      per_page: perPage,
      total,
      total_pages: totalPages,
    });
  } catch {
    return jsonError("Failed to fetch products", 500);
  }
}

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
