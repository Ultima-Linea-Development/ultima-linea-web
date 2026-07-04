export type AdminStatsTabId = "catalog" | "sales" | "sellers" | "operations";

export type AdminStatsTab = {
  id: AdminStatsTabId;
  label: string;
};

export const ADMIN_STATS_TABS: AdminStatsTab[] = [
  {
    id: "catalog",
    label: "Catálogo",
  },
  {
    id: "sales",
    label: "Ventas",
  },
  {
    id: "sellers",
    label: "Vendedores",
  },
  {
    id: "operations",
    label: "Encargos y pedidos",
  },
];

export function parseAdminStatsTabId(value: string | null): AdminStatsTabId {
  if (value && ADMIN_STATS_TABS.some((tab) => tab.id === value)) {
    return value as AdminStatsTabId;
  }
  return "catalog";
}
