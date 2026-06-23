import { NextRequest, NextResponse } from "next/server";
import { ensureIndexes, getProductsCollection } from "@/lib/server/db";
import { ProductDocument, productFromDoc } from "@/lib/server/models";
import {
  isNextResponse,
  jsonError,
  requireStaff,
  requireAuth,
} from "@/lib/server/auth-middleware";
import { toProductResponse, nonDeletedProductFilter } from "@/lib/server/products";

export async function GET(request: NextRequest) {
  const auth = requireStaff(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const collection = await getProductsCollection<ProductDocument>();
    const docs = await collection
      .find(nonDeletedProductFilter)
      .sort({ created_at: -1, _id: -1 })
      .toArray();

    return NextResponse.json({
      products: docs.map((doc) => toProductResponse(productFromDoc(doc), 2)),
    });
  } catch {
    return jsonError("Failed to fetch products", 500);
  }
}
