"use client";

import { useMemo, type ReactNode } from "react";
import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import AdminTableMobileActionsMenu, {
  type AdminTableMobileAction,
} from "@/components/admin/AdminTableMobileActionsMenu";
import {
  AdminTableSelectAllHeader,
  AdminTableSelectAllMobileRow,
  AdminTableRowCheckbox,
} from "@/components/admin/AdminTableSelectionControls";
import {
  AdminTable,
  AdminTableEmptyRow,
  AdminTableMobileCard,
  AdminTableMobileEmpty,
  AdminTableMobileList,
  AdminTableMobileSummary,
  AdminTableMobileSubtext,
  AdminTablePagination,
  ADMIN_TABLE_ACTIONS_CELL_CLASS,
  ADMIN_TABLE_CELL_CLASS,
  ADMIN_TABLE_TH_CLASS,
  adminTableRowClassName,
} from "@/components/admin/AdminTable";
import AdminTextLink from "@/components/admin/AdminTextLink";
import AdminSupplierOrderStatusBadge from "@/components/admin/AdminSupplierOrderStatusBadge";
import AdminSupplierOrderTrackingCell from "@/components/admin/AdminSupplierOrderTrackingCell";
import type { SupplierOrder } from "@/lib/api";
import { useAdminTableRowSelection } from "@/lib/hooks/use-admin-table-selection";
import { getSupplierOrderTotal } from "@/lib/supplier-order-costs";
import { formatSaleDateDisplay } from "@/lib/sale-date";
import { formatPrice } from "@/lib/utils";

const PER_PAGE = 10;

function renderOrderTableHeader(hasActions: boolean, showSelection: boolean) {
  return (
    <tr>
      {showSelection ? (
        <th className={ADMIN_TABLE_TH_CLASS}>
          <span className="sr-only">Seleccionar</span>
        </th>
      ) : null}
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Fecha</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Pedido</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Proveedor</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Estado</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Nro. Seguimiento</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Ítems</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Total</Typography>
      </th>
      {hasActions ? (
        <th className={ADMIN_TABLE_TH_CLASS}>
          <Typography variant="body2">Acciones</Typography>
        </th>
      ) : null}
    </tr>
  );
}

