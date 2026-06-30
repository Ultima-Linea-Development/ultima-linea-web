"use client";

import { useRef, useEffect, type ReactNode } from "react";
import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import {
  AdminTable,
  AdminTableEmptyRow,
  AdminTableMobileCard,
  AdminTableMobileEmpty,
  AdminTableMobileList,
  AdminTableMobileSummary,
  AdminTablePagination,
  ADMIN_TABLE_ACTIONS_CELL_CLASS,
  ADMIN_TABLE_CELL_CLASS,
  ADMIN_TABLE_MOBILE_CLASS,
  ADMIN_TABLE_TH_CLASS,
  adminTableRowClassName,
} from "@/components/admin/AdminTable";
import type { ExternalSeller, Product, SaleAssignableUser } from "@/lib/api";
import { formatPrice, generateSlug, cn } from "@/lib/utils";
import AdminTableProductName from "@/components/admin/AdminTableProductName";
import AdminProductReservationBadge from "@/components/admin/AdminProductReservationBadge";
import AdminProductSizeStock from "@/components/admin/AdminProductSizeStock";
import AdminTableColumnFilter from "@/components/admin/AdminTableColumnFilter";
import AdminTableMobileActionsMenu, {
  type AdminTableMobileAction,
} from "@/components/admin/AdminTableMobileActionsMenu";
import { sortSizeLabels } from "@/lib/product-inventory";
import { isProductReserved } from "@/lib/product-reservation";

const PER_PAGE = 10;

