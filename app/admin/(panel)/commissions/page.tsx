"use client";

import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import Alert from "@/components/ui/Alert";
import Modal from "@/components/ui/Modal";
import AdminCommissionDetail from "@/components/admin/AdminCommissionDetail";
import AdminCommissionEditForm from "@/components/admin/AdminCommissionEditForm";
import AdminCommissionExportModal from "@/components/admin/AdminCommissionExportModal";
import AdminCommissionForm from "@/components/admin/AdminCommissionForm";
import AdminTableSkeleton from "@/components/admin/AdminTableSkeleton";
import AdminCommissionsTable, { PER_PAGE } from "@/components/admin/AdminCommissionsTable";
import { ADMIN_PAGE_PADDING_CLASS } from "@/components/admin/AdminTable";
import AdminSearchInput from "@/components/admin/AdminSearchInput";
import AdminCommissionSearchSuggestion from "@/components/admin/AdminCommissionSearchSuggestion";
import ConfirmDeleteModal from "@/components/admin/ConfirmDeleteModal";
import AdminTableBulkFooter from "@/components/admin/AdminTableBulkFooter";
import { Button } from "@/components/ui/button";
import { useAdminCommissionsPanel } from "@/lib/hooks/use-admin-commissions-panel";
import { cn } from "@/lib/utils";

