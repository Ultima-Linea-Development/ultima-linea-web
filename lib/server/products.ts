import { Collection } from "mongodb";
import {
  Product,
  ProductDocument,
  generateSlug,
  generateSKUBase,
  productFromDoc,
} from "./models";

export type ProductResponse = {
  id: string;
  sku: string;
  slug?: string;
  name: string;
  description: string;
  team: string;
  league: string;
  season: string;
  type: string;
  price: number;
  stock: number;
  size: string;
  sizes: string[];
  stock_by_sizes: Record<string, number>;
  image_urls: string[];
  category: string;
  is_active: boolean;
};

export function toProductResponse(product: Product, maxImages: number): ProductResponse {
  const images =
    product.image_urls.length > maxImages
      ? product.image_urls.slice(0, maxImages)
      : product.image_urls;

  return {
    id: product.id,
    sku: product.sku,
    slug: product.slug,
    name: product.name,
    description: product.description,
    team: product.team,
    league: product.league,
    season: product.season,
    type: product.type,
    price: product.price,
    stock: product.stock,
    size: product.size,
    sizes: product.sizes,
    stock_by_sizes: product.stock_by_sizes,
    image_urls: images,
    category: product.category,
    is_active: product.is_active,
  };
}

const ULID_CHARS = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function isValidULID(value: string): boolean {
  if (value.length !== 26) return false;
  const upper = value.toUpperCase();
  return [...upper].every((char) => ULID_CHARS.includes(char));
}

export function extractULIDFromSlug(slug: string): { slugPart: string; ulid: string } {
  if (slug.length < 27) return { slugPart: slug, ulid: "" };

  const lastDash = slug.lastIndexOf("-");
  if (lastDash === -1) return { slugPart: slug, ulid: "" };

  const potentialULID = slug.slice(lastDash + 1);
  if (potentialULID.length === 26 && isValidULID(potentialULID)) {
    return { slugPart: slug.slice(0, lastDash), ulid: potentialULID };
  }

  return { slugPart: slug, ulid: "" };
}

export async function getNextSKUVariant(
  collection: Collection<ProductDocument>,
  skuBase: string
): Promise<string> {
  const escaped = skuBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const cursor = collection.find(
    { sku: { $regex: `^${escaped}-VAR` } },
    { projection: { sku: 1 } }
  );

  let maxVariant = 0;
  for await (const doc of cursor) {
    const parts = doc.sku.split("-");
    const lastPart = parts[parts.length - 1];
    if (lastPart.startsWith("VAR")) {
      const num = parseInt(lastPart.slice(3), 10);
      if (!Number.isNaN(num) && num > maxVariant) {
        maxVariant = num;
      }
    }
  }

  return `VAR${maxVariant + 1}`;
}

export async function ensureProductSlugs(
  collection: Collection<ProductDocument>,
  products: Product[]
): Promise<void> {
  for (const product of products) {
    if (!product.slug && product.name) {
      const slug = generateSlug(product.name);
      product.slug = slug;
      collection
        .updateOne({ _id: product.id }, { $set: { slug } })
        .catch(() => undefined);
    }
  }
}

export function getCanonicalSlug(product: Product): string {
  if (product.slug) return product.slug;
  if (product.name) return generateSlug(product.name);
  return "";
}

export function sumStockBySizes(stockBySizes: Record<string, number>): number {
  return Object.values(stockBySizes).reduce((sum, value) => sum + value, 0);
}

export async function findProductByIdOrSlugOrSku(
  collection: Collection<ProductDocument>,
  param: string,
  activeOnly = true
): Promise<Product | null> {
  const filter: Record<string, unknown> = {
    $or: [{ _id: param }, { sku: param }, { slug: param }],
  };
  if (activeOnly) filter.is_active = true;

  const doc = await collection.findOne(filter);
  return doc ? productFromDoc(doc) : null;
}
