import { monotonicFactory } from "ulid";

const ulid = monotonicFactory();

export type User = {
  id: string;
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
};

export type Product = {
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
  yupoo_album_id?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
};

export type Sale = {
  id: string;
  product_id: string;
  product_name: string;
  product_sku?: string;
  size: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: Date;
  updated_at: Date;
};

export function generateSlug(text: string): string {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split("")
    .map((char) => {
      if (/[a-z0-9]/.test(char)) return char;
      if (char === " " || char === "-") return "-";
      return "";
    })
    .join("")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized;
}

export function generateULID(): string {
  return ulid();
}

function normalizeForSKU(text: string): string {
  return text
    .toUpperCase()
    .replace(/Á/g, "A")
    .replace(/É/g, "E")
    .replace(/Í/g, "I")
    .replace(/Ó/g, "O")
    .replace(/Ú/g, "U")
    .replace(/Ñ/g, "N")
    .replace(/Ü/g, "U")
    .replace(/ /g, "-")
    .replace(/\//g, "-")
    .replace(/\./g, "")
    .split("")
    .filter((char) => /[A-Z0-9-]/.test(char))
    .join("")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateSKUBase(team: string, productType: string): string {
  const teamNorm = normalizeForSKU(team);
  const typeNorm = productType.toUpperCase();
  const parts = [teamNorm];
  if (typeNorm) parts.push(typeNorm);
  return parts.join("-");
}

export function extractTypeFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("retro")) return "RETRO";
  if (lower.includes("player")) return "PLAYER";
  if (lower.includes("fan")) return "FAN";
  return "FAN";
}

export function beforeCreateProduct(product: Partial<Product>): Product {
  const now = new Date();
  const result: Product = {
    id: product.id || generateULID(),
    sku: product.sku || "",
    slug: product.slug,
    name: product.name || "",
    description: product.description || "",
    team: product.team || "",
    league: product.league || "",
    season: product.season || "",
    type: product.type || "",
    price: product.price ?? 0,
    stock: product.stock ?? 0,
    size: product.size || "",
    sizes: product.sizes || [],
    stock_by_sizes: product.stock_by_sizes || {},
    image_urls: product.image_urls || [],
    category: product.category || "club",
    is_active: product.is_active ?? true,
    yupoo_album_id: product.yupoo_album_id,
    created_at: now,
    updated_at: now,
  };

  if (!result.slug && result.name) {
    result.slug = generateSlug(result.name);
  }
  if (!result.type) {
    result.type = extractTypeFromName(result.name);
  }
  if (!result.sku) {
    result.sku = generateSKUBase(result.team, result.type);
  }

  return result;
}

export type UserDocument = Omit<User, "id"> & { _id: string };
export type ProductDocument = Omit<Product, "id"> & { _id: string };
export type SaleDocument = Omit<Sale, "id"> & { _id: string };

export function userFromDoc(doc: UserDocument): User {
  const { _id, password, ...rest } = doc;
  return { id: _id, password, ...rest };
}

export function productFromDoc(doc: ProductDocument): Product {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

export function saleFromDoc(doc: SaleDocument): Sale {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

export function userToDoc(user: User): UserDocument {
  const { id, ...rest } = user;
  return { _id: id, ...rest };
}

export function productToDoc(product: Product): ProductDocument {
  const { id, ...rest } = product;
  return { _id: id, ...rest };
}

export function saleToDoc(sale: Sale): SaleDocument {
  const { id, ...rest } = sale;
  return { _id: id, ...rest };
}
