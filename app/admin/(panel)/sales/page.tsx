"use client";

import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import Alert from "@/components/ui/Alert";
import Modal from "@/components/ui/Modal";
import AdminSaleDetail from "@/components/admin/AdminSaleDetail";
import AdminSaleEditForm from "@/components/admin/AdminSaleEditForm";
import AdminSaleForm from "@/components/admin/AdminSaleForm";
import AdminTableSkeleton from "@/components/admin/AdminTableSkeleton";
import AdminSalesTable, { PER_PAGE } from "@/components/admin/AdminSalesTable";
import { ADMIN_PAGE_PADDING_CLASS } from "@/components/admin/AdminTable";
import AdminSearchInput from "@/components/admin/AdminSearchInput";
import AdminSaleSearchSuggestion from "@/components/admin/AdminSaleSearchSuggestion";
import ConfirmDeleteModal from "@/components/admin/ConfirmDeleteModal";
import AdminTableBulkFooter from "@/components/admin/AdminTableBulkFooter";
import { getSalePrimaryProductName } from "@/lib/sale-items";
import { Button } from "@/components/ui/button";
import { useAdminSalesPanel } from "@/lib/hooks/use-admin-sales-panel";
import { cn } from "@/lib/utils";

export default function AdminSalesPage() {
  const panel = useAdminSalesPanel();

  return (
    <Box display="flex" direction="col" gap="6" className="w-full min-w-0">
      <div className={cn("flex flex-col gap-6", ADMIN_PAGE_PADDING_CLASS)}>
      <Box display="flex" className="items-center justify-between flex-wrap gap-4">
        <Typography variant="h1">Ventas</Typography>
        <Button type="button" onClick={() => panel.setShowSaleForm(true)}>
          Agregar venta
        </Button>
      </Box>

      <AdminSearchInput
        value={panel.searchInput}
        onChange={panel.setSearchInput}
        onClear={panel.clearSearch}
        onSubmit={panel.applySearchFromQuery}
        onSuggestionSelect={(sale) => panel.applySearchFromQuery(getSalePrimaryProductName(sale))}
        suggestions={panel.searchInput.trim() ? panel.searchSuggestions : []}
        getSuggestionKey={(sale) => sale.id}
        renderSuggestion={(sale) => (
          <AdminSaleSearchSuggestion sale={sale} products={panel.products} />
        )}
        emptyMessage="No hay ventas"
        listboxId="sales-search-listbox"
        placeholder="Buscar por producto, vendedor, alias o talle..."
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

      {panel.showSaleForm && (
        <Modal
          open={panel.showSaleForm}
          onClose={() => {
            if (panel.isSubmitting) return;
            panel.setShowSaleForm(false);
          }}
          title="Agregar venta"
          className="max-w-3xl"
        >
          <AdminSaleForm
            products={panel.products}
            assignableUsers={panel.assignableUsers}
            externalSellers={panel.externalSellers}
            currentUserId={panel.getCurrentUserId()}
            canAssignUser={panel.isAdmin}
            isSubmitting={panel.isSubmitting}
            onCreate={panel.handleCreateSale}
            onCancel={() => panel.setShowSaleForm(false)}
            onError={(message) => {
              panel.setSuccess("");
              panel.setError(message);
            }}
          />
        </Modal>
      )}

      {panel.viewingSale && (
        <Modal
          open={!!panel.viewingSale}
          onClose={() => panel.setViewingSale(null)}
          title="Detalle de venta"
          className="max-w-2xl"
        >
          <AdminSaleDetail
            sale={panel.viewingSale}
            products={panel.products}
            assignableUsers={panel.assignableUsers}
          />
        </Modal>
      )}

      {panel.editingSale && (
        <Modal
          open={!!panel.editingSale}
          onClose={() => {
            if (panel.isEditSubmitting) return;
            panel.setEditError("");
            panel.setEditingSale(null);
          }}
          title="Editar venta"
          className="max-w-3xl"
        >
          <AdminSaleEditForm
            sale={panel.editingSale}
            products={panel.products}
            assignableUsers={panel.assignableUsers}
            externalSellers={panel.externalSellers}
            currentUserId={panel.getCurrentUserId()}
            canAssignUser={panel.isAdmin}
            isSubmitting={panel.isEditSubmitting}
            error={panel.editError}
            onSave={panel.handleSaveEdit}
            onCancel={() => {
              if (panel.isEditSubmitting) return;
              panel.setEditError("");
              panel.setEditingSale(null);
            }}
          />
        </Modal>
      )}

      <ConfirmDeleteModal
        open={!!panel.deleteConfirmSale}
        onClose={() => {
          panel.setDeleteConfirmSale(null);
          panel.setDeleteError("");
        }}
        title="Eliminar venta"
        message="Estás seguro que deseas eliminar esta venta?"
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
              panel.setDeleteConfirmSale(null);
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
        title="Eliminar ventas"
        message={
          <>
            Estás seguro que deseas eliminar {panel.bulkConfirmIds?.length ?? 0} venta
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
          <AdminSalesTable
            sales={panel.sales}
            products={panel.products}
            assignableUsers={panel.assignableUsers}
            page={panel.currentPage}
            perPage={PER_PAGE}
            total={panel.total}
            totalPages={panel.totalPages}
            onPageChange={panel.setPage}
            onViewDetails={panel.setViewingSale}
            onEdit={(sale) => {
              panel.setEditError("");
              panel.setEditingSale(sale);
            }}
            onDelete={(sale) => {
              panel.setDeleteConfirmSale(sale);
              panel.setDeleteError("");
            }}
            canDeleteSale={panel.canDeleteSale}
            selectedIds={panel.selectedIds}
            onSelectionChange={panel.setSelectedIds}
            tableFooter={
              <AdminTableBulkFooter
                selectedCount={panel.selectedIds.length}
                isSubmitting={panel.isBulkSubmitting}
                onCancelSelection={() => {
                  panel.clearSelection();
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
