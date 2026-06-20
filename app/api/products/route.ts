import { NextRequest, NextResponse } from "next/server";
import { ensureIndexes, getProductsCollection } from "@/lib/server/db";
import { ProductDocument, productFromDoc } from "@/lib/server/models";
import { jsonError } from "@/lib/server/auth-middleware";
import { ensureProductSlugs, toProductResponse } from "@/lib/server/products";
import { buildProductSizeFilter } from "@/lib/admin-catalog-filters";
import { buildFlexibleSearchRegexPattern } from "@/lib/search-normalization";

export async function GET(request: NextRequest) {
  try {
    await ensureIndexes();

    const { searchParams } = request.nextUrl;
    let page = parseInt(searchParams.get("page") || "1", 10);
    let perPage = parseInt(searchParams.get("per_page") || "10", 10);

    if (Number.isNaN(page) || page < 1) page = 1;
    if (Number.isNaN(perPage) || perPage < 1) perPage = 10;
    if (perPage > 50) perPage = 50;

    const filter: Record<string, unknown> = { is_active: true };

    const team = searchParams.get("team");
    const league = searchParams.get("league");
    const size = searchParams.get("size");

    if (team) filter.team = { $regex: buildFlexibleSearchRegexPattern(team), $options: "i" };
    if (league) filter.league = league;
    if (size) Object.assign(filter, buildProductSizeFilter(size));

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