type AdminProductsTableProps = {
  products: Product[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEdit?: (product: Product) => void;
  onReserve?: (product: Product) => void;
  onDeactivate?: (product: Product) => void;
  onReactivate?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  canDeleteProduct?: (product: Product) => boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  tableFooter?: ReactNode;
  sizeFilter?: string;
  sizeOptions?: string[];
  onSizeFilterChange?: (value: string) => void;
  assignableUsers?: SaleAssignableUser[];
  externalSellers?: ExternalSeller[];
};

export default function AdminProductsTable({
  products,
  page,
  perPage,
  total,
  totalPages,
  onPageChange,
  onEdit,
  onReserve,
  onDeactivate,
  onReactivate,
  onDelete,
  canDeleteProduct,
  selectedIds = [],
  onSelectionChange,
  tableFooter,
  sizeFilter = "",
  sizeOptions = [],
  onSizeFilterChange,
  assignableUsers = [],
  externalSellers = [],
}: AdminProductsTableProps) {
  const cellClass = ADMIN_TABLE_CELL_CLASS;
  const thClass = ADMIN_TABLE_TH_CLASS;

  const selectedSet = new Set(selectedIds);
  const visibleIds = products.map((p) => p.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedSet.has(id));

  const handleToggleRow = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedSet.has(id)) {
      onSelectionChange(selectedIds.filter((s) => s !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleToggleAll = () => {
    if (!onSelectionChange) return;
    if (allVisibleSelected) {
      onSelectionChange(selectedIds.filter((id) => !visibleIds.includes(id)));
    } else {
      const merged = new Set([...selectedIds, ...visibleIds]);
      onSelectionChange(Array.from(merged));
    }
  };

  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
  }, [someVisibleSelected, allVisibleSelected]);

  const renderReservationBadge = (product: Product) =>
    isProductReserved(product) ? (
      <AdminProductReservationBadge
        product={product}
        size="sm"
        assignableUsers={assignableUsers}
        externalSellers={externalSellers}
      />
    ) : null;

  const colSpan = onSelectionChange ? 6 : 5;

  const sortedSizeOptions = sortSizeLabels(sizeOptions);

  const renderSizeHeader = () =>
    onSizeFilterChange ? (
      <AdminTableColumnFilter
        id="catalog-size-filter"
        label="Talles"
        value={sizeFilter}
        onChange={onSizeFilterChange}
        options={sortedSizeOptions.map((size) => ({ value: size, label: size }))}
      />
    ) : (
      <Typography variant="body2">Talles</Typography>
    );

  const renderMobileFilters = () => {
    if (!onSizeFilterChange) return null;

    return (
      <Box
        display="flex"
        className={cn(
          ADMIN_TABLE_MOBILE_CLASS,
          "w-full flex-wrap items-center gap-3 border border-gray-200 px-3 py-2.5 sm:px-4 sm:py-3"
        )}
      >
        <AdminTableColumnFilter
          id="catalog-size-filter-mobile"
          label="Talles"
          value={sizeFilter}
          onChange={onSizeFilterChange}
          options={sortedSizeOptions.map((size) => ({ value: size, label: size }))}
        />
      </Box>
    );
  };

  const getRowActions = (product: Product): AdminTableMobileAction[] => {
    const actions: AdminTableMobileAction[] = [];

    if (onEdit) {
      actions.push({
        id: "edit",
        label: "Editar",
        icon: "edit",
        onClick: () => onEdit(product),
      });
    }

    if (onReserve) {
      actions.push({
        id: "reserve",
        label: isProductReserved(product) ? "Editar reserva" : "Reservar",
        icon: "commissions",
        onClick: () => onReserve(product),
      });
    }

    if (onDeactivate && product.is_active) {
      actions.push({
        id: "deactivate",
        label: "Desactivar",
        icon: "visibilityOff",
        onClick: () => onDeactivate(product),
        warning: true,
      });
    }

    if (onReactivate && !product.is_active) {
      actions.push({
        id: "reactivate",
        label: "Reactivar",
        icon: "visibility",
        onClick: () => onReactivate(product),
      });
    }

    if (onDelete && (!canDeleteProduct || canDeleteProduct(product))) {
      actions.push({
        id: "delete",
        label: "Eliminar",
        icon: "delete",
        onClick: () => onDelete(product),
        destructive: true,
      });
    }

    return actions;
  };

  const renderDesktopHeaderRow = (withSelectAllRef = false) => (
    <tr>
      {onSelectionChange && (
        <th className={thClass}>
          <input
            ref={withSelectAllRef ? selectAllRef : undefined}
            type="checkbox"
            checked={allVisibleSelected}
            onChange={handleToggleAll}
            aria-label="Seleccionar todos"
            className="size-4 cursor-pointer"
          />
        </th>
      )}
      <th className={thClass}>
        <Typography variant="body2">Nombre</Typography>
      </th>
      <th className={thClass}>
        <Typography variant="body2">Equipo</Typography>
      </th>
      <th className={thClass}>{renderSizeHeader()}</th>
      <th className={thClass}>
        <Typography variant="body2">Precio</Typography>
      </th>
      <th className={thClass}>
        <Typography variant="body2">Acciones</Typography>
      </th>
    </tr>
  );

  return (
    <Box display="flex" direction="col" gap="4" className="w-full min-w-0">
      {renderMobileFilters()}
      {products.length === 0 ? (
        <>
          <AdminTableMobileEmpty message="No hay productos" />
          <AdminTable>
            <thead className="bg-muted/50">
              {renderDesktopHeaderRow(true)}
            </thead>
            <tbody>
              <AdminTableEmptyRow colSpan={colSpan} message="No hay productos" />
            </tbody>
          </AdminTable>
        </>
      ) : (
        <>
          <AdminTableMobileList>
            {onSelectionChange && (
              <Box
                display="flex"
                className="items-center gap-3 px-3 py-2.5 bg-muted/30 sm:px-4 sm:py-3"
              >
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={handleToggleAll}
                  aria-label="Seleccionar todos"
                  className="size-4 cursor-pointer"
                />
                <Typography variant="body2">Seleccionar todos</Typography>
              </Box>
            )}
            {products.map((p, index) => (
              <AdminTableMobileCard
                key={p.id}
                selected={selectedSet.has(p.id)}
                stripeIndex={index}
              >
                <Box display="flex" justify="between" align="start" gap="2" className="w-full min-w-0">
                  <Box display="flex" align="start" gap="2" className="min-w-0 flex-1">
                    {onSelectionChange && (
                      <input
                        type="checkbox"
                        checked={selectedSet.has(p.id)}
                        onChange={() => handleToggleRow(p.id)}
                        aria-label={`Seleccionar ${p.name}`}
                        className="size-4 cursor-pointer shrink-0 mt-0.5"
                      />
                    )}
                    <AdminTableProductName
                      name={p.name}
                      imageUrl={p.image_urls?.[0]}
                      href={`/product/${(p.slug || generateSlug(p.name))}-${p.id}`}
                      imageClassName="h-9 w-9"
                      className="min-w-0 items-start gap-2"
                      inactive={!p.is_active}
                      titlePrefix={renderReservationBadge(p)}
                    />
                  </Box>
                  <AdminTableMobileActionsMenu actions={getRowActions(p)} />
                </Box>
                <AdminTableMobileSummary
                  left={p.team ?? "—"}
                  right={formatPrice(p.price)}
                />
                <AdminProductSizeStock
                  product={p}
                  highlightSize={sizeFilter || undefined}
                />
              </AdminTableMobileCard>
            ))}
          </AdminTableMobileList>

          <AdminTable>
            <thead className="bg-muted/50">
              {renderDesktopHeaderRow(true)}
            </thead>
            <tbody>
              {products.map((p, index) => (
                <tr
                  key={p.id}
                  className={adminTableRowClassName({
                    stripeIndex: index,
                    selected: selectedSet.has(p.id),
                  })}
                >
                  {onSelectionChange && (
                    <td className={cellClass}>
                      <input
                        type="checkbox"
                        checked={selectedSet.has(p.id)}
                        onChange={() => handleToggleRow(p.id)}
                        aria-label={`Seleccionar ${p.name}`}
                        className="size-4 cursor-pointer"
                      />
                    </td>
                  )}
                  <td className={cellClass}>
                    <AdminTableProductName
                      name={p.name}
                      imageUrl={p.image_urls?.[0]}
                      href={`/product/${(p.slug || generateSlug(p.name))}-${p.id}`}
                      inactive={!p.is_active}
                      titlePrefix={renderReservationBadge(p)}
                    />
                  </td>
                  <td className={cellClass}>
                    <Typography variant="body2">{p.team ?? "—"}</Typography>
                  </td>
                  <td className={cellClass}>
                    <AdminProductSizeStock
                      product={p}
                      highlightSize={sizeFilter || undefined}
                    />
                  </td>
                  <td className={cellClass}>
                    <Typography variant="body2" className="whitespace-nowrap tabular-nums">
                      {formatPrice(p.price)}
                    </Typography>
                  </td>
                  <td className={ADMIN_TABLE_ACTIONS_CELL_CLASS}>
                    <AdminTableMobileActionsMenu actions={getRowActions(p)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </>
      )}

      {tableFooter}

      <AdminTablePagination
        page={page}
        perPage={perPage}
        total={total}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </Box>
  );
}

export { PER_PAGE };
