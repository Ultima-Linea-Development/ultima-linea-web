import { NextRequest, NextResponse } from "next/server";
import { ensureIndexes, getProductsCollection, getSalesCollection } from "@/lib/server/db";
import {
  ProductDocument,
  Sale,
  SaleDocument,
  generateULID,
  productFromDoc,
  saleFromDoc,
  saleToDoc,
} from "@/lib/server/models";
import {
  isNextResponse,
  jsonError,
  requireAdmin,
  requireAuth,
} from "@/lib/server/auth-middleware";
import { toProductResponse } from "@/lib/server/products";
import { parseSaleDateInput } from "@/lib/sale-date";

type CreateSaleBody = {
  product_id?: string;
  size?: string;
  quantity?: number;
  sale_date?: string;
};

export async function GET(request: NextRequest) {
  const auth = requireAdmin(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const { searchParams } = request.nextUrl;
    let page = parseInt(searchParams.get("page") || "1", 10);
    let perPage = parseInt(searchParams.get("per_page") || "10", 10);

    if (Number.isNaN(page) || page < 1) page = 1;
    if (Number.isNaN(perPage) || perPage < 1) perPage = 10;
    if (perPage > 50) perPage = 50;

    const collection = await getSalesCollection<SaleDocument>();
    const total = await collection.countDocuments({});
    const skip = (page - 1) * perPage;
    const docs = await collection
      .find({})
      .sort({ created_at: -1, _id: -1 })
      .skip(skip)
      .limit(perPage)
      .toArray();

    return NextResponse.json({
      sales: docs.map(saleFromDoc),
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage),
    });
  } catch {
    return jsonError("Failed to fetch sales", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const body = (await request.json()) as CreateSaleBody;
    const productId = body.product_id?.trim();
    const requestedSize = body.size?.trim() ?? "";
    const quantity = Number(body.quantity);

    if (!productId) return jsonError("Producto requerido", 400);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return jsonError("Cantidad inválida", 400);
    }

    const products = await getProductsCollection<ProductDocument>();
    const productDoc = await products.findOne({ _id: productId, is_active: true });
    if (!productDoc) return jsonError("Producto no encontrado", 404);

    const product = productFromDoc(productDoc);
    const stockBySizes = product.stock_by_sizes ?? {};
    const hasSizeStock = Object.keys(stockBySizes).length > 0;
    const saleSize = requestedSize || product.size || "";

    if (hasSizeStock && !requestedSize) return jsonError("Talle requerido", 400);

    let availableStock = product.stock;
    if (hasSizeStock) {
      availableStock = Math.max(0, stockBySizes[requestedSize] ?? 0);
    }

    const deductQty = Math.min(quantity, availableStock);
    let updatedDoc: ProductDocument = productDoc;

    if (deductQty > 0) {
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
        updatedDoc = stockUpdate;
      }
    }

    const now = new Date();
    const saleDateInput = body.sale_date?.trim();
    let createdAt = now;
    if (saleDateInput) {
      const parsedSaleDate = parseSaleDateInput(saleDateInput);
      if (!parsedSaleDate) return jsonError("Fecha inválida", 400);
      createdAt = parsedSaleDate;
    }

    const sale: Sale = {
      id: generateULID(),
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      size: saleSize,
      quantity,
      unit_price: product.price,
      total: product.price * quantity,
      created_at: createdAt,
      updated_at: now,
    };

    const sales = await getSalesCollection<SaleDocument>();
    await sales.insertOne(saleToDoc(sale));

    return NextResponse.json(
      {
        sale,
        product: toProductResponse(productFromDoc(updatedDoc), 2),
      },
      { status: 201 }
    );
  } catch {
    return jsonError("Failed to create sale", 500);
  }
}
