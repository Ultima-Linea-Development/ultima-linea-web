"use client";

import { useCallback, useEffect, useState } from "react";
import { PER_PAGE } from "@/components/admin/AdminUsersTable";
import { getToken } from "@/lib/auth";
import {
  adminUsersApi,
  type AdminUser,
  type CreateUserRequest,
  type UpdateUserRequest,
} from "@/lib/api";
import { filterUsersByQuery } from "@/lib/admin-users-search";
import { useAdminSearch } from "@/lib/hooks/use-admin-search";
import { useAdminTableSelection } from "@/lib/hooks/use-admin-table-selection";
import { usePendingDelete } from "@/lib/use-pending-delete";

type UsersListData = {
  users: AdminUser[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

export function useAdminUsersPanel() {
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [usersData, setUsersData] = useState<UsersListData>();
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editError, setEditError] = useState("");
  const [passwordChangeError, setPasswordChangeError] = useState("");
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [isRequestingPasswordChange, setIsRequestingPasswordChange] = useState(false);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<AdminUser | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const {
    selectedIds,
    setSelectedIds,
    bulkConfirmIds,
    setBulkConfirmIds,
    bulkError,
    setBulkError,
    isBulkSubmitting,
    setIsBulkSubmitting,
    clearSelection,
  } = useAdminTableSelection();

  const {
    deleteToast,
    undoDuration,
    scheduleDelete,
    undoDelete,
    dismissDeleteToast,
    flushPendingDelete,
  } = usePendingDelete();

  const resetPage = useCallback(() => setPage(1), []);

  const {
    searchInput,
    setSearchInput,
    searchQuery,
    searchTick,
    searchSuggestions,
    searchCacheRef,
    applySearchFromQuery,
    clearSearch,
  } = useAdminSearch<AdminUser>({
    searchApi: (token, query) => adminUsersApi.search(token, query),
    filterCached: filterUsersByQuery,
  });

  const loadUsers = useCallback(async () => {
    setIsDataLoading(true);
    try {
      await flushPendingDelete();
      const token = getToken();
      if (!token) {
        setError("Sesión expirada. Volvé a iniciar sesión.");
        return;
      }

      const q = searchQuery.trim();
      if (!q) {
        const response = await adminUsersApi.getAll(token, { page, per_page: PER_PAGE });
        if (response.error || !response.data) {
          setError(response.error || "No se pudieron cargar los usuarios.");
          setUsersData(undefined);
          return;
        }
        setUsersData(response.data);
        return;
      }

      let all = searchCacheRef.current?.query === q ? searchCacheRef.current.results : null;
      if (!all) {
        const response = await adminUsersApi.search(token, q);
        if (response.error || !response.data) {
          setError(response.error || "Error al buscar usuarios.");
          setUsersData(undefined);
          return;
        }
        all = response.data.results;
        searchCacheRef.current = { query: q, results: all };
      }

      const total = all.length;
      const total_pages = Math.max(1, Math.ceil(total / PER_PAGE));
      const safePage = Math.min(Math.max(1, page), total_pages);
      const start = (safePage - 1) * PER_PAGE;
      setUsersData({
        users: all.slice(start, start + PER_PAGE),
        page: safePage,
        per_page: PER_PAGE,
        total,
        total_pages,
      });
      if (safePage !== page) {
        setPage(safePage);
      }
    } finally {
      setIsDataLoading(false);
    }
  }, [page, searchQuery, flushPendingDelete, searchCacheRef]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadUsers();
    });
  }, [loadUsers, searchTick]);

  const handleCreateUser = useCallback(async (payload: CreateUserRequest) => {
    const token = getToken();
    if (!token) {
      setCreateError("Sesión expirada. Volvé a iniciar sesión.");
      return false;
    }

    setCreateError("");
    setIsSubmitting(true);

    const response = await adminUsersApi.create(payload, token);
    if (response.error || !response.data) {
      setCreateError(response.error || "No se pudo crear el usuario.");
      setIsSubmitting(false);
      return false;
    }

    setSuccess("Usuario creado correctamente.");
    setShowCreateModal(false);
    setPage(1);

    const listResponse = await adminUsersApi.getAll(token, { page: 1, per_page: PER_PAGE });
    if (listResponse.data) {
      setUsersData(listResponse.data);
    }

    setIsSubmitting(false);
    return true;
  }, []);

  const handleSaveEdit = useCallback(
    async (payload: UpdateUserRequest) => {
      if (!editingUser) return false;

      await flushPendingDelete();
      const token = getToken();
      if (!token) {
        setEditError("Sesión expirada. Volvé a iniciar sesión.");
        return false;
      }

      setEditError("");
      setIsEditSubmitting(true);

      const response = await adminUsersApi.update(editingUser.id, payload, token);
      if (response.error || !response.data) {
        setEditError(response.error || "No se pudo actualizar el usuario.");
        setIsEditSubmitting(false);
        return false;
      }

      setSuccess("Usuario actualizado correctamente.");
      setEditingUser(null);
      await loadUsers();
      setIsEditSubmitting(false);
      return true;
    },
    [editingUser, flushPendingDelete, loadUsers]
  );

  const handleRequestPasswordChange = useCallback(async () => {
    if (!editingUser) return false;

    const token = getToken();
    if (!token) {
      setPasswordChangeError("Sesión expirada. Volvé a iniciar sesión.");
      return false;
    }

    setPasswordChangeError("");
    setIsRequestingPasswordChange(true);

    const response = await adminUsersApi.requestPasswordChange(editingUser.id, token);
    if (response.error || !response.data) {
      setPasswordChangeError(response.error || "No se pudo restaurar la contraseña.");
      setIsRequestingPasswordChange(false);
      return false;
    }

    setEditingUser(response.data.user);
    setSuccess(
      `Contraseña restaurada. El usuario puede ingresar con ${response.data.temporary_password} y deberá definir una nueva al entrar.`
    );
    await loadUsers();
    setIsRequestingPasswordChange(false);
    return true;
  }, [editingUser, loadUsers]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirmUser || deleteConfirmUser.is_primary_admin) return;

    const user = deleteConfirmUser;
    const usersSnapshot = usersData;

    setDeleteConfirmUser(null);
    setDeleteError("");
    setError("");

    setUsersData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        users: prev.users.filter((item) => item.id !== user.id),
        total: Math.max(0, prev.total - 1),
      };
    });

    await scheduleDelete({
      message: "Usuario eliminado correctamente.",
      restore: () => setUsersData(usersSnapshot),
      commit: async () => {
        const token = getToken();
        if (!token) {
          setUsersData(usersSnapshot);
          setError("Sesión expirada. Volvé a iniciar sesión.");
          return;
        }

        const response = await adminUsersApi.delete(user.id, token);
        if (response.error) {
          setUsersData(usersSnapshot);
          setError(response.error);
          return;
        }

        await loadUsers();
      },
    });
  }, [deleteConfirmUser, usersData, scheduleDelete, loadUsers]);

  const canSelectUser = useCallback((user: AdminUser) => !user.is_primary_admin, []);

  const handleBulkDeleteConfirm = useCallback(async () => {
    if (!bulkConfirmIds?.length) return;

    const ids = bulkConfirmIds.filter((id) => {
      const user = usersData?.users.find((item) => item.id === id);
      return user && !user.is_primary_admin;
    });
    if (ids.length === 0) return;

    const count = ids.length;
    const usersSnapshot = usersData;
    const idSet = new Set(ids);

    setBulkConfirmIds(null);
    clearSelection();
    setIsBulkSubmitting(false);
    setBulkError("");
    setError("");

    setUsersData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        users: prev.users.filter((item) => !idSet.has(item.id)),
        total: Math.max(0, prev.total - count),
      };
    });

    await scheduleDelete({
      message:
        count === 1
          ? "Usuario eliminado correctamente."
          : `${count} usuarios eliminados correctamente.`,
      restore: () => setUsersData(usersSnapshot),
      commit: async () => {
        const token = getToken();
        if (!token) {
          setUsersData(usersSnapshot);
          setBulkError("Sesión expirada.");
          return;
        }

        let failed = 0;
        for (const id of ids) {
          const response = await adminUsersApi.delete(id, token);
          if (response.error) failed += 1;
        }

        if (failed > 0) {
          setUsersData(usersSnapshot);
          setBulkError(`${failed} de ${count} no se pudieron eliminar.`);
          await loadUsers();
          return;
        }

        await loadUsers();
      },
    });
  }, [
    bulkConfirmIds,
    usersData,
    scheduleDelete,
    loadUsers,
    clearSelection,
    setIsBulkSubmitting,
    setBulkError,
  ]);

  const data = usersData ?? undefined;
  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 0;
  const currentPage = data?.page ?? page;

  return {
    isDataLoading,
    users,
    total,
    totalPages,
    currentPage,
    page,
    setPage,
    error,
    setError,
    success,
    setSuccess,
    searchInput,
    setSearchInput,
    searchSuggestions,
    deleteToast,
    undoDuration,
    undoDelete,
    dismissDeleteToast,
    showCreateModal,
    setShowCreateModal,
    isSubmitting,
    createError,
    setCreateError,
    editingUser,
    setEditingUser,
    editError,
    setEditError,
    passwordChangeError,
    setPasswordChangeError,
    isEditSubmitting,
    isRequestingPasswordChange,
    deleteConfirmUser,
    setDeleteConfirmUser,
    deleteError,
    setDeleteError,
    applySearchFromQuery: (query: string) => applySearchFromQuery(query, resetPage),
    clearSearch: () => clearSearch(resetPage),
    handleCreateUser,
    handleSaveEdit,
    handleRequestPasswordChange,
    handleConfirmDelete,
    handleBulkDeleteConfirm,
    canSelectUser,
    selectedIds,
    setSelectedIds,
    bulkConfirmIds,
    setBulkConfirmIds,
    bulkError,
    setBulkError,
    isBulkSubmitting,
    clearSelection,
  };
}
