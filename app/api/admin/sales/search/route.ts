import { NextRequest, NextResponse } from "next/server";
import { ensureIndexes, getSalesCollection } from "@/lib/server/db";
import { SaleDocument } from "@/lib/server/models";
import { normalizeSaleForResponse } from "@/lib/server/sale-items";
import {
  isNextResponse,
  jsonError,
  requireStaff,
  requireAuth,
} from "@/lib/server/auth-middleware";
import { buildAdminSalesSearchTextMatch } from "@/lib/admin-sales-search";
import { findStaffUserIdsMatchingQuery } from "@/lib/server/staff-user-search";

const MAX_SEARCH_RESULTS = 500;

export async function GET(request: NextRequest) {
  const auth = requireStaff(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const q = request.nextUrl.searchParams.get("q")?.trim();
    if (!q) {
      return jsonError("Search query parameter 'q' is required", 400);
    }

    const collection = await getSalesCollection<SaleDocument>();
    const sellerUserIds = await findStaffUserIdsMatchingQuery(q);
    const searchFilter = buildAdminSalesSearchTextMatch(q, sellerUserIds);
    const total = await collection.countDocuments(searchFilter);
    const docs = await collection
      .find(searchFilter)
      .sort({ created_at: -1, _id: -1 })
      .limit(MAX_SEARCH_RESULTS)
      .toArray();

    return NextResponse.json({
      query: q,
      total,
      results: docs.map(normalizeSaleForResponse),
    });
  } catch {
    return jsonError("Failed to search sales", 500);
  }
}
