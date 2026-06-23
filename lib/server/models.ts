import {
  applyProductNameNormalization,
  inferProductType,
  normalizeSeason,
} from "@/lib/product-name";
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
  must_change_password?: boolean;
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
  is_active: boolean;
  yupoo_album_id?: string;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
};

export type SaleLineItem = {
  product_id: string;
  product_name: string;
  product_sku?: string;
  size: string;
  quantity: number;
  unit_price: number;
  total: number;
  skip_stock_deduction?: boolean;
};

export type ExternalSeller = {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
};

export type SupplierOrderItemType = "FAN" | "PLAYER" | "RETRO";

export type SupplierOrderStatus = "draft" | "sent" | "partial" | "completed" | "cancelled";

export type SupplierOrderLineItem = {
  id: string;
  product_id?: string;
  shirt_name: string;
  product_type?: string;
  kit_type?: string;
  team?: string;
  league?: string;
  season?: string;
  quantity: number;
  type: SupplierOrderItemType;
  sizes: string;
  quantity_by_sizes?: Record<string, number>;
  dorsal?: string;
  description?: string;
  link?: string;
  downloaded: boolean;
  cleaned: boolean;
  price: number;
  ordered: boolean;
};

export type Supplier = {
  id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  link?: string;
  created_at: Date;
  updated_at: Date;
};

export type SupplierOrder = {
  id: string;
  name: string;
  supplier_id?: string;
  supplier_name?: string;
  status: SupplierOrderStatus;
  notes?: string;
  tracking_number?: string;
  tracking_link?: string;
  tax_cost?: number;
  shipping_cost?: number;
  paid_at?: Date;
  sent_at?: Date;
  received_at?: Date;
  items: SupplierOrderLineItem[];
  created_by?: string;
  catalog_exported_at?: Date;
  created_at: Date;
  updated_at: Date;
};

export type CommissionStatus = "pending" | "exported" | "cancelled";

export type CommissionLineItem = Omit<
  SupplierOrderLineItem,
  "downloaded" | "cleaned" | "ordered"
>;

export type Commission = {
  id: string;
  name: string;
  customer_name: string;
  customer_contact?: string;
  seller_user_id?: string;
  external_seller_id?: string;
  external_seller_name?: string;
  status: CommissionStatus;
  supplier_order_id?: string;
  supplier_order_name?: string;
  notes?: string;
  items: CommissionLineItem[];
  created_by?: string;
  created_at: Date;
  updated_at: Date;
};

export type Sale = {
  id: string;
  items?: SaleLineItem[];
  total: number;
  skip_stock_deduction?: boolean;
  created_by?: string;
  external_seller_id?: string;
  external_seller_name?: string;
  transfer_alias?: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
  product_id?: string;
  product_name?: string;
  product_sku?: string;
  size?: string;
  quantity?: number;
  unit_price?: number;
};

export type AdminHistoryAction = "create" | "update" | "delete" | "restore";

export type AdminHistoryResource =
  | "product"
  | "sale"
  | "supplier_order"
  | "commission";

export type AdminHistoryEntry = {
  id: string;
  action: AdminHistoryAction;
  resource: AdminHistoryResource;
  resource_id: string;
  resource_label: string;
  actor_id: string;
  actor_email?: string;
  actor_role?: string;
  created_at: Date;
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
  return "";
}

type ProductNameNormalizationControls = {
  product_type?: string | null;
  kit_type?: string | null;
  preserve_name?: boolean | null;
};

