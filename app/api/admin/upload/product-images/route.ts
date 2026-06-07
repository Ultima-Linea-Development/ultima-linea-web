import { NextRequest, NextResponse } from "next/server";
import {
  isNextResponse,
  jsonError,
  requireAdmin,
  requireAuth,
} from "@/lib/server/auth-middleware";
import { saveProductImages } from "@/lib/server/storage";

export async function POST(request: NextRequest) {
  const auth = requireAdmin(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    const formData = await request.formData();
    const teamSlug = formData.get("team_slug")?.toString() || "";
    const productSlug = formData.get("product_slug")?.toString() || "";

    if (!teamSlug || !productSlug) {
      return jsonError("team_slug y product_slug son obligatorios", 400);
    }

    const files = [
      ...formData.getAll("images"),
      ...formData.getAll("files"),
    ].filter((entry): entry is File => entry instanceof File);

    if (files.length === 0) {
      return jsonError("no se enviaron archivos (use la key 'images' o 'files')", 400);
    }

    const urls = await saveProductImages(teamSlug, productSlug, files);
    return NextResponse.json({ urls });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al subir imágenes";
    return jsonError(message, 400);
  }
}
