import Typography from "@/components/ui/Typography";
import AdminTextLink from "@/components/admin/AdminTextLink";
import { cn } from "@/lib/utils";

export type CatalogStatusFilter = "all" | "inactive" | "in_stock";

type AdminCatalogStatusLinksProps = {
  todoCount: number;
  inactiveCount: number;
  inStockCount: number;
  statusFilter: CatalogStatusFilter;
  onShowTodo: () => void;
  onShowInactive: () => void;
  onShowInStock: () => void;
  className?: string;
};

export default function AdminCatalogStatusLinks({
  todoCount,
  inactiveCount,
  inStockCount,
  statusFilter,
  onShowTodo,
  onShowInactive,
  onShowInStock,
  className,
}: AdminCatalogStatusLinksProps) {
  return (
    <nav
      aria-label="Filtrar por estado del catálogo"
      className={cn("flex shrink-0 items-center gap-2", className)}
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
    </nav>
  );
}