export function beforeCreateProduct(product: Partial<Product> & ProductNameNormalizationControls): Product {
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
    is_active: product.is_active ?? true,
    yupoo_album_id: product.yupoo_album_id,
    created_at: now,
    updated_at: now,
  };

  if (!result.type) {
    result.type = extractTypeFromName(result.name);
  }

  if (result.team && result.season && !product.preserve_name) {
    const normalized = applyProductNameNormalization({
      productType: product.product_type,
      team: result.team,
      season: result.season,
      type: result.type,
      name: result.name,
      kitType: product.kit_type,
    });
    result.name = normalized.name;
    result.slug = normalized.slug;
    result.season = normalized.season;
    result.type = normalized.type;
  } else if (result.team && result.season) {
    result.name = result.name.trim();
    result.slug = generateSlug(result.name);
    result.season = normalizeSeason(result.season);
    result.type = inferProductType({ type: result.type, name: result.name, season: result.season });
  } else if (!result.slug && result.name) {
    result.slug = generateSlug(result.name);
  }

  if (!result.sku) {
    result.sku = generateSKUBase(result.team, result.type);
  }

  return result;
}

export function normalizeProductUpdates(
  current: Pick<Product, "name" | "team" | "season" | "type">,
  updates: Partial<Pick<Product, "name" | "team" | "season" | "type">> & ProductNameNormalizationControls
): Partial<Pick<Product, "name" | "slug" | "season" | "type">> {
  const merged = {
    name: updates.name ?? current.name,
    team: updates.team ?? current.team,
    season: updates.season ?? current.season,
    type: updates.type ?? current.type,
  };

  if (updates.preserve_name) {
    const name = merged.name.trim();
    const season = normalizeSeason(merged.season);
    return {
      name,
      slug: generateSlug(name),
      season,
      type: inferProductType({ type: merged.type, name, season }),
    };
  }

  const normalized = applyProductNameNormalization({
    ...merged,
    productType: updates.product_type,
    kitType: updates.kit_type,
  });
  return {
    name: normalized.name,
    slug: normalized.slug,
    season: normalized.season,
    type: normalized.type,
  };
}

export type UserDocument = Omit<User, "id"> & { _id: string };
export type ProductDocument = Omit<Product, "id"> & {
  _id: string;
  deleted_restore_is_active?: boolean;
};
export type SaleDocument = Omit<Sale, "id"> & { _id: string };
export type ExternalSellerDocument = Omit<ExternalSeller, "id"> & { _id: string };
export type SupplierDocument = Omit<Supplier, "id"> & { _id: string };
export type SupplierOrderDocument = Omit<SupplierOrder, "id"> & { _id: string };
export type CommissionDocument = Omit<Commission, "id"> & { _id: string };
export type AdminHistoryEntryDocument = Omit<AdminHistoryEntry, "id"> & { _id: string };

export function userFromDoc(doc: UserDocument): User {
  const { _id, password, ...rest } = doc;
  return { id: _id, password, ...rest };
}

export function productFromDoc(doc: ProductDocument): Product {
  const { _id, ...rest } = doc;
  const product = { ...rest };
  delete product.deleted_restore_is_active;
  return { id: _id, ...product };
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

export function externalSellerFromDoc(doc: ExternalSellerDocument): ExternalSeller {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

export function externalSellerToDoc(seller: ExternalSeller): ExternalSellerDocument {
  const { id, ...rest } = seller;
  return { _id: id, ...rest };
}

export function supplierFromDoc(doc: SupplierDocument): Supplier {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

export function supplierToDoc(supplier: Supplier): SupplierDocument {
  const { id, ...rest } = supplier;
  return { _id: id, ...rest };
}

export function supplierOrderFromDoc(doc: SupplierOrderDocument): SupplierOrder {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

export function supplierOrderToDoc(order: SupplierOrder): SupplierOrderDocument {
  const { id, ...rest } = order;
  return { _id: id, ...rest };
}

export function commissionFromDoc(doc: CommissionDocument): Commission {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

export function commissionToDoc(commission: Commission): CommissionDocument {
  const { id, ...rest } = commission;
  return { _id: id, ...rest };
}

export function adminHistoryEntryFromDoc(
  doc: AdminHistoryEntryDocument
): AdminHistoryEntry {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

export function adminHistoryEntryToDoc(
  entry: AdminHistoryEntry
): AdminHistoryEntryDocument {
  const { id, ...rest } = entry;
  return { _id: id, ...rest };
}
