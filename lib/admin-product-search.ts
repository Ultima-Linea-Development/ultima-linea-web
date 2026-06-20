import type { Product } from "@/lib/api";
import { matchesNormalizedSearch } from "@/lib/search-normalization";

export function filterProductsByQuery(products: Product[], query: string, limit = 8): Product[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const matches = products.filter((product) => {
    const values = [product.name, product.team, product.league, product.season];
    return matchesNormalizedSearch(values, trimmed);
  });

  return matches.slice(0, limit);
}
