import { Collection } from "mongodb";
import {
  Product,
  ProductDocument,
  SaleLineItem,
  productFromDoc,
} from "@/lib/server/models";
import { productHasSizeStock } from "@/lib/server/sales";

export type CreateSaleItemInput = {
  product_id: string;
  size?: string;
  quantity: number;
  unit_price?: number;
  skip_stock_deduction?: boolean;
};

type ProcessSaleItemResult = {
  lineItem: SaleLineItem;
  updatedProduct: Product | null;
};

type ProcessSaleItemOptions = {
  deductStock?: boolean;
};

export async function processSaleItem(
  products: Collection<ProductDocument>,
  input: CreateSaleItemInput,
  options: ProcessSaleItemOptions = {}
): Promise<ProcessSaleItemResult | { error: string; status: number }> {
  const deductStock = options.deductStock ?? true;
  const productId = input.product_id.trim();
  const requestedSize = input.size?.trim() ?? "";
  const quantity = input.quantity;

  if (!productId) return { error: "Producto requerido", status: 400 };
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { error: "Cantidad inválida", status: 400 };
  }

  const productDoc = await products.findOne({ _id: productId, is_active: true });
  if (!productDoc) return { error: "Producto no encontrado", status: 404 };

  const product = productFromDoc(productDoc);
  const hasSizeStock = productHasSizeStock(product);
  const saleSize = requestedSize || product.size || "";

  if (hasSizeStock && !requestedSize) {
    return { error: `Talle requerido para ${product.name}`, status: 400 };
  }

  const unitPrice =
    typeof input.unit_price === "number" && input.unit_price >= 0
      ? input.unit_price
      : product.price;

  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    return { error: "Precio unitario inválido", status: 400 };
  }

  const stockBySizes = product.stock_by_sizes ?? {};
  let availableStock = product.stock;
  if (hasSizeStock) {
    availableStock = Math.max(0, stockBySizes[requestedSize] ?? 0);
  }

  const deductQty = Math.min(quantity, availableStock);
  let updatedProduct: Product | null = null;

  if (deductStock && deductQty > 0) {
    const filter: Record<string, unknown> = {
      _id: productId,
      is_active: true,
      stock: { $gte: deductQty },
    };
    const increment: Record<string, number> = { stock: -deductQty };

    if (hasSizeStock) {
      filter[`stock_by_sizes.${requestedSize}`] = { $gte: deductQty };
      increment[`stock_by_sizes.${requestedSize}`] = -deductQty;
    }

    const stockUpdate = await products.findOneAndUpdate(
      filter,
      { $inc: increment, $set: { updated_at: new Date() } },
      { returnDocument: "after" }
    );

    if (stockUpdate) {
      updatedProduct = productFromDoc(stockUpdate);
    }
  }

  const lineItem: SaleLineItem = {
    product_id: product.id,
    product_name: product.name,
    product_sku: product.sku,
    size: saleSize,
    quantity,
    unit_price: unitPrice,
    total: unitPrice * quantity,
    skip_stock_deduction: Boolean(input.skip_stock_deduction),
  };

  return { lineItem, updatedProduct };
}
