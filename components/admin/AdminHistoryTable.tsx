"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import AdminTableMobileActionsMenu, {
  type AdminTableMobileAction,
} from "@/components/admin/AdminTableMobileActionsMenu";
import {
  AdminTable,
  AdminTableEmptyRow,
  AdminTableMobileCard,
  AdminTableMobileEmpty,
  AdminTableMobileField,
  AdminTableMobileList,
  AdminTableMobileSummary,
  AdminTablePagination,
  ADMIN_TABLE_ACTIONS_CELL_CLASS,
  ADMIN_TABLE_CELL_CLASS,
  ADMIN_TABLE_TH_CLASS,
  adminTableRowClassName,
} from "@/components/admin/AdminTable";
import type { AdminHistoryAction, AdminHistoryEntry, AdminHistoryResource } from "@/lib/api";

type AdminHistoryTableProps = {
  entries: AdminHistoryEntry[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  canManage: boolean;
  isSubmitting?: boolean;
  onDelete: (entry: AdminHistoryEntry) => void;
  onRestoreProduct: (entry: AdminHistoryEntry) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  tableFooter?: ReactNode;
};

const actionLabels: Record<AdminHistoryAction, string> = {
  create: "Creó",
  update: "Modificó",
  delete: "Eliminó",
  restore: "Restauró",
};

const resourceLabels: Record<AdminHistoryResource, string> = {
  product: "Producto",
  sale: "Venta",
  supplier_order: "Pedido",
  commission: "Encargo",
};

function formatHistoryDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function canRestoreProduct(entry: AdminHistoryEntry): boolean {
  return entry.resource === "product" && entry.action === "delete";
}

function getActorLabel(entry: AdminHistoryEntry): string {
  return entry.actor_email || entry.actor_id;
}

export default function AdminHistoryTable({
  entries,
  page,
  perPage,
  total,
  totalPages,
  onPageChange,
  canManage,
  isSubmitting = false,
  onDelete,
  onRestoreProduct,
  selectedIds = [],
  onSelectionChange,
  tableFooter,
}: AdminHistoryTableProps) {
  const selectedSet = new Set(selectedIds);
  const visibleIds = entries.map((entry) => entry.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedSet.has(id));
  const selectAllRef = useRef<HTMLInputElement>(null);
  const colSpan = (onSelectionChange ? 1 : 0) + (canManage ? 6 : 5);

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
  }, [someVisibleSelected, allVisibleSelected]);

  const handleToggleRow = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedSet.has(id)) {
      onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
      return;
    }
    onSelectionChange([...selectedIds, id]);
  };

  const handleToggleAll = () => {
    if (!onSelectionChange) return;
    if (allVisibleSelected) {
      onSelectionChange(selectedIds.filter((id) => !visibleIds.includes(id)));
      return;
    }
    onSelectionChange(Array.from(new Set([...selectedIds, ...visibleIds])));
  };

  const renderActions = (entry: AdminHistoryEntry) => {
    if (!canManage) return null;

    const actions: AdminTableMobileAction[] = [];
    if (canRestoreProduct(entry)) {
      actions.push({
        id: "restore",
        label: "Restaurar",
        icon: "rollback",
        onClick: () => onRestoreProduct(entry),
        disabled: isSubmitting,
      });
    }

    actions.push({
      id: "delete",
      label: "Eliminar",
      icon: "delete",
      onClick: () => onDelete(entry),
      disabled: isSubmitting,
      destructive: true,
    });

    return <AdminTableMobileActionsMenu actions={actions} />;
  };

  const renderHeader = () => (
    <tr>
      {onSelectionChange ? (
        <th className={ADMIN_TABLE_TH_CLASS}>
          <input
            ref={selectAllRef}
            type="checkbox"
            checked={allVisibleSelected}
            onChange={handleToggleAll}
            aria-label="Seleccionar todos"
            className="size-4 cursor-pointer"
          />
        </th>
      ) : null}
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Fecha</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Usuario</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Acción</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Recurso</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Detalle</Typography>
      </th>
      {canManage ? (
        <th className={ADMIN_TABLE_TH_CLASS}>
          <Typography variant="body2">Acciones</Typography>
        </th>
      ) : null}
    </tr>
  );

  return (
    <Box display="flex" direction="col" gap="4" className="w-full min-w-0">
      {entries.length === 0 ? (
        <>
          <AdminTableMobileEmpty message="No hay acciones registradas" />
          <AdminTable>
            <thead className="bg-muted/50">{renderHeader()}</thead>
            <tbody>
              <AdminTableEmptyRow colSpan={colSpan} message="No hay acciones registradas" />
            </tbody>
          </AdminTable>
        </>
      ) : (
        <>
          <AdminTableMobileList>
            {onSelectionChange ? (
              <Box
                display="flex"
                className="items-center gap-3 bg-muted/30 px-3 py-2.5 sm:px-4 sm:py-3"
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
            ) : null}
            {entries.map((entry, index) => (
              <AdminTableMobileCard
                key={entry.id}
                selected={selectedSet.has(entry.id)}
                stripeIndex={index}
              >
                <Box display="flex" justify="between" gap="3" className="items-start">
                  <Box display="flex" align="start" gap="2" className="min-w-0">
                    {onSelectionChange ? (
                      <input
                        type="checkbox"
                        checked={selectedSet.has(entry.id)}
                        onChange={() => handleToggleRow(entry.id)}
                        aria-label={`Seleccionar ${entry.resource_label}`}
                        className="mt-0.5 size-4 shrink-0 cursor-pointer"
                      />
                    ) : null}
                    <Box display="flex" direction="col" gap="1" className="min-w-0">
                      <Typography variant="body2" className="font-medium">
                        {entry.resource_label}
                      </Typography>
                      <AdminTableMobileSummary
                        left={`${actionLabels[entry.action]} ${resourceLabels[entry.resource]}`}
                        right={formatHistoryDate(entry.created_at)}
                      />
                    </Box>
                  </Box>
                  {renderActions(entry)}
                </Box>
                <AdminTableMobileField label="Usuario">
                  {getActorLabel(entry)}
                </AdminTableMobileField>
              </AdminTableMobileCard>
            ))}
          </AdminTableMobileList>

          <AdminTable>
            <thead className="bg-muted/50">{renderHeader()}</thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr
                  key={entry.id}
                  className={adminTableRowClassName({
                    stripeIndex: index,
                    selected: selectedSet.has(entry.id),
                  })}
                >
                  {onSelectionChange ? (
                    <td className={ADMIN_TABLE_CELL_CLASS}>
                      <input
                        type="checkbox"
                        checked={selectedSet.has(entry.id)}
                        onChange={() => handleToggleRow(entry.id)}
                        aria-label={`Seleccionar ${entry.resource_label}`}
                        className="size-4 cursor-pointer"
                      />
                    </td>
                  ) : null}
                  <td className={ADMIN_TABLE_CELL_CLASS}>
                    <Typography variant="body2" className="whitespace-nowrap">
                      {formatHistoryDate(entry.created_at)}
                    </Typography>
                  </td>
                  <td className={ADMIN_TABLE_CELL_CLASS}>
                    <Typography variant="body2">{getActorLabel(entry)}</Typography>
                  </td>
                  <td className={ADMIN_TABLE_CELL_CLASS}>
                    <Typography variant="body2">{actionLabels[entry.action]}</Typography>
                  </td>
                  <td className={ADMIN_TABLE_CELL_CLASS}>
                    <Typography variant="body2">{resourceLabels[entry.resource]}</Typography>
                  </td>
                  <td className={ADMIN_TABLE_CELL_CLASS}>
                    <Typography variant="body2">{entry.resource_label}</Typography>
                  </td>
                  {canManage ? (
                    <td className={ADMIN_TABLE_ACTIONS_CELL_CLASS}>
                      {renderActions(entry)}
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
