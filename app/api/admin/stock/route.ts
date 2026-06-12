import { NextRequest, NextResponse } from "next/server";
import { ensureIndexes, getProductsCollection } from "@/lib/server/db";
import { ProductDocument } from "@/lib/server/models";
import {
  isNextResponse,
  jsonError,
  requireAdmin,
  requireAuth,
} from "@/lib/server/auth-middleware";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const collection = await getProductsCollection<ProductDocument>();
    const activeFilter = { is_active: true };

    const byTypeCursor = collection.aggregate([
      { $match: activeFilter },
      { $group: { _id: "$type", total: { $sum: "$stock" } } },
    ]);

    const byType: Record<string, number> = {};
    for await (const row of byTypeCursor) {
      if (row._id) byType[row._id as string] = row.total as number;
    }

    const bySizeCursor = collection.aggregate([
      { $match: activeFilter },
      { $addFields: { size_stock_array: { $objectToArray: "$stock_by_sizes" } } },
      { $unwind: "$size_stock_array" },
      { $group: { _id: "$size_stock_array.k", total: { $sum: "$size_stock_array.v" } } },
      { $sort: { _id: 1 } },
    ]);

    const bySize: Record<string, number> = {};
    for await (const row of bySizeCursor) {
      if (row._id) bySize[row._id as string] = row.total as number;
    }

    const byTypeAndSizeCursor = collection.aggregate([
      { $match: activeFilter },
      { $addFields: { size_stock_array: { $objectToArray: "$stock_by_sizes" } } },
      { $unwind: "$size_stock_array" },
      {
        $group: {
          _id: { type: "$type", size: "$size_stock_array.k" },
          total: { $sum: "$size_stock_array.v" },
        },
      },
      { $sort: { "_id.type": 1, "_id.size": 1 } },
    ]);

    const byTypeAndSize: Record<string, Record<string, number>> = {};
    for await (const row of byTypeAndSizeCursor) {
      const id = row._id as { type: string; size: string };
      if (!id.type || !id.size) continue;
      if (!byTypeAndSize[id.type]) byTypeAndSize[id.type] = {};
      byTypeAndSize[id.type][id.size] = row.total as number;
    }

    return NextResponse.json({
      by_type: byType,
      by_size: bySize,
      by_type_and_size: byTypeAndSize,
    });
  } catch {
    return jsonError("Failed to aggregate stock by type", 500);
  }
}
