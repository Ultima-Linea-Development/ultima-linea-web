import { NextRequest, NextResponse } from "next/server";
import { ensureIndexes, getProductsCollection } from "@/lib/server/db";
import { ProductDocument, productFromDoc } from "@/lib/server/models";
import { jsonError } from "@/lib/server/auth-middleware";
import { toProductResponse } from "@/lib/server/products";

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

    const searchFilter: Record<string, unknown> = {
      is_active: true,
      $or: [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { team: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
        { league: { $regex: q, $options: "i" } },
        { season: { $regex: q, $options: "i" } },
      ],
    };

    const category = searchParams.get("category");
    const league = searchParams.get("league");
    const size = searchParams.get("size");

    if (category) searchFilter.category = category;
    if (league) searchFilter.league = league;
    if (size) searchFilter.sizes = { $in: [size] };

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
