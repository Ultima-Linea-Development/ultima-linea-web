import { NextRequest, NextResponse } from "next/server";
import { ensureIndexes, getCommissionsCollection } from "@/lib/server/db";
import { CommissionDocument } from "@/lib/server/models";
import {
  isNextResponse,
  jsonError,
  requireStaff,
  requireAuth,
} from "@/lib/server/auth-middleware";
import { buildAdminCommissionsSearchTextMatch } from "@/lib/admin-commissions-search";
import { normalizeCommissionForResponse } from "@/lib/server/commissions";
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

    const collection = await getCommissionsCollection<CommissionDocument>();
    const sellerUserIds = await findStaffUserIdsMatchingQuery(q);
    const searchFilter = buildAdminCommissionsSearchTextMatch(q, sellerUserIds);
    const total = await collection.countDocuments(searchFilter);
    const docs = await collection
      .find(searchFilter)
      .sort({ created_at: -1, _id: -1 })
      .limit(MAX_SEARCH_RESULTS)
      .toArray();

    return NextResponse.json({
      query: q,
      total,
      results: docs.map(normalizeCommissionForResponse),
    });
  } catch {
    return jsonError("Failed to search commissions", 500);
  }
}
