"use client";

import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import Alert from "@/components/ui/Alert";
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import AdminTableSkeleton from "@/components/admin/AdminTableSkeleton";
import AdminUsersTable, { PER_PAGE } from "@/components/admin/AdminUsersTable";
import { ADMIN_PAGE_PADDING_CLASS } from "@/components/admin/AdminTable";
import AdminSearchInput from "@/components/admin/AdminSearchInput";
import AdminUserSearchSuggestion from "@/components/admin/AdminUserSearchSuggestion";
import AdminUserForm from "@/components/admin/AdminUserForm";
import AdminUserEditForm from "@/components/admin/AdminUserEditForm";
import ConfirmDeleteModal from "@/components/admin/ConfirmDeleteModal";
import AdminTableBulkFooter from "@/components/admin/AdminTableBulkFooter";
import { useAdminUsersPanel } from "@/lib/hooks/use-admin-users-panel";
import { cn } from "@/lib/utils";

export default function AdminUsersPage() {
  const panel = useAdminUsersPanel();

  return (
    <Box display="flex" direction="col" gap="6" className="w-full min-w-0">
      <div className={cn("flex flex-col gap-6", ADMIN_PAGE_PADDING_CLASS)}>
      <Box display="flex" className="items-center justify-between flex-wrap gap-4">
        <Typography variant="h1">Usuarios</Typography>
        <Button
          type="button"
          onClick={() => {
            panel.setCreateError("");
            panel.setShowCreateModal(true);
          }}
        >
          Agregar usuario
        </Button>
      </Box>

      <AdminSearchInput
        value={panel.searchInput}
        onChange={panel.setSearchInput}
        onClear={panel.clearSearch}
        onSubmit={panel.applySearchFromQuery}
        onSuggestionSelect={(user) =>
          panel.applySearchFromQuery(`${user.first_name} ${user.last_name}`.trim() || user.email)
        }
        suggestions={panel.searchInput.trim() ? panel.searchSuggestions : []}
        getSuggestionKey={(user) => user.id}
        renderSuggestion={(user) => <AdminUserSearchSuggestion user={user} />}
        emptyMessage="No hay usuarios"
        listboxId="users-search-listbox"
        placeholder="Buscar por nombre, email o teléfono..."
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

      {panel.showCreateModal && (
        <Modal
          open={panel.showCreateModal}
          onClose={() => {
            if (panel.isSubmitting) return;
            panel.setCreateError("");
            panel.setShowCreateModal(false);
          }}
          title="Agregar usuario"
        >
          <AdminUserForm
            isSubmitting={panel.isSubmitting}
            error={panel.createError}
            onCreate={panel.handleCreateUser}
            onCancel={() => {
              if (panel.isSubmitting) return;
              panel.setCreateError("");
              panel.setShowCreateModal(false);
            }}
          />
        </Modal>
      )}

      {panel.editingUser && (
        <Modal
          open={!!panel.editingUser}
          onClose={() => {
            if (panel.isEditSubmitting || panel.isRequestingPasswordChange) return;
            panel.setEditError("");
            panel.setPasswordChangeError("");
            panel.setEditingUser(null);
          }}
          title="Editar usuario"
        >
          <AdminUserEditForm
            user={panel.editingUser}
            isSubmitting={panel.isEditSubmitting}
            isRequestingPasswordChange={panel.isRequestingPasswordChange}
            error={panel.editError}
            passwordChangeError={panel.passwordChangeError}
            onSave={panel.handleSaveEdit}
            onRequestPasswordChange={panel.handleRequestPasswordChange}
            onCancel={() => {
              if (panel.isEditSubmitting || panel.isRequestingPasswordChange) return;
              panel.setEditError("");
              panel.setPasswordChangeError("");
              panel.setEditingUser(null);
            }}
          />
        </Modal>
      )}

      <ConfirmDeleteModal
        open={!!panel.deleteConfirmUser}
        onClose={() => {
          panel.setDeleteConfirmUser(null);
          panel.setDeleteError("");
        }}
        title="Eliminar usuario"
        message={
          <>
            Estás seguro que deseas eliminar a {panel.deleteConfirmUser?.first_name}{" "}
            {panel.deleteConfirmUser?.last_name}?
          </>
        }
        error={panel.deleteError}
        actions={[
          {
            label: "Eliminar",
            variant: "delete",
            onClick: panel.handleConfirmDelete,
          },
          {
            label: "Cancelar",
            variant: "ghost",
            onClick: () => {
              panel.setDeleteConfirmUser(null);
              panel.setDeleteError("");
            },
          },
        ]}
      />

      <ConfirmDeleteModal
        open={!!panel.bulkConfirmIds?.length}
        onClose={() => {
          panel.setBulkConfirmIds(null);
          panel.setBulkError("");
        }}
        title="Eliminar usuarios"
        message={
          <>
            Estás seguro que deseas eliminar {panel.bulkConfirmIds?.length ?? 0} usuario
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
          },
          {
            label: "Cancelar",
            variant: "ghost",
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
          <AdminTableSkeleton variant="users" showSelection />
        ) : (
          <AdminUsersTable
            users={panel.users}
            page={panel.currentPage}
            perPage={PER_PAGE}
            total={panel.total}
            totalPages={panel.totalPages}
            onPageChange={panel.setPage}
            onEdit={(user) => {
              panel.setEditError("");
              panel.setPasswordChangeError("");
              panel.setEditingUser(user);
            }}
            onDelete={(user) => {
              if (user.is_primary_admin) return;
              panel.setDeleteConfirmUser(user);
              panel.setDeleteError("");
            }}
            canSelectUser={panel.canSelectUser}
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
