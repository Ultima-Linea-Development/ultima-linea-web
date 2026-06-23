"use client";

import { useMemo, type ReactNode } from "react";
import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import AdminTextLink from "@/components/admin/AdminTextLink";
import AdminCommissionStatusBadge from "@/components/admin/AdminCommissionStatusBadge";
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
import type { Commission, SaleAssignableUser } from "@/lib/api";
import { useAdminTableRowSelection } from "@/lib/hooks/use-admin-table-selection";
import { getCommissionSellerLabel } from "@/lib/commission-display";
import { formatSaleDateDisplay } from "@/lib/sale-date";
import { formatPrice } from "@/lib/utils";

const PER_PAGE = 10;

function renderCommissionTableHeader(hasActions: boolean, showSelection: boolean) {
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
        <Typography variant="body2">Cliente</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Vendedor</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Estado</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Productos</Typography>
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

type AdminCommissionsTableProps = {
  commissions: Commission[];
  assignableUsers: SaleAssignableUser[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onViewDetails?: (commission: Commission) => void;
  onEdit?: (commission: Commission) => void;
  onExport?: (commission: Commission) => void;
  onDelete?: (commission: Commission) => void;
  canDeleteCommission?: (commission: Commission) => boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  tableFooter?: ReactNode;
};

function getCommissionItemsLabel(commission: Commission): string {
  const itemCount = commission.items.length;
  const quantity = commission.items.reduce((sum, item) => sum + item.quantity, 0);
  return `${itemCount} ${itemCount === 1 ? "producto" : "productos"} · ${quantity} uds.`;
}

function getCommissionTotal(commission: Commission): number {
  return commission.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export default function AdminCommissionsTable({
  commissions,
  assignableUsers,
  page,
  perPage,
  total,
  totalPages,
  onPageChange,
  onViewDetails,
  onEdit,
  onExport,
  onDelete,
  canDeleteCommission,
  selectedIds = [],
  onSelectionChange,
  tableFooter,
}: AdminCommissionsTableProps) {
  const cellClass = ADMIN_TABLE_CELL_CLASS;
  const hasActions = Boolean(onViewDetails || onEdit || onExport || onDelete);
  const visibleIds = commissions.map((commission) => commission.id);
  const selectableVisibleIds = useMemo(
    () =>
      commissions
        .filter((commission) => !canDeleteCommission || canDeleteCommission(commission))
        .map((commission) => commission.id),
    [commissions, canDeleteCommission]
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
  const colSpan = (onSelectionChange ? 1 : 0) + (hasActions ? 7 : 6);
  const isRowSelectable = (commission: Commission) =>
    !canDeleteCommission || canDeleteCommission(commission);

  const getCommissionCustomerHandler = (commission: Commission) => {
    if (onEdit && commission.status !== "exported") {
      return () => onEdit(commission);
    }
    if (onViewDetails) {
      return () => onViewDetails(commission);
    }
    return undefined;
  };

  const getRowActions = (commission: Commission): AdminTableMobileAction[] => {
    const actions: AdminTableMobileAction[] = [];

    if (onViewDetails) {
      actions.push({
        id: "view",
        label: "Ver detalles",
        icon: "visibility",
        onClick: () => onViewDetails(commission),
      });
    }

    if (onEdit && commission.status !== "exported") {
      actions.push({
        id: "edit",
        label: "Editar",
        icon: "edit",
        onClick: () => onEdit(commission),
      });
    }

    if (onExport && commission.status === "pending") {
      actions.push({
        id: "export",
        label: "Exportar a pedido",
        icon: "orders",
        onClick: () => onExport(commission),
      });
    }

    if (onDelete && isRowSelectable(commission)) {
      actions.push({
        id: "delete",
        label: "Eliminar",
        icon: "delete",
        onClick: () => onDelete(commission),
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
        <Typography variant="body2">Cliente</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Vendedor</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Estado</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Productos</Typography>
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
      {commissions.length === 0 ? (
        <>
          <AdminTableMobileEmpty message="No hay encargos" />
          <AdminTable>
            <thead className="bg-muted/50">
              {renderCommissionTableHeader(hasActions, Boolean(onSelectionChange))}
            </thead>
            <tbody>
              <AdminTableEmptyRow colSpan={colSpan} message="No hay encargos" />
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
            {commissions.map((commission, index) => (
              <AdminTableMobileCard
                key={commission.id}
                selected={isRowSelected(commission.id)}
                stripeIndex={index}
              >
                <Box display="flex" justify="between" align="start" gap="2" className="w-full min-w-0">
                  <Box display="flex" align="start" gap="2" className="min-w-0">
                    {onSelectionChange && isRowSelectable(commission) ? (
                      <AdminTableRowCheckbox
                        checked={isRowSelected(commission.id)}
                        onChange={() => handleToggleRow(commission.id)}
                        label={`Seleccionar ${commission.customer_name}`}
                        className="mt-0.5"
                      />
                    ) : null}
                    {getCommissionCustomerHandler(commission) ? (
                      <AdminTextLink
                        tone="default"
                        onClick={getCommissionCustomerHandler(commission)}
                        className="block min-w-0 text-left"
                      >
                        <Typography variant="body2" className="line-clamp-2">
                          {commission.customer_name}
                        </Typography>
                      </AdminTextLink>
                    ) : (
                      <Typography variant="body2" className="line-clamp-2">
                        {commission.customer_name}
                      </Typography>
                    )}
                  </Box>
                  {hasActions ? (
                    <AdminTableMobileActionsMenu actions={getRowActions(commission)} />
                  ) : null}
                </Box>
                <AdminTableMobileSummary
                  left={
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span className="truncate">
                        {getCommissionSellerLabel(commission, assignableUsers)}
                      </span>
                      <AdminCommissionStatusBadge status={commission.status} size="sm" />
                    </span>
                  }
                  right={formatPrice(getCommissionTotal(commission))}
                />
                <AdminTableMobileSubtext>
                  {formatSaleDateDisplay(commission.created_at)} · {getCommissionItemsLabel(commission)}
                  {commission.supplier_order_name ? ` · ${commission.supplier_order_name}` : ""}
                </AdminTableMobileSubtext>
              </AdminTableMobileCard>
            ))}
          </AdminTableMobileList>

          <AdminTable>
            <thead className="bg-muted/50">{renderDesktopHeader()}</thead>
            <tbody>
              {commissions.map((commission, index) => (
                <tr
                  key={commission.id}
                  className={adminTableRowClassName({
                    stripeIndex: index,
                    selected: isRowSelected(commission.id),
                  })}
                >
                  {onSelectionChange ? (
                    <td className={cellClass}>
                      {isRowSelectable(commission) ? (
                        <AdminTableRowCheckbox
                          checked={isRowSelected(commission.id)}
                          onChange={() => handleToggleRow(commission.id)}
                          label={`Seleccionar ${commission.customer_name}`}
                        />
                      ) : null}
                    </td>
                  ) : null}
                  <td className={cellClass}>
                    <Typography variant="body2" className="whitespace-nowrap">
                      {formatSaleDateDisplay(commission.created_at)}
                    </Typography>
                  </td>
                  <td className={cellClass}>
                    {getCommissionCustomerHandler(commission) ? (
                      <AdminTextLink
                        tone="default"
                        onClick={getCommissionCustomerHandler(commission)}
                        className="text-left"
                      >
                        <Typography variant="body2" as="span">
                          {commission.customer_name}
                        </Typography>
                      </AdminTextLink>
                    ) : (
                      <Typography variant="body2">{commission.customer_name}</Typography>
                    )}
                  </td>
                  <td className={cellClass}>
                    <Typography variant="body2">
                      {getCommissionSellerLabel(commission, assignableUsers)}
                    </Typography>
                  </td>
                  <td className={cellClass}>
                    <AdminCommissionStatusBadge status={commission.status} />
                  </td>
                  <td className={cellClass}>
                    <Typography variant="body2">{getCommissionItemsLabel(commission)}</Typography>
                  </td>
                  <td className={cellClass}>
                    <Typography variant="body2" className="whitespace-nowrap tabular-nums">
                      {formatPrice(getCommissionTotal(commission))}
                    </Typography>
                  </td>
                  {hasActions ? (
                    <td className={ADMIN_TABLE_ACTIONS_CELL_CLASS}>
                      <AdminTableMobileActionsMenu actions={getRowActions(commission)} />
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
