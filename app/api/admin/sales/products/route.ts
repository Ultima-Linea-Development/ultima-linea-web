import { NextRequest, NextResponse } from "next/server";
import { ensureIndexes, getProductsCollection } from "@/lib/server/db";
import { ProductDocument, productFromDoc } from "@/lib/server/models";
import {
  isNextResponse,
  jsonError,
  requireAdmin,
  requireAuth,
} from "@/lib/server/auth-middleware";
import { toProductResponse } from "@/lib/server/products";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const collection = await getProductsCollection<ProductDocument>();
    const docs = await collection
      .find({ is_active: true })
      .sort({ created_at: -1, _id: -1 })
      .toArray();

    return NextResponse.json({
      products: docs.map((doc) => toProductResponse(productFromDoc(doc), 2)),
    });
  } catch {
    return jsonError("Failed to fetch products", 500);
  }
}
