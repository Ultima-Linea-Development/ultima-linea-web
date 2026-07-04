import {
  getCommissionsCollection,
  getProductsCollection,
  getSalesCollection,
  getSupplierOrdersCollection,
} from "@/lib/server/db";
import { getAdminCatalogStats } from "@/lib/server/admin-catalog-stats";
import { getAdminSalesStats } from "@/lib/server/admin-sales-stats";
import { getAdminSellerStats } from "@/lib/server/admin-seller-stats";
import { getAdminOperationsStats } from "@/lib/server/admin-operations-stats";
import type {
  CommissionDocument,
  ProductDocument,
  SaleDocument,
  SupplierOrderDocument,
} from "@/lib/server/models";

export type { AdminCatalogStats } from "@/lib/server/admin-catalog-stats";
export type { AdminSalesStats, AdminSalesPeriodStats } from "@/lib/server/admin-sales-stats";
export type {
  AdminSellerStats,
  AdminSellerRankingEntry,
  AdminSellerTypeSummary,
} from "@/lib/server/admin-seller-stats";
export type {
  AdminOperationsStats,
  AdminOperationsStatusStats,
} from "@/lib/server/admin-operations-stats";

export type AdminStats = {
  catalog: import("@/lib/server/admin-catalog-stats").AdminCatalogStats;
  sales: import("@/lib/server/admin-sales-stats").AdminSalesStats;
  sellers: import("@/lib/server/admin-seller-stats").AdminSellerStats;
  operations: import("@/lib/server/admin-operations-stats").AdminOperationsStats;
};

export async function getAdminStats(): Promise<AdminStats> {
  const [
    productsCollection,
    salesCollection,
    commissionsCollection,
    ordersCollection,
  ] = await Promise.all([
    getProductsCollection<ProductDocument>(),
    getSalesCollection<SaleDocument>(),
    getCommissionsCollection<CommissionDocument>(),
    getSupplierOrdersCollection<SupplierOrderDocument>(),
  ]);

  const [catalog, sales, sellers, operations] = await Promise.all([
    getAdminCatalogStats(productsCollection),
    getAdminSalesStats(salesCollection),
    getAdminSellerStats(salesCollection),
    getAdminOperationsStats(commissionsCollection, ordersCollection),
  ]);

  return { catalog, sales, sellers, operations };
}
