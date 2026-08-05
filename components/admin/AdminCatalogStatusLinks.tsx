import Typography from "@/components/ui/Typography";
import AdminTextLink from "@/components/admin/AdminTextLink";
import { cn } from "@/lib/utils";

export type CatalogStatusFilter =
  | "all"
  | "inactive"
  | "in_stock"
  | "out_of_stock"
  | "reserved";

type AdminCatalogStatusLinksProps = {
  todoCount: number;
  inactiveCount: number;
  inStockCount: number;
  outOfStockCount: number;
  reservedCount: number;
  statusFilter: CatalogStatusFilter;
  onShowTodo: () => void;
  onShowInactive: () => void;
  onShowInStock: () => void;
  onShowOutOfStock: () => void;
  onShowReserved: () => void;
  className?: string;
};

export default function AdminCatalogStatusLinks({
  todoCount,
  inactiveCount,
  inStockCount,
  outOfStockCount,
  reservedCount,
  statusFilter,
  onShowTodo,
  onShowInactive,
  onShowInStock,
  onShowOutOfStock,
  onShowReserved,
  className,
}: AdminCatalogStatusLinksProps) {
  return (
    <nav
      aria-label="Filtrar por estado del catálogo"
      className={cn("flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1", className)}
    >
      <AdminTextLink selected={statusFilter === "all"} onClick={onShowTodo}>
        <Typography variant="body2" as="span">
          Todo ({todoCount})
        </Typography>
      </AdminTextLink>
      <Typography variant="body2" color="muted" as="span" aria-hidden="true">
        |
      </Typography>
      <AdminTextLink selected={statusFilter === "inactive"} onClick={onShowInactive}>
        <Typography variant="body2" as="span">
          Inactivos ({inactiveCount})
        </Typography>
      </AdminTextLink>
      <Typography variant="body2" color="muted" as="span" aria-hidden="true">
        |
      </Typography>
      <AdminTextLink selected={statusFilter === "in_stock"} onClick={onShowInStock}>
        <Typography variant="body2" as="span">
          En stock ({inStockCount})
        </Typography>
      </AdminTextLink>
      <Typography variant="body2" color="muted" as="span" aria-hidden="true">
        |
      </Typography>
      <AdminTextLink selected={statusFilter === "out_of_stock"} onClick={onShowOutOfStock}>
        <Typography variant="body2" as="span">
          Agotadas ({outOfStockCount})
        </Typography>
      </AdminTextLink>
      <Typography variant="body2" color="muted" as="span" aria-hidden="true">
        |
      </Typography>
      <AdminTextLink selected={statusFilter === "reserved"} onClick={onShowReserved}>
        <Typography variant="body2" as="span">
          Reservadas ({reservedCount})
        </Typography>
      </AdminTextLink>
    </nav>
  );
}
