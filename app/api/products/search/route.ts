import { NextRequest, NextResponse } from "next/server";
import { ensureIndexes, getProductsCollection } from "@/lib/server/db";
import { ProductDocument, productFromDoc } from "@/lib/server/models";
import { jsonError } from "@/lib/server/auth-middleware";
import { toProductResponse } from "@/lib/server/products";
import {
  buildAdminSearchTextMatch,
  buildProductSizeFilter,
} from "@/lib/admin-catalog-filters";

export async function GET(request: NextRequest) {
  try {
    await ensureIndexes();

    const q = request.nextUrl.searchParams.get("q")?.trim();
    if (!q) {
      return jsonError("Search query parameter 'q' is required", 400);
    }

    const { searchParams } = request.nextUrl;
    let page = parseInt(searchParams.get("page") || "1", 10);
    let perPage = parseInt(searchParams.get("per_page") || "10", 10);

    if (Number.isNaN(page) || page < 1) page = 1;
    if (Number.isNaN(perPage) || perPage < 1) perPage = 10;
    if (perPage > 50) perPage = 50;

    const textMatch = buildAdminSearchTextMatch(q);

    const league = searchParams.get("league");
    const size = searchParams.get("size");

    const activeProductFilter = {
      is_active: true,
      deleted_at: { $exists: false },
    };
    const searchFilter: Record<string, unknown> = { ...activeProductFilter, ...textMatch };

    if (league || size) {
      const andFilters: Record<string, unknown>[] = [textMatch, activeProductFilter];
      if (league) andFilters.push({ league });
      if (size) andFilters.push(buildProductSizeFilter(size));
      delete searchFilter.$or;
      searchFilter.$and = andFilters;
    }

    const collection = await getProductsCollection<ProductDocument>();
    const total = await collection.countDocuments(searchFilter);
    const skip = (page - 1) * perPage;

    const docs = await collection
      .find(searchFilter)
      .sort({ created_at: -1, _id: -1 })
      .skip(skip)
      .limit(perPage)
      .toArray();

    const products = docs.map(productFromDoc);
    const totalPages = Math.ceil(total / perPage);

    return NextResponse.json({
      query: q,
      page,
      per_page: perPage,
      total,
      total_pages: totalPages,
      results: products.map((p) => toProductResponse(p, 2)),
    });
  } catch {
    return jsonError("Failed to search products", 500);
  }
}
