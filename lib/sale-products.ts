import type { Product } from "@/lib/api";

export function isProductAvailableForSale(product: Product): boolean {
  return !product.deleted_at;
}

export function filterProductsForSalePicker(products: Product[]): Product[] {
  return products.filter(isProductAvailableForSale);
}
