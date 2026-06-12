import { NextResponse } from "next/server";
import { ensureIndexes, getProductsCollection } from "@/lib/server/db";
import type { ProductDocument } from "@/lib/server/models";
import { jsonError } from "@/lib/server/auth-middleware";

function normalizeOptions(values: unknown[]): string[] {
  const seen = new Set<string>();

  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLocaleLowerCase();
      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    })
    .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}

export async function GET() {
  try {
    await ensureIndexes();

    const collection = await getProductsCollection<ProductDocument>();
    const [teams, leagues, sizes] = await Promise.all([
      collection.distinct("team", { is_active: true }),
      collection.distinct("league", { is_active: true }),
      collection.distinct("sizes", { is_active: true }),
    ]);

    return NextResponse.json({
      teams: normalizeOptions(teams),
      leagues: normalizeOptions(leagues),
      sizes: normalizeOptions(sizes),
    });
  } catch {
    return jsonError("Failed to fetch product options", 500);
  }
}
