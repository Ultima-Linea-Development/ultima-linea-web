import { NextRequest, NextResponse } from "next/server";
import { ensureIndexes, getProductsCollection } from "@/lib/server/db";
import { ProductDocument, productFromDoc } from "@/lib/server/models";
import {
  isNextResponse,
  jsonError,
  requireAdmin,
  requireAuth,
} from "@/lib/server/auth-middleware";
import { trackAdminAction } from "@/lib/server/admin-history";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = requireAdmin(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const { id } = await context.params;
    const collection = await getProductsCollection<ProductDocument>();
    const deletedDoc = await collection.findOne({ _id: id, deleted_at: { $exists: true } });
    if (!deletedDoc) {
      return jsonError("Producto eliminado no encontrado", 404);
    }

    const restoreIsActive =
      typeof deletedDoc.deleted_restore_is_active === "boolean"
        ? deletedDoc.deleted_restore_is_active
        : true;
    const restoredDoc = await collection.findOneAndUpdate(
      { _id: id, deleted_at: { $exists: true } },
      {
        $set: {
          is_active: restoreIsActive,
          updated_at: new Date(),
        },
        $unset: { deleted_at: "", deleted_restore_is_active: "" },
      },
      { returnDocument: "after" }
    );

    if (!restoredDoc) {
      return jsonError("Producto eliminado no encontrado", 404);
    }

    const product = productFromDoc(restoredDoc);
    await trackAdminAction({
      auth,
      action: "restore",
      resource: "product",
      resourceId: product.id,
      resourceLabel: product.name,
    });

    return NextResponse.json(product);
  } catch {
    return jsonError("Failed to restore product", 500);
  }
}
