import { NextRequest, NextResponse } from "next/server";
import { ensureIndexes } from "@/lib/server/db";
import { getAdminStats } from "@/lib/server/admin-stats";
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
    const stats = await getAdminStats();
    return NextResponse.json(stats);
  } catch {
    return jsonError("Failed to fetch admin stats", 500);
  }
}