type AdminSupplierOrdersTableProps = {
  orders: SupplierOrder[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onViewDetails?: (order: SupplierOrder) => void;
  onEdit?: (order: SupplierOrder) => void;
  onExportToCatalog?: (order: SupplierOrder) => void;
  onDelete?: (order: SupplierOrder) => void;
  canExportToCatalog?: (order: SupplierOrder) => boolean;
  canDeleteOrder?: (order: SupplierOrder) => boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  tableFooter?: ReactNode;
};

function getOrderItemsLabel(order: SupplierOrder): string {
  const itemCount = order.items.length;
  const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return `${itemCount} ${itemCount === 1 ? "ítem" : "ítems"} · ${quantity} uds.`;
}

export default function AdminSupplierOrdersTable({
  orders,
  page,
  perPage,
  total,
  totalPages,
  onPageChange,
  onViewDetails,
  onEdit,
  onExportToCatalog,
  onDelete,
  canExportToCatalog,
  canDeleteOrder,
  selectedIds = [],
  onSelectionChange,
  tableFooter,
}: AdminSupplierOrdersTableProps) {
  const cellClass = ADMIN_TABLE_CELL_CLASS;
  const hasActions = Boolean(onViewDetails || onEdit || onExportToCatalog || onDelete);
  const visibleIds = orders.map((order) => order.id);
  const selectableVisibleIds = useMemo(
    () =>
      orders
        .filter((order) => !canDeleteOrder || canDeleteOrder(order))
        .map((order) => order.id),
    [orders, canDeleteOrder]
  );
  const {
    selectAllRef,
    allVisibleSelected,
    handleToggleRow,
    handleToggleAll,
    isRowSelected,
  } = useAdminTableRowSelection({
    visibleIds,
    selectedIds,
    onSelectionChange,
    selectableVisibleIds,
  });
  const colSpan = (onSelectionChange ? 1 : 0) + (hasActions ? 8 : 7);
  const isRowSelectable = (order: SupplierOrder) => !canDeleteOrder || canDeleteOrder(order);

  const getRowActions = (order: SupplierOrder): AdminTableMobileAction[] => {
    const actions: AdminTableMobileAction[] = [];

    if (onViewDetails) {
      actions.push({
        id: "view",
        label: "Ver detalles",
        icon: "visibility",
        onClick: () => onViewDetails(order),
      });
    }

    if (onEdit) {
      actions.push({
        id: "edit",
        label: "Editar",
        icon: "edit",
        onClick: () => onEdit(order),
      });
    }

    if (onExportToCatalog && (!canExportToCatalog || canExportToCatalog(order))) {
      actions.push({
        id: "export-catalog",
        label: "Exportar a catálogo",
        icon: "catalog",
        onClick: () => onExportToCatalog(order),
      });
    }

    if (onDelete && isRowSelectable(order)) {
      actions.push({
        id: "delete",
        label: "Eliminar",
        icon: "delete",
        onClick: () => onDelete(order),
        destructive: true,
      });
    }

    return actions;
  };

  const renderDesktopHeader = () => (
    <tr>
      {onSelectionChange ? (
        <AdminTableSelectAllHeader
          selectAllRef={selectAllRef}
          checked={allVisibleSelected}
          onChange={handleToggleAll}
        />
      ) : null}
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Fecha</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Pedido</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Proveedor</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Estado</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Nro. Seguimiento</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Ítems</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Total</Typography>
      </th>
      {hasActions ? (
        <th className={ADMIN_TABLE_TH_CLASS}>
          <Typography variant="body2">Acciones</Typography>
        </th>
      ) : null}
    </tr>
  );

  return (
    <Box display="flex" direction="col" gap="4" className="w-full min-w-0">
      {orders.length === 0 ? (
        <>
          <AdminTableMobileEmpty message="No hay pedidos" />
          <AdminTable>
            <thead className="bg-muted/50">
              {renderOrderTableHeader(hasActions, Boolean(onSelectionChange))}
            </thead>
            <tbody>
              <AdminTableEmptyRow colSpan={colSpan} message="No hay pedidos" />
            </tbody>
          </AdminTable>
        </>
      ) : (
        <>
          <AdminTableMobileList>
            {onSelectionChange && selectableVisibleIds.length > 0 ? (
              <AdminTableSelectAllMobileRow
                checked={allVisibleSelected}
                onChange={handleToggleAll}
              />
            ) : null}
            {orders.map((order, index) => (
              <AdminTableMobileCard
                key={order.id}
                selected={isRowSelected(order.id)}
                stripeIndex={index}
              >
                <Box display="flex" justify="between" align="start" gap="2" className="w-full min-w-0">
                  <Box display="flex" align="start" gap="2" className="min-w-0">
                    {onSelectionChange && isRowSelectable(order) ? (
                      <AdminTableRowCheckbox
                        checked={isRowSelected(order.id)}
                        onChange={() => handleToggleRow(order.id)}
                        label={`Seleccionar ${order.name}`}
                        className="mt-0.5"
                      />
                    ) : null}
                    {onViewDetails ? (
                      <AdminTextLink
                        tone="default"
                        onClick={() => onViewDetails(order)}
                        className="block min-w-0 text-left"
                      >
                        <Typography variant="body2" className="line-clamp-2">
                          {order.name}
                        </Typography>
                      </AdminTextLink>
                    ) : (
                      <Typography variant="body2" className="line-clamp-2">
                        {order.name}
                      </Typography>
                    )}
                  </Box>
                  {hasActions ? <AdminTableMobileActionsMenu actions={getRowActions(order)} /> : null}
                </Box>
                <AdminTableMobileSummary
                  left={
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span className="truncate">{order.supplier_name ?? "Sin proveedor"}</span>
                      <AdminSupplierOrderStatusBadge status={order.status} size="sm" />
                    </span>
                  }
                  right={formatPrice(getSupplierOrderTotal(order))}
                />
                <AdminTableMobileSubtext>
                  {formatSaleDateDisplay(order.created_at)} · {getOrderItemsLabel(order)}
                  {(order.tracking_number || order.tracking_link) && (
                    <>
                      {" · "}
                      <AdminSupplierOrderTrackingCell order={order} />
                    </>
                  )}
                </AdminTableMobileSubtext>
              </AdminTableMobileCard>
            ))}
          </AdminTableMobileList>

          <AdminTable>
            <thead className="bg-muted/50">{renderDesktopHeader()}</thead>
            <tbody>
              {orders.map((order, index) => (
                <tr
                  key={order.id}
                  className={adminTableRowClassName({
                    stripeIndex: index,
                    selected: isRowSelected(order.id),
                  })}
                >
                  {onSelectionChange ? (
                    <td className={cellClass}>
                      {isRowSelectable(order) ? (
                        <AdminTableRowCheckbox
                          checked={isRowSelected(order.id)}
                          onChange={() => handleToggleRow(order.id)}
                          label={`Seleccionar ${order.name}`}
                        />
                      ) : null}
                    </td>
                  ) : null}
                  <td className={cellClass}>
                    <Typography variant="body2" className="whitespace-nowrap">
                      {formatSaleDateDisplay(order.created_at)}
                    </Typography>
                  </td>
                  <td className={cellClass}>
                    {onViewDetails ? (
                      <AdminTextLink
                        tone="default"
                        onClick={() => onViewDetails(order)}
                        className="text-left"
                      >
                        <Typography variant="body2" as="span">
                          {order.name}
                        </Typography>
                      </AdminTextLink>
                    ) : (
                      <Typography variant="body2">{order.name}</Typography>
                    )}
                  </td>
                  <td className={cellClass}>
                    <Typography variant="body2">{order.supplier_name ?? "—"}</Typography>
                  </td>
                  <td className={cellClass}>
                    <AdminSupplierOrderStatusBadge status={order.status} />
                  </td>
                  <td className={cellClass}>
                    <AdminSupplierOrderTrackingCell order={order} />
                  </td>
                  <td className={cellClass}>
                    <Typography variant="body2">{getOrderItemsLabel(order)}</Typography>
                  </td>
                  <td className={cellClass}>
                    <Typography variant="body2" className="whitespace-nowrap tabular-nums">
                      {formatPrice(getSupplierOrderTotal(order))}
                    </Typography>
                  </td>
                  {hasActions ? (
                    <td className={ADMIN_TABLE_ACTIONS_CELL_CLASS}>
                      <AdminTableMobileActionsMenu actions={getRowActions(order)} />
                    </td>
                  ) : null}
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
