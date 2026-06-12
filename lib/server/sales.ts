import { Collection } from "mongodb";
import { Product, ProductDocument, productFromDoc } from "./models";

type StockAdjustArgs = {
  productId: string;
  size: string;
  quantity: number;
  direction: "restore" | "deduct";
};

export function productHasSizeStock(product: Product): boolean {
  return Object.keys(product.stock_by_sizes ?? {}).length > 0;
}

export async function adjustProductStock(
  collection: Collection<ProductDocument>,
  { productId, size, quantity, direction }: StockAdjustArgs
): Promise<Product | null> {
  if (quantity <= 0) return null;

  const productDoc = await collection.findOne({ _id: productId });
  if (!productDoc) return null;

  const product = productFromDoc(productDoc);
  const hasSizeStock = productHasSizeStock(product);
  const delta = direction === "restore" ? quantity : -quantity;

  const filter: Record<string, unknown> = { _id: productId };
  const increment: Record<string, number> = { stock: delta };

  if (hasSizeStock) {
    if (!size) return null;
    if (product.stock_by_sizes[size] == null) return null;
    if (direction === "deduct") {
      filter[`stock_by_sizes.${size}`] = { $gte: quantity };
    }
    increment[`stock_by_sizes.${size}`] = delta;
  }

  const updatedDoc = await collection.findOneAndUpdate(
    filter,
    { $inc: increment, $set: { updated_at: new Date() } },
    { returnDocument: "after" }
  );

  return updatedDoc ? productFromDoc(updatedDoc) : null;
}
