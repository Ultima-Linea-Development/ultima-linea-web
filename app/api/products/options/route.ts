import { NextResponse } from "next/server";
import { ensureIndexes, getProductsCollection } from "@/lib/server/db";
import type { ProductDocument } from "@/lib/server/models";
import { jsonError } from "@/lib/server/auth-middleware";
import { compareSizeLabels } from "@/lib/product-inventory";
import {
  DEFAULT_KIT_TYPE_OPTIONS,
  DEFAULT_PRODUCT_TYPE_OPTIONS,
  extractKitTypeFromName,
  extractProductTypeFromName,
} from "@/lib/product-name";

function normalizeOptions(
  values: unknown[],
  compare: (a: string, b: string) => number = (a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" })
): string[] {
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
    .sort(compare);
}

export async function GET() {
  try {
    await ensureIndexes();

    const collection = await getProductsCollection<ProductDocument>();
    const activeProductFilter = {
      is_active: true,
      deleted_at: { $exists: false },
    };
    const [teams, leagues, sizes, products] = await Promise.all([
      collection.distinct("team", activeProductFilter),
      collection.distinct("league", activeProductFilter),
      collection.distinct("sizes", activeProductFilter),
      collection
        .find(
          activeProductFilter,
          { projection: { name: 1, season: 1 } }
        )
        .toArray(),
    ]);

    return NextResponse.json({
      teams: normalizeOptions(teams),
      leagues: normalizeOptions(leagues),
      sizes: normalizeOptions(sizes, compareSizeLabels),
      seasons: normalizeOptions(products.map((product) => product.season)),
      productTypes: normalizeOptions([
        ...DEFAULT_PRODUCT_TYPE_OPTIONS,
        ...products.map((product) => extractProductTypeFromName(product.name)),
      ]),
      kitTypes: normalizeOptions([
        ...DEFAULT_KIT_TYPE_OPTIONS,
        ...products.map((product) => extractKitTypeFromName(product.name)),
      ]),
    });
  } catch {
    return jsonError("Failed to fetch product options", 500);
  }
}
