"use client";

import { useState } from "react";
import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import Alert from "@/components/ui/Alert";
import { Button } from "@/components/ui/button";
import AdminDataLoading from "@/components/admin/AdminDataLoading";
import AdminHistoryTable from "@/components/admin/AdminHistoryTable";
import ConfirmDeleteModal from "@/components/admin/ConfirmDeleteModal";
import AdminTableBulkFooter from "@/components/admin/AdminTableBulkFooter";
import { ADMIN_PAGE_PADDING_CLASS } from "@/components/admin/AdminTable";
import { useAdminRole } from "@/components/admin/AdminRoleProvider";
import { useAdminHistoryPanel } from "@/lib/hooks/use-admin-history-panel";
import { isAdminRole } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { type AdminHistoryEntry } from "@/lib/api";

export default function AdminHistoryPage() {
  const role = useAdminRole();
  const canManage = isAdminRole(role);
  const panel = useAdminHistoryPanel();
  const [deleteConfirmEntry, setDeleteConfirmEntry] = useState<AdminHistoryEntry | null>(null);

  const closeDeleteConfirm = () => {
    setDeleteConfirmEntry(null);
    panel.setError("");
  };

  const confirmDeleteEntry = async () => {
    if (!deleteConfirmEntry) return;
    const deleted = await panel.deleteHistoryItem(deleteConfirmEntry);
    if (deleted) setDeleteConfirmEntry(null);
  };

  return (
    <Box display="flex" direction="col" gap="6" className="w-full min-w-0">
      <div className={cn("flex flex-col gap-6", ADMIN_PAGE_PADDING_CLASS)}>
        <Box display="flex" direction="col" gap="2">
          <Typography variant="h1">Historial</Typography>
          <Typography variant="body2" color="muted">
            Acciones registradas sobre catálogo, ventas, pedidos y encargos.
          </Typography>
        </Box>

        <Alert
          open={!!panel.error}
          message={panel.error}
          variant="destructive"
          onClose={() => panel.setError("")}
        />
        <Alert
          open={!!panel.success}
          message={panel.success}
          variant="default"
          onClose={() => panel.setSuccess("")}
        />
        <Alert
          open={!!panel.bulkError}
          message={panel.bulkError}
          variant="destructive"
          onClose={() => panel.setBulkError("")}
        />
      </div>

      <ConfirmDeleteModal
        open={!!deleteConfirmEntry}
        onClose={closeDeleteConfirm}
        title="Eliminar ítem de historial"
        message={
          <>
            Estás seguro que deseas eliminar el registro{" "}
            <strong>{deleteConfirmEntry?.resource_label ?? "seleccionado"}</strong> del historial?
          </>
        }
        error={panel.error}
        actions={[
          {
            label: "Eliminar",
            variant: "delete",
            onClick: confirmDeleteEntry,
            disabled: panel.isSubmitting,
          },
          {
            label: "Cancelar",
            variant: "outline",
            onClick: closeDeleteConfirm,
            disabled: panel.isSubmitting,
          },
        ]}
      />

      <ConfirmDeleteModal
        open={!!panel.bulkConfirmIds?.length}
        onClose={() => {
          panel.setBulkConfirmIds(null);
          panel.setBulkError("");
        }}
        title="Eliminar ítems de historial"
        message={
          <>
            Estás seguro que deseas eliminar {panel.bulkConfirmIds?.length ?? 0} ítem
            {panel.bulkConfirmIds?.length === 1 ? "" : "s"} de historial?
          </>
        }
        error={panel.bulkError}
        actions={[
          {
            label: "Eliminar",
            variant: "delete",
            onClick: panel.deleteSelectedHistoryItems,
            disabled: panel.isSubmitting,
          },
          {
            label: "Cancelar",
            variant: "outline",
            onClick: () => {
              panel.setBulkConfirmIds(null);
              panel.setBulkError("");
            },
            disabled: panel.isSubmitting,
          },
        ]}
      />

      {panel.isLoading ? (
        <div className={ADMIN_PAGE_PADDING_CLASS}>
          <AdminDataLoading />
        </div>
      ) : (
        <AdminHistoryTable
          entries={panel.entries}
          page={panel.page}
          perPage={panel.perPage}
          total={panel.total}
          totalPages={panel.totalPages}
          onPageChange={panel.setPage}
          canManage={canManage}
          isSubmitting={panel.isSubmitting}
          onDelete={(entry) => {
            setDeleteConfirmEntry(entry);
            panel.setError("");
          }}
          onRestoreProduct={panel.restoreProduct}
          selectedIds={panel.selectedIds}
          onSelectionChange={canManage ? panel.setSelectedIds : undefined}
          tableFooter={
            <AdminTableBulkFooter
              selectedCount={panel.selectedIds.length}
              isSubmitting={panel.isSubmitting}
              onCancelSelection={() => {
                panel.setSelectedIds([]);
                panel.setBulkError("");
              }}
            >
              <Button
                type="button"
                variant="delete"
                size="sm"
                onClick={() => {
                  if (panel.selectedIds.length === 0) return;
                  panel.setBulkConfirmIds([...panel.selectedIds]);
                  panel.setBulkError("");
                }}
                disabled={panel.isSubmitting}
              >
                Eliminar
              </Button>
            </AdminTableBulkFooter>
          }
        />
      )}
    </Box>
  );
}
