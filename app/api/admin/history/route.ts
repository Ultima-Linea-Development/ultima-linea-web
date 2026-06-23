import { NextRequest, NextResponse } from "next/server";
import { ensureIndexes, getAdminHistoryCollection } from "@/lib/server/db";
import type { AdminHistoryEntryDocument } from "@/lib/server/models";
import {
  isNextResponse,
  jsonError,
  requireAuth,
  requireStaff,
} from "@/lib/server/auth-middleware";
import { mapAdminHistoryEntry } from "@/lib/server/admin-history";

export async function GET(request: NextRequest) {
  const auth = requireStaff(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const { searchParams } = request.nextUrl;
    let page = parseInt(searchParams.get("page") || "1", 10);
    let perPage = parseInt(searchParams.get("per_page") || "20", 10);

    if (Number.isNaN(page) || page < 1) page = 1;
    if (Number.isNaN(perPage) || perPage < 1) perPage = 20;
    if (perPage > 100) perPage = 100;

    const collection = await getAdminHistoryCollection<AdminHistoryEntryDocument>();
    const total = await collection.countDocuments({});
    const skip = (page - 1) * perPage;
    const docs = await collection
      .find({})
      .sort({ created_at: -1, _id: -1 })
      .skip(skip)
      .limit(perPage)
      .toArray();

    return NextResponse.json({
      history: docs.map(mapAdminHistoryEntry),
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage),
    });
  } catch {
    return jsonError("Failed to fetch admin history", 500);
  }
}
