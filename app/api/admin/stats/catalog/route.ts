import { NextRequest, NextResponse } from "next/server";
import { ensureIndexes, getProductsCollection } from "@/lib/server/db";
import { getAdminCatalogStats } from "@/lib/server/admin-catalog-stats";
import type { ProductDocument } from "@/lib/server/models";
import {
  isNextResponse,
  jsonError,
  requireStaff,
  requireAuth,
} from "@/lib/server/auth-middleware";

export async function GET(request: NextRequest) {
  const auth = requireStaff(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const collection = await getProductsCollection<ProductDocument>();
    const stats = await getAdminCatalogStats(collection);

    return NextResponse.json(stats);
  } catch {
    return jsonError("Failed to fetch catalog stats", 500);
  }
}
