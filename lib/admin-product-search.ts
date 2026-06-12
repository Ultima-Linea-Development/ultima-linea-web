import type { Product } from "@/lib/api";

export function filterProductsByQuery(products: Product[], query: string, limit = 8): Product[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [];

  const matches = products.filter((product) => {
    const values = [product.name, product.team, product.league, product.season, product.category];
    return values.some((value) => value?.toLocaleLowerCase().includes(normalized));
  });

  return matches.slice(0, limit);
}
