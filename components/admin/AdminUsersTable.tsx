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
  AdminTableMobileSubtext,
  AdminTablePagination,
  ADMIN_TABLE_ACTIONS_CELL_CLASS,
  ADMIN_TABLE_CELL_CLASS,
  ADMIN_TABLE_TH_CLASS,
  adminTableRowClassName,
} from "@/components/admin/AdminTable";
import type { AdminUser } from "@/lib/api";
import { useAdminTableRowSelection } from "@/lib/hooks/use-admin-table-selection";
import { formatUserRole } from "@/lib/roles";
import { formatSaleDateDisplay } from "@/lib/sale-date";

const PER_PAGE = 10;

type AdminUsersTableProps = {
  users: AdminUser[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEdit?: (user: AdminUser) => void;
  onDelete?: (user: AdminUser) => void;
  canSelectUser?: (user: AdminUser) => boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  tableFooter?: ReactNode;
};

function formatUserName(user: AdminUser) {
  const name = `${user.first_name} ${user.last_name}`.trim();
  return name || "—";
}

function renderUsersTableHeader(hasActions: boolean, showSelection: boolean) {
  return (
    <tr>
      {showSelection ? (
        <th className={ADMIN_TABLE_TH_CLASS}>
          <span className="sr-only">Seleccionar</span>
        </th>
      ) : null}
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Nombre</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Email</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Teléfono</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Rol</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Creado</Typography>
      </th>
      {hasActions ? (
        <th className={ADMIN_TABLE_TH_CLASS}>
          <Typography variant="body2">Acciones</Typography>
        </th>
      ) : null}
    </tr>
  );
}

export default function AdminUsersTable({
  users,
  page,
  perPage,
  total,
  totalPages,
  onPageChange,
  onEdit,
  onDelete,
  canSelectUser,
  selectedIds = [],
  onSelectionChange,
  tableFooter,
}: AdminUsersTableProps) {
  const cellClass = ADMIN_TABLE_CELL_CLASS;
  const hasActions = Boolean(onEdit || onDelete);
  const visibleIds = users.map((user) => user.id);
  const selectableVisibleIds = useMemo(
    () =>
      users
        .filter((user) => !canSelectUser || canSelectUser(user))
        .map((user) => user.id),
    [users, canSelectUser]
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
  const colSpan = (onSelectionChange ? 1 : 0) + (hasActions ? 6 : 5);
  const isRowSelectable = (user: AdminUser) => !canSelectUser || canSelectUser(user);

  const getRowActions = (user: AdminUser): AdminTableMobileAction[] => {
    const actions: AdminTableMobileAction[] = [];

    if (onEdit) {
      actions.push({
        id: "edit",
        label: "Editar",
        icon: "edit",
        onClick: () => onEdit(user),
      });
    }

    if (onDelete && isRowSelectable(user)) {
      actions.push({
        id: "delete",
        label: "Eliminar",
        icon: "delete",
        onClick: () => onDelete(user),
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
        <Typography variant="body2">Nombre</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Email</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Teléfono</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Rol</Typography>
      </th>
      <th className={ADMIN_TABLE_TH_CLASS}>
        <Typography variant="body2">Creado</Typography>
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
      {users.length === 0 ? (
        <>
          <AdminTableMobileEmpty message="No hay usuarios" />
          <AdminTable>
            <thead className="bg-muted/50">
              {renderUsersTableHeader(hasActions, Boolean(onSelectionChange))}
            </thead>
            <tbody>
              <AdminTableEmptyRow colSpan={colSpan} message="No hay usuarios" />
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
            {users.map((user, index) => (
              <AdminTableMobileCard
                key={user.id}
                selected={isRowSelected(user.id)}
                stripeIndex={index}
              >
                <Box display="flex" justify="between" align="start" gap="2" className="w-full min-w-0">
                  <Box display="flex" align="start" gap="2" className="min-w-0">
                    {onSelectionChange && isRowSelectable(user) ? (
                      <AdminTableRowCheckbox
                        checked={isRowSelected(user.id)}
                        onChange={() => handleToggleRow(user.id)}
                        label={`Seleccionar ${formatUserName(user)}`}
                        className="mt-0.5"
                      />
                    ) : null}
                    <Typography variant="body2" className="min-w-0 font-medium leading-snug">
                      {formatUserName(user)}
                    </Typography>
                  </Box>
                  {hasActions ? <AdminTableMobileActionsMenu actions={getRowActions(user)} /> : null}
                </Box>
                <Typography variant="caption" className="block break-all leading-snug text-foreground/80">
                  {user.email}
                </Typography>
                <AdminTableMobileSubtext>
                  {formatUserRole(user.role)}
                  {" · "}
                  {formatSaleDateDisplay(user.created_at)}
                  {user.phone ? ` · ${user.phone}` : ""}
                </AdminTableMobileSubtext>
              </AdminTableMobileCard>
            ))}
          </AdminTableMobileList>

          <AdminTable>
            <thead className="bg-muted/50">{renderDesktopHeader()}</thead>
            <tbody>
              {users.map((user, index) => (
                <tr
                  key={user.id}
                  className={adminTableRowClassName({
                    stripeIndex: index,
                    selected: isRowSelected(user.id),
                  })}
                >
                  {onSelectionChange ? (
                    <td className={cellClass}>
                      {isRowSelectable(user) ? (
                        <AdminTableRowCheckbox
                          checked={isRowSelected(user.id)}
                          onChange={() => handleToggleRow(user.id)}
                          label={`Seleccionar ${formatUserName(user)}`}
                        />
                      ) : null}
                    </td>
                  ) : null}
                  <td className={cellClass}>
                    <Typography variant="body2">{formatUserName(user)}</Typography>
                  </td>
                  <td className={cellClass}>
                    <Typography variant="body2" className="break-all">
                      {user.email}
                    </Typography>
                  </td>
                  <td className={cellClass}>
                    <Typography variant="body2">{user.phone || "—"}</Typography>
                  </td>
                  <td className={cellClass}>
                    <Typography variant="body2">{formatUserRole(user.role)}</Typography>
                  </td>
                  <td className={cellClass}>
                    <Typography variant="body2">
                      {formatSaleDateDisplay(user.created_at)}
                    </Typography>
                  </td>
                  {hasActions ? (
                    <td className={ADMIN_TABLE_ACTIONS_CELL_CLASS}>
                      <AdminTableMobileActionsMenu actions={getRowActions(user)} />
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
