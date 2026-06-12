"use client";

import { useMemo, useState } from "react";
import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import AdminTableProductName from "@/components/admin/AdminTableProductName";
import AdminSaleDateInput from "@/components/admin/AdminSaleDateInput";
import AdminTableMobileActionsMenu, {
  type AdminTableMobileAction,
} from "@/components/admin/AdminTableMobileActionsMenu";
import {
  AdminTable,
  AdminTableEmptyRow,
  AdminTableMobileCard,
  AdminTableMobileEmpty,
  AdminTableMobileField,
  AdminTableMobileGrid,
  AdminTableMobileList,
  AdminTablePagination,
  ADMIN_TABLE_CELL_CLASS,
  ADMIN_TABLE_TH_CLASS,
} from "@/components/admin/AdminTable";
import type { Product, Sale } from "@/lib/api";
import { cn, formatPrice, generateSlug } from "@/lib/utils";

const PER_PAGE = 10;

type AdminSalesTableProps = {
  sales: Sale[];
  products?: Product[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onDelete?: (sale: Sale) => void;
  onUpdateDate?: (sale: Sale, saleDate: string) => void;
  updatingSaleId?: string | null;
};

export default function AdminSalesTable({
  sales,
  products = [],
  page,
  perPage,
  total,
  totalPages,
  onPageChange,
  onDelete,
  onUpdateDate,
  updatingSaleId = null,
}: AdminSalesTableProps) {
  const cellClass = ADMIN_TABLE_CELL_CLASS;
  const thClass = ADMIN_TABLE_TH_CLASS;
  const [editingDateSaleId, setEditingDateSaleId] = useState<string | null>(null);

  const handleDateUpdate = (sale: Sale, saleDate: string) => {
    onUpdateDate?.(sale, saleDate);
    setEditingDateSaleId(null);
  };

  const toggleDateEdit = (saleId: string) => {
    setEditingDateSaleId((current) => (current === saleId ? null : saleId));
  };

  const getRowActions = (sale: Sale): AdminTableMobileAction[] => {
    const actions: AdminTableMobileAction[] = [
      {
        id: "edit-date",
        label: "Editar",
        icon: "edit",
        onClick: () => toggleDateEdit(sale.id),
        disabled: updatingSaleId === sale.id,
        active: editingDateSaleId === sale.id,
      },
    ];

    if (onDelete) {
      actions.push({
        id: "delete",
        label: "Eliminar",
        icon: "delete",
        onClick: () => onDelete(sale),
        destructive: true,
      });
    }

    return actions;
  };

  const productImages = useMemo(
    () =>
      Object.fromEntries(
        products.map((product) => [product.id, product.image_urls?.[0]] as const)
      ),
    [products]
  );

  const productById = useMemo(
    () => Object.fromEntries(products.map((product) => [product.id, product] as const)),
    [products]
  );

  const getProductHref = (sale: Sale) => {
    const product = productById[sale.product_id];
    const slug = product?.slug || generateSlug(sale.product_name);
    return `/product/${slug}-${sale.product_id}`;
  };

  return (
    <Box display="flex" direction="col" gap="4" className="w-full min-w-0">
      {sales.length === 0 ? (
        <>
          <AdminTableMobileEmpty message="No hay ventas" />
          <AdminTable>
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className={thClass}>
                  <Typography variant="body2">Fecha</Typography>
                </th>
                <th className={thClass}>
                  <Typography variant="body2">Producto</Typography>
                </th>
                <th className={thClass}>
                  <Typography variant="body2">Talle</Typography>
                </th>
                <th className={thClass}>
                  <Typography variant="body2">Cantidad</Typography>
                </th>
                <th className={thClass}>
                  <Typography variant="body2">Total</Typography>
                </th>
                <th className={thClass}>
                  <Typography variant="body2">Acciones</Typography>
                </th>
              </tr>
            </thead>
            <tbody>
              <AdminTableEmptyRow colSpan={6} message="No hay ventas" />
            </tbody>
          </AdminTable>
        </>
      ) : (
        <>
          <AdminTableMobileList>
            {sales.map((sale) => (
              <AdminTableMobileCard key={sale.id}>
                <Box display="flex" justify="between" align="start" gap="3" className="mb-3 w-full">
                  <AdminTableProductName
                    name={sale.product_name}
                    imageUrl={productImages[sale.product_id]}
                    href={getProductHref(sale)}
                    className="min-w-0 items-start"
                  />
                  <AdminTableMobileActionsMenu actions={getRowActions(sale)} />
                </Box>
                <AdminTableMobileGrid>
                  <AdminTableMobileField label="Fecha" fullWidth>
                    <AdminSaleDateInput
                      sale={sale}
                      isEditing={editingDateSaleId === sale.id}
                      disabled={updatingSaleId === sale.id}
                      onUpdateDate={handleDateUpdate}
                    />
                  </AdminTableMobileField>
                  <AdminTableMobileField label="Talle">
                    <Typography variant="body2">{sale.size || "—"}</Typography>
                  </AdminTableMobileField>
                  <AdminTableMobileField label="Cantidad">
                    <Typography variant="body2">{sale.quantity}</Typography>
                  </AdminTableMobileField>
                  <AdminTableMobileField label="Total">
                    <Typography variant="body2">{formatPrice(sale.total)}</Typography>
                  </AdminTableMobileField>
                </AdminTableMobileGrid>
              </AdminTableMobileCard>
            ))}
          </AdminTableMobileList>

          <AdminTable>
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className={thClass}>
                  <Typography variant="body2">Fecha  de venta</Typography>
                </th>
                <th className={thClass}>
                  <Typography variant="body2">Producto</Typography>
                </th>
                <th className={thClass}>
                  <Typography variant="body2">Talle</Typography>
                </th>
                <th className={thClass}>
                  <Typography variant="body2">Cantidad</Typography>
                </th>
                <th className={thClass}>
                  <Typography variant="body2">Total</Typography>
                </th>
                <th className={thClass}>
                  <Typography variant="body2">Acciones</Typography>
                </th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr
                  key={sale.id}
                  className="border-b border-border last:border-b-0 hover:bg-muted/30"
                >
                  <td className={cellClass}>
                    <AdminSaleDateInput
                      sale={sale}
                      isEditing={editingDateSaleId === sale.id}
                      disabled={updatingSaleId === sale.id}
                      onUpdateDate={handleDateUpdate}
                    />
                  </td>
                  <td className={cn(cellClass, "min-w-[160px] max-w-[280px]")}>
                    <AdminTableProductName
                      name={sale.product_name}
                      imageUrl={productImages[sale.product_id]}
                      href={getProductHref(sale)}
                    />
                  </td>
                  <td className={cellClass}>
                    <Typography variant="body2">{sale.size || "—"}</Typography>
                  </td>
                  <td className={cellClass}>
                    <Typography variant="body2">{sale.quantity}</Typography>
                  </td>
                  <td className={cellClass}>
                    <span className="whitespace-nowrap">
                      <Typography variant="body2">{formatPrice(sale.total)}</Typography>
                    </span>
                  </td>
                  <td className={cn(cellClass, "whitespace-nowrap")}>
                    <AdminTableMobileActionsMenu actions={getRowActions(sale)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </>
      )}

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
