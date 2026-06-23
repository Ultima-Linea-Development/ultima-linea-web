import { NextRequest, NextResponse } from "next/server";
import {
  ensureIndexes,
  getExternalSellersCollection,
  getProductsCollection,
  getSalesCollection,
} from "@/lib/server/db";
import {
  ExternalSellerDocument,
  ProductDocument,
  Sale,
  SaleDocument,
  generateULID,
  saleToDoc,
} from "@/lib/server/models";
import {
  isNextResponse,
  jsonError,
  requireStaff,
  requireAuth,
} from "@/lib/server/auth-middleware";
import { toProductResponse } from "@/lib/server/products";
import {
  parseOptionalSaleText,
  resolveSaleSellerForCreate,
  type SaleSellerType,
} from "@/lib/server/sale-seller";
import { parseSaleDateInput } from "@/lib/sale-date";
import { CreateSaleItemInput, processSaleItem } from "@/lib/server/create-sale";
import { normalizeSaleForResponse } from "@/lib/server/sale-items";
import { trackAdminAction } from "@/lib/server/admin-history";

type CreateSaleItemBody = {
  product_id?: string;
  size?: string;
  quantity?: number;
  unit_price?: number;
  skip_stock_deduction?: boolean;
};

type CreateSaleBody = {
  items?: CreateSaleItemBody[];
  product_id?: string;
  size?: string;
  quantity?: number;
  sale_date?: string;
  seller_type?: SaleSellerType;
  created_by?: string;
  external_seller_id?: string;
  external_seller_name?: string;
  skip_stock_deduction?: boolean;
  transfer_alias?: string;
  description?: string;
};

function parseCreateSaleItems(body: CreateSaleBody): CreateSaleItemInput[] {
  if (Array.isArray(body.items) && body.items.length > 0) {
    return body.items.map((item) => ({
      product_id: item.product_id?.trim() ?? "",
      size: item.size,
      quantity: Number(item.quantity),
      unit_price: item.unit_price != null ? Number(item.unit_price) : undefined,
      skip_stock_deduction: Boolean(item.skip_stock_deduction),
    }));
  }

  if (body.product_id?.trim()) {
    return [
      {
        product_id: body.product_id.trim(),
        size: body.size,
        quantity: Number(body.quantity),
        skip_stock_deduction: Boolean(body.skip_stock_deduction),
      },
    ];
  }

  return [];
}

export async function GET(request: NextRequest) {
  const auth = requireStaff(requireAuth(request));
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
      sales: docs.map(normalizeSaleForResponse),
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
  const auth = requireStaff(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const body = (await request.json()) as CreateSaleBody;
    const itemInputs = parseCreateSaleItems(body);

    if (itemInputs.length === 0) {
      return jsonError("Agregá al menos un producto", 400);
    }

    const products = await getProductsCollection<ProductDocument>();
    const lineItems = [];
    const updatedProductIds = new Set<string>();
    const updatedProducts = [];
    const legacySkipStockDeduction = Boolean(body.skip_stock_deduction);

    for (const input of itemInputs) {
      const inputWithLegacySkip = {
        ...input,
        skip_stock_deduction: input.skip_stock_deduction || legacySkipStockDeduction,
      };
      const result = await processSaleItem(products, input, {
        deductStock: !inputWithLegacySkip.skip_stock_deduction,
      });
      if ("error" in result) {
        return jsonError(result.error, result.status);
      }

      lineItems.push({
        ...result.lineItem,
        skip_stock_deduction: inputWithLegacySkip.skip_stock_deduction,
      });

      if (result.updatedProduct && !updatedProductIds.has(result.updatedProduct.id)) {
        updatedProductIds.add(result.updatedProduct.id);
        updatedProducts.push(toProductResponse(result.updatedProduct, 2));
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

    const externalSellers = await getExternalSellersCollection<ExternalSellerDocument>();
    const sellerResult = await resolveSaleSellerForCreate(auth, externalSellers, {
      seller_type: body.seller_type,
      created_by: body.created_by,
      external_seller_id: body.external_seller_id,
      external_seller_name: body.external_seller_name,
    });

    if ("error" in sellerResult) {
      return jsonError(sellerResult.error, sellerResult.status);
    }

    const total = lineItems.reduce((sum, item) => sum + item.total, 0);
    const transferAlias = parseOptionalSaleText(body.transfer_alias);
    const description = parseOptionalSaleText(body.description);

    const sale: Sale = {
      id: generateULID(),
      items: lineItems,
      total,
      created_by: sellerResult.created_by,
      ...(sellerResult.external_seller_id
        ? {
            external_seller_id: sellerResult.external_seller_id,
            external_seller_name: sellerResult.external_seller_name,
          }
        : {}),
      ...(transferAlias ? { transfer_alias: transferAlias } : {}),
      ...(description ? { description } : {}),
      created_at: createdAt,
      updated_at: now,
    };

    const sales = await getSalesCollection<SaleDocument>();
    await sales.insertOne(saleToDoc(sale));
    await trackAdminAction({
      auth,
      action: "create",
      resource: "sale",
      resourceId: sale.id,
      resourceLabel: `Venta ${sale.id}`,
    });

    return NextResponse.json(
      {
        sale: normalizeSaleForResponse(saleToDoc(sale)),
        ...(updatedProducts.length > 0 ? { products: updatedProducts } : {}),
      },
      { status: 201 }
    );
  } catch {
    return jsonError("Failed to create sale", 500);
  }
}
