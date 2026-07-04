import type { AdminStatsPeriodKey } from "@/lib/api";
import type { CommissionStatus, SupplierOrderStatus } from "@/lib/api";
import { getCommissionStatusLabel } from "@/lib/commission-display";
import { getSupplierOrderStatusLabel } from "@/lib/supplier-order-display";

export const ADMIN_STATS_PERIOD_LABELS: Record<AdminStatsPeriodKey, string> = {
  all_time: "Todo el período",
  last_7_days: "Últimos 7 días",
  last_30_days: "Últimos 30 días",
  this_month: "Este mes",
};

export const ADMIN_STATS_PERIOD_ORDER: AdminStatsPeriodKey[] = [
  "this_month",
  "last_7_days",
  "last_30_days",
  "all_time",
];

export const ADMIN_COMMISSION_STATUS_ORDER: CommissionStatus[] = [
  "pending",
  "exported",
  "cancelled",
];

export const ADMIN_ORDER_STATUS_ORDER: SupplierOrderStatus[] = [
  "draft",
  "sent",
  "partial",
  "completed",
  "cancelled",
];

export function getAdminCommissionStatusLabel(status: CommissionStatus): string {
  return getCommissionStatusLabel(status);
}

export function getAdminOrderStatusLabel(status: SupplierOrderStatus): string {
  return getSupplierOrderStatusLabel(status);
}

export const ADMIN_PRODUCT_TYPE_LABELS: Record<string, string> = {
  fan: "Fan",
  player: "Jugador",
  retro: "Retro",
};

export function getAdminProductTypeLabel(type: string): string {
  return ADMIN_PRODUCT_TYPE_LABELS[type] ?? type;
}
