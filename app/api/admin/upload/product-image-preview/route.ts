import { NextRequest, NextResponse } from "next/server";
import {
  isNextResponse,
  jsonError,
  requireStaff,
  requireAuth,
} from "@/lib/server/auth-middleware";
import { isAllowedProductImageFile } from "@/lib/product-image-upload";
import { createProductImagePreviewBuffer } from "@/lib/server/product-image-preview";

export async function POST(request: NextRequest) {
  const auth = requireStaff(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    const formData = await request.formData();
    const file = formData.get("image") ?? formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("no se envió archivo (use la key 'image' o 'file')", 400);
    }

    if (!isAllowedProductImageFile(file)) {
      return jsonError("formato de imagen no permitido", 400);
    }

    const input = Buffer.from(await file.arrayBuffer());
    const preview = await createProductImagePreviewBuffer(input);

    return new NextResponse(new Uint8Array(preview), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al generar vista previa";
    return jsonError(message, 400);
  }
}
