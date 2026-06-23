import type { IconName } from "@/components/ui/Icons";
import { isAdminRole } from "@/lib/roles";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: IconName;
  adminOnly?: boolean;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin/products", label: "Catálogo", icon: "catalog" },
  { href: "/admin/sales", label: "Ventas", icon: "sales" },
  { href: "/admin/orders", label: "Pedidos", icon: "orders" },
  { href: "/admin/commissions", label: "Encargos", icon: "commissions" },
  { href: "/admin/history", label: "Historial", icon: "history" },
  { href: "/admin/users", label: "Usuarios", icon: "users", adminOnly: true },
];

export function getAdminNavItemsForRole(role?: string | null): AdminNavItem[] {
  if (isAdminRole(role)) return ADMIN_NAV_ITEMS;
  return ADMIN_NAV_ITEMS.filter((item) => !item.adminOnly);
}
