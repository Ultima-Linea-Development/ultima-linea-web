import { NextRequest, NextResponse } from "next/server";
import {
  ensureIndexes,
  getCommissionsCollection,
  getExternalSellersCollection,
} from "@/lib/server/db";
import {
  Commission,
  CommissionDocument,
  ExternalSellerDocument,
  generateULID,
  commissionToDoc,
} from "@/lib/server/models";
import {
  isNextResponse,
  jsonError,
  requireStaff,
  requireAuth,
} from "@/lib/server/auth-middleware";
import {
  buildDefaultCommissionName,
  mapSaleSellerToCommissionFields,
  normalizeCommissionForResponse,
  parseCommissionLineItems,
  type CommissionLineItemInput,
} from "@/lib/server/commissions";
import { resolveSaleSellerForCreate } from "@/lib/server/sale-seller";
import { parseSaleDateInput } from "@/lib/sale-date";
import { trackAdminAction } from "@/lib/server/admin-history";

type CreateCommissionBody = {
  customer_name?: string;
  customer_contact?: string;
  commission_date?: string;
  seller_type?: "internal" | "external";
  seller_user_id?: string;
  external_seller_id?: string;
  external_seller_name?: string;
  notes?: string;
  items?: CommissionLineItemInput[];
};

function trimOptional(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
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

    const collection = await getCommissionsCollection<CommissionDocument>();
    const total = await collection.countDocuments({});
    const skip = (page - 1) * perPage;
    const docs = await collection
      .find({})
      .sort({ created_at: -1, _id: -1 })
      .skip(skip)
      .limit(perPage)
      .toArray();

    return NextResponse.json({
      commissions: docs.map(normalizeCommissionForResponse),
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage),
    });
  } catch {
    return jsonError("Failed to fetch commissions", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = requireStaff(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const body = (await request.json()) as CreateCommissionBody;
    const customerName = body.customer_name?.trim();
    if (!customerName) {
      return jsonError("El nombre del cliente es obligatorio", 400);
    }

    const itemsResult = parseCommissionLineItems(body.items);
    if ("error" in itemsResult) {
      return jsonError(itemsResult.error, 400);
    }

    const externalSellers = await getExternalSellersCollection<ExternalSellerDocument>();
    const sellerResult = await resolveSaleSellerForCreate(auth, externalSellers, {
      seller_type: body.seller_type,
      created_by: body.seller_user_id,
      external_seller_id: body.external_seller_id,
      external_seller_name: body.external_seller_name,
    });

    if ("error" in sellerResult) {
      return jsonError(sellerResult.error, sellerResult.status);
    }

    const sellerFields = mapSaleSellerToCommissionFields(sellerResult);
    const now = new Date();
    const commissionDateInput = body.commission_date?.trim();
    let createdAt = now;
    if (commissionDateInput) {
      const parsedCommissionDate = parseSaleDateInput(commissionDateInput);
      if (!parsedCommissionDate) return jsonError("Fecha del encargo inválida", 400);
      createdAt = parsedCommissionDate;
    }

    const commission: Commission = {
      id: generateULID(),
      name: buildDefaultCommissionName(customerName),
      customer_name: customerName,
      customer_contact: trimOptional(body.customer_contact),
      ...sellerFields,
      status: "pending",
      notes: trimOptional(body.notes),
      items: itemsResult.items,
      created_by: auth.user_id,
      created_at: createdAt,
      updated_at: now,
    };

    const collection = await getCommissionsCollection<CommissionDocument>();
    await collection.insertOne(commissionToDoc(commission));
    await trackAdminAction({
      auth,
      action: "create",
      resource: "commission",
      resourceId: commission.id,
      resourceLabel: commission.name,
    });

    return NextResponse.json(
      { commission: normalizeCommissionForResponse(commission) },
      { status: 201 }
    );
  } catch {
    return jsonError("Failed to create commission", 500);
  }
}