export default function AdminCommissionsPage() {
  const panel = useAdminCommissionsPanel();

  return (
    <Box display="flex" direction="col" gap="6" className="w-full min-w-0">
      <div className={cn("flex flex-col gap-6", ADMIN_PAGE_PADDING_CLASS)}>
        <Box display="flex" className="items-center justify-between flex-wrap gap-4">
          <Typography variant="h1">Encargos</Typography>
          <Button type="button" onClick={() => panel.setShowCommissionForm(true)}>
            Agregar encargo
          </Button>
        </Box>

        <AdminSearchInput
          value={panel.searchInput}
          onChange={panel.setSearchInput}
          onClear={panel.clearSearch}
          onSubmit={panel.applySearchFromQuery}
          onSuggestionSelect={(commission) =>
            panel.applySearchFromQuery(panel.getCommissionLabel(commission))
          }
          suggestions={panel.searchInput.trim() ? panel.searchSuggestions : []}
          getSuggestionKey={(commission) => commission.id}
          renderSuggestion={(commission) => (
            <AdminCommissionSearchSuggestion
              commission={commission}
              products={panel.products}
              assignableUsers={panel.assignableUsers}
            />
          )}
          emptyMessage="No hay encargos"
          listboxId="commissions-search-listbox"
          placeholder="Buscar por cliente, vendedor, producto..."
        />

        <Alert open={!!panel.error} message={panel.error} variant="destructive" onClose={() => panel.setError("")} />
        <Alert open={!!panel.success} message={panel.success} variant="default" onClose={() => panel.setSuccess("")} />
        <Alert
          open={!!panel.deleteToast}
          message={panel.deleteToast}
          variant="default"
          duration={panel.undoDuration}
          onClose={panel.dismissDeleteToast}
          onUndo={panel.undoDelete}
        />
        <Alert
          open={!!panel.bulkError}
          message={panel.bulkError}
          variant="destructive"
          onClose={() => panel.setBulkError("")}
        />
      </div>

      {panel.showCommissionForm && (
        <Modal
          open={panel.showCommissionForm}
          onClose={() => {
            if (panel.isSubmitting) return;
            panel.setShowCommissionForm(false);
          }}
          title="Agregar encargo"
          className="max-w-4xl"
        >
          <AdminCommissionForm
            products={panel.products}
            assignableUsers={panel.assignableUsers}
            externalSellers={panel.externalSellers}
            currentUserId={panel.getCurrentUserId()}
            canAssignUser={panel.isAdmin}
            isSubmitting={panel.isSubmitting}
            onCreate={panel.handleCreateCommission}
            onCancel={() => panel.setShowCommissionForm(false)}
            onError={(message) => {
              panel.setSuccess("");
              panel.setError(message);
            }}
          />
        </Modal>
      )}

      {panel.viewingCommission && (
        <Modal
          open={!!panel.viewingCommission}
          onClose={() => panel.setViewingCommission(null)}
          title={panel.viewingCommission.customer_name}
          className="max-w-5xl"
        >
          <AdminCommissionDetail
            commission={panel.viewingCommission}
            assignableUsers={panel.assignableUsers}
            onEdit={(commission) => {
              panel.setViewingCommission(null);
              panel.setEditError("");
              panel.setEditingCommission(commission);
            }}
            onExport={(commission) => {
              panel.setViewingCommission(null);
              panel.setExportError("");
              panel.setExportingCommission(commission);
            }}
          />
        </Modal>
      )}

      {panel.editingCommission && (
        <Modal
          open={!!panel.editingCommission}
          onClose={() => {
            if (panel.isEditSubmitting) return;
            panel.setEditError("");
            panel.setEditingCommission(null);
          }}
          title="Editar encargo"
          className="max-w-4xl"
        >
          <AdminCommissionEditForm
            commission={panel.editingCommission}
            products={panel.products}
            assignableUsers={panel.assignableUsers}
            externalSellers={panel.externalSellers}
            currentUserId={panel.getCurrentUserId()}
            canAssignUser={panel.isAdmin}
            isSubmitting={panel.isEditSubmitting}
            onSave={panel.handleSaveEdit}
            onCancel={() => {
              if (panel.isEditSubmitting) return;
              panel.setEditError("");
              panel.setEditingCommission(null);
            }}
            onError={(message) => panel.setEditError(message)}
          />
          {panel.editError && (
            <Box className="mt-4">
              <Alert
                open={!!panel.editError}
                message={panel.editError}
                variant="destructive"
                onClose={() => panel.setEditError("")}
              />
            </Box>
          )}
        </Modal>
      )}

      {panel.exportingCommission && (
        <Modal
          open={!!panel.exportingCommission}
          onClose={() => {
            if (panel.isExportSubmitting) return;
            panel.setExportError("");
            panel.setExportingCommission(null);
          }}
          title="Exportar encargo a pedido"
          className="max-w-lg"
        >
          <AdminCommissionExportModal
            commission={panel.exportingCommission}
            orders={panel.orders}
            isSubmitting={panel.isExportSubmitting}
            onExport={panel.handleExportCommission}
            onCancel={() => {
              if (panel.isExportSubmitting) return;
              panel.setExportError("");
              panel.setExportingCommission(null);
            }}
          />
          {panel.exportError && (
            <Box className="mt-4">
              <Alert
                open={!!panel.exportError}
                message={panel.exportError}
                variant="destructive"
                onClose={() => panel.setExportError("")}
              />
            </Box>
          )}
        </Modal>
      )}

      <ConfirmDeleteModal
        open={!!panel.deleteConfirmCommission}
        onClose={() => {
          panel.setDeleteConfirmCommission(null);
          panel.setDeleteError("");
        }}
        title="Eliminar encargo"
        message="Estás seguro que deseas eliminar este encargo?"
        error={panel.deleteError}
        actions={[
          {
            label: "Eliminar",
            variant: "delete",
            onClick: panel.handleConfirmDelete,
            disabled: panel.isDeleteSubmitting,
            loadingLabel: "...",
          },
          {
            label: "Cancelar",
            variant: "ghost",
            onClick: () => {
              panel.setDeleteConfirmCommission(null);
              panel.setDeleteError("");
            },
            disabled: panel.isDeleteSubmitting,
          },
        ]}
      />

      <ConfirmDeleteModal
        open={!!panel.bulkConfirmIds?.length}
        onClose={() => {
          panel.setBulkConfirmIds(null);
          panel.setBulkError("");
        }}
        title="Eliminar encargos"
        message={
          <>
            Estás seguro que deseas eliminar {panel.bulkConfirmIds?.length ?? 0} encargo
            {panel.bulkConfirmIds?.length === 1 ? "" : "s"}?
          </>
        }
        error={panel.bulkError}
        actions={[
          {
            label: "Eliminar",
            variant: "delete",
            onClick: panel.handleBulkDeleteConfirm,
            disabled: panel.isBulkSubmitting,
            loadingLabel: "...",
          },
          {
            label: "Cancelar",
            variant: "outline",
            onClick: () => {
              panel.setBulkConfirmIds(null);
              panel.setBulkError("");
            },
            disabled: panel.isBulkSubmitting,
          },
        ]}
      />

      <div className="w-full min-w-0">
        {panel.isDataLoading ? (
          <AdminTableSkeleton variant="sales" showSelection />
        ) : (
          <AdminCommissionsTable
            commissions={panel.commissions}
            assignableUsers={panel.assignableUsers}
            page={panel.currentPage}
            perPage={PER_PAGE}
            total={panel.total}
            totalPages={panel.totalPages}
            onPageChange={panel.setPage}
            onViewDetails={panel.setViewingCommission}
            onEdit={(commission) => {
              panel.setEditError("");
              panel.setEditingCommission(commission);
            }}
            onExport={(commission) => {
              panel.setExportError("");
              panel.setExportingCommission(commission);
            }}
            onDelete={(commission) => {
              panel.setDeleteConfirmCommission(commission);
              panel.setDeleteError("");
            }}
            canDeleteCommission={panel.canDeleteCommission}
            selectedIds={panel.selectedIds}
            onSelectionChange={panel.setSelectedIds}
            tableFooter={
              <AdminTableBulkFooter
                selectedCount={panel.selectedIds.length}
                isSubmitting={panel.isBulkSubmitting}
                onCancelSelection={panel.clearSelection}
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
                  disabled={panel.isBulkSubmitting}
                >
                  Eliminar
                </Button>
              </AdminTableBulkFooter>
            }
          />
        )}
      </div>
    </Box>
  );
}
