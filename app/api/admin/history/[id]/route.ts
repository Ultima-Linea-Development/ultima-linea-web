import { NextRequest, NextResponse } from "next/server";
import { ensureIndexes, getAdminHistoryCollection } from "@/lib/server/db";
import type { AdminHistoryEntryDocument } from "@/lib/server/models";
import {
  isNextResponse,
  jsonError,
  requireAdmin,
  requireAuth,
} from "@/lib/server/auth-middleware";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = requireAdmin(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const { id } = await context.params;
    const collection = await getAdminHistoryCollection<AdminHistoryEntryDocument>();
    const result = await collection.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return jsonError("Ítem de historial no encontrado", 404);
    }

    return NextResponse.json({ message: "Ítem de historial eliminado" });
  } catch {
    return jsonError("Failed to delete admin history item", 500);
  }
}
