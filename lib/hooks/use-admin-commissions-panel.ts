"use client";

import { useCallback, useEffect, useState } from "react";
import { PER_PAGE } from "@/components/admin/AdminCommissionsTable";
import { getToken, getUserFromToken, getCurrentUserId, isAdmin } from "@/lib/auth";
import { canDeleteOwnedResource, canEditOwnedResource } from "@/lib/roles";
import {
  adminCommissionsApi,
  adminOrdersApi,
  adminProductsApi,
  adminSalesApi,
  type Commission,
  type CreateCommissionRequest,
  type ExternalSeller,
  type Product,
  type SaleAssignableUser,
  type SupplierOrder,
  type UpdateCommissionRequest,
} from "@/lib/api";
import { filterCommissionsByQuery } from "@/lib/admin-commissions-search";
import { getCommissionLabel } from "@/lib/commission-display";
import { useAdminSearch } from "@/lib/hooks/use-admin-search";
import { useAdminTableSelection } from "@/lib/hooks/use-admin-table-selection";
import { usePendingDelete } from "@/lib/use-pending-delete";

type CommissionsListData = {
  commissions: Commission[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

export function useAdminCommissionsPanel() {
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<SaleAssignableUser[]>([]);
  const [externalSellers, setExternalSellers] = useState<ExternalSeller[]>([]);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [commissionsData, setCommissionsData] = useState<CommissionsListData>();
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCommissionForm, setShowCommissionForm] = useState(false);
  const [viewingCommission, setViewingCommission] = useState<Commission | null>(null);
  const [editingCommission, setEditingCommission] = useState<Commission | null>(null);
  const [exportingCommission, setExportingCommission] = useState<Commission | null>(null);
  const [editError, setEditError] = useState("");
  const [exportError, setExportError] = useState("");
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [isExportSubmitting, setIsExportSubmitting] = useState(false);
  const [deleteConfirmCommission, setDeleteConfirmCommission] = useState<Commission | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

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

  const filterCommissionsCached = useCallback(
    (items: Commission[], query: string, limit: number) =>
      filterCommissionsByQuery(items, query, limit, assignableUsers),
    [assignableUsers]
  );

  const {
    searchInput,
    setSearchInput,
    searchQuery,
    searchTick,
    searchSuggestions,
    searchCacheRef,
    applySearchFromQuery,
    clearSearch,
    invalidateSearchCache,
  } = useAdminSearch<Commission>({
    searchApi: (token, query) => adminCommissionsApi.search(token, query),
    filterCached: filterCommissionsCached,
  });

  const loadProducts = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    const response = await adminProductsApi.getAll(token, {
      page: 1,
      per_page: 200,
    });

    setProducts(response.data?.products ?? []);
  }, []);

  const loadSellerData = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    const [usersResponse, sellersResponse] = await Promise.all([
      adminSalesApi.getAssignableUsers(token),
      adminSalesApi.getExternalSellers(token),
    ]);

    setAssignableUsers(usersResponse.data?.users ?? []);
    setExternalSellers(sellersResponse.data?.sellers ?? []);
  }, []);

  const loadOrders = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    const response = await adminOrdersApi.getAll(token, { page: 1, per_page: 100 });
    setOrders(response.data?.orders ?? []);
  }, []);

  const loadCommissions = useCallback(async () => {
    await flushPendingDelete();
    const token = getToken();
    if (!token) {
      setError("Sesión expirada. Volvé a iniciar sesión.");
      return;
    }

    const q = searchQuery.trim();
    if (!q) {
      const response = await adminCommissionsApi.getAll(token, { page, per_page: PER_PAGE });
      if (response.error || !response.data) {
        setError(response.error || "No se pudieron cargar los encargos.");
        setCommissionsData(undefined);
        return;
      }
      setCommissionsData(response.data);
      return;
    }

    let all = searchCacheRef.current?.query === q ? searchCacheRef.current.results : null;
    if (!all) {
      const response = await adminCommissionsApi.search(token, q);
      if (response.error || !response.data) {
        setError(response.error || "Error al buscar encargos.");
        setCommissionsData(undefined);
        return;
      }
      all = response.data.results;
      searchCacheRef.current = { query: q, results: all };
    }

    const total = all.length;
    const total_pages = Math.max(1, Math.ceil(total / PER_PAGE));
    const safePage = Math.min(Math.max(1, page), total_pages);
    const start = (safePage - 1) * PER_PAGE;
    setCommissionsData({
      commissions: all.slice(start, start + PER_PAGE),
      page: safePage,
      per_page: PER_PAGE,
      total,
      total_pages,
    });
    if (safePage !== page) {
      setPage(safePage);
    }
  }, [page, searchQuery, flushPendingDelete, searchCacheRef]);

  const refreshCommissionsList = useCallback(async () => {
    setIsDataLoading(true);
    try {
      await Promise.all([loadCommissions(), loadProducts(), loadSellerData()]);
    } finally {
      setIsDataLoading(false);
    }
  }, [loadCommissions, loadProducts, loadSellerData]);

  const refreshCommissionsPanel = useCallback(async () => {
    setIsDataLoading(true);
    try {
      await Promise.all([loadProducts(), loadSellerData(), loadOrders(), loadCommissions()]);
    } finally {
      setIsDataLoading(false);
    }
  }, [loadProducts, loadSellerData, loadOrders, loadCommissions]);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshCommissionsList();
    });
  }, [refreshCommissionsList, searchTick]);

  useEffect(() => {
    if (!showCommissionForm && !editingCommission && !exportingCommission) return;

    queueMicrotask(() => {
      void Promise.all([loadProducts(), loadSellerData(), loadOrders()]);
    });
  }, [showCommissionForm, editingCommission, exportingCommission, loadProducts, loadSellerData, loadOrders]);

  const handleCreateCommission = useCallback(
    async (payload: CreateCommissionRequest) => {
      await flushPendingDelete();
      const token = getToken();
      if (!token) {
        setError("Sesión expirada. Volvé a iniciar sesión.");
        return false;
      }

      setError("");
      setSuccess("");
      setIsSubmitting(true);

      const response = await adminCommissionsApi.create(payload, token);
      if (response.error || !response.data) {
        setError(response.error || "No se pudo crear el encargo.");
        setIsSubmitting(false);
        return false;
      }

      setSuccess("Encargo creado correctamente.");
      invalidateSearchCache();
      await refreshCommissionsPanel();
      setIsSubmitting(false);
      setShowCommissionForm(false);
      return true;
    },
    [refreshCommissionsPanel, flushPendingDelete, invalidateSearchCache]
  );

  const handleSaveEdit = useCallback(
    async (payload: UpdateCommissionRequest) => {
      if (!editingCommission) return false;

      await flushPendingDelete();
      const token = getToken();
      if (!token) {
        setEditError("Sesión expirada. Volvé a iniciar sesión.");
        return false;
      }

      setEditError("");
      setIsEditSubmitting(true);

      const response = await adminCommissionsApi.update(editingCommission.id, payload, token);
      if (response.error || !response.data) {
        setEditError(response.error || "No se pudo actualizar el encargo.");
        setIsEditSubmitting(false);
        return false;
      }

      setSuccess("Encargo actualizado correctamente.");
      setEditingCommission(null);
      invalidateSearchCache();
      await loadCommissions();
      setIsEditSubmitting(false);
      return true;
    },
    [editingCommission, loadCommissions, flushPendingDelete, invalidateSearchCache]
  );

  const handleExportCommission = useCallback(
    async (supplierOrderId: string) => {
      if (!exportingCommission) return false;

      await flushPendingDelete();
      const token = getToken();
      if (!token) {
        setExportError("Sesión expirada. Volvé a iniciar sesión.");
        return false;
      }

      setExportError("");
      setIsExportSubmitting(true);

      const response = await adminCommissionsApi.exportToOrder(
        exportingCommission.id,
        { supplier_order_id: supplierOrderId },
        token
      );

      if (response.error || !response.data) {
        setExportError(response.error || "No se pudo exportar el encargo.");
        setIsExportSubmitting(false);
        return false;
      }

      setSuccess("Encargo exportado al pedido correctamente.");
      setExportingCommission(null);
      invalidateSearchCache();
      await Promise.all([loadCommissions(), loadOrders()]);
      setIsExportSubmitting(false);
      return true;
    },
    [exportingCommission, loadCommissions, loadOrders, flushPendingDelete, invalidateSearchCache]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirmCommission) return;
    const commission = deleteConfirmCommission;
    const snapshot = commissionsData;

    setDeleteConfirmCommission(null);
    setIsDeleteSubmitting(false);
    setDeleteError("");
    setError("");

    setCommissionsData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        commissions: prev.commissions.filter((item) => item.id !== commission.id),
        total: Math.max(0, prev.total - 1),
      };
    });

    await scheduleDelete({
      message: "Encargo eliminado correctamente.",
      restore: () => setCommissionsData(snapshot),
      commit: async () => {
        const token = getToken();
        if (!token) {
          setCommissionsData(snapshot);
          setError("Sesión expirada. Volvé a iniciar sesión.");
          return;
        }

        const response = await adminCommissionsApi.delete(commission.id, token);
        if (response.error) {
          setCommissionsData(snapshot);
          setError(response.error);
          return;
        }

        invalidateSearchCache();
        await refreshCommissionsPanel();
      },
    });
  }, [deleteConfirmCommission, commissionsData, scheduleDelete, refreshCommissionsPanel, invalidateSearchCache]);

  const canDeleteCommission = useCallback(
    (commission: Commission) =>
      canDeleteOwnedResource(getUserFromToken()?.role, getCurrentUserId(), commission.created_by),
    []
  );

  const canEditCommission = useCallback(
    (commission: Commission) =>
      canEditOwnedResource(getUserFromToken()?.role, getCurrentUserId(), commission.created_by),
    []
  );

  const handleBulkDeleteConfirm = useCallback(async () => {
    if (!bulkConfirmIds?.length) return;

    const ids = bulkConfirmIds;
    const count = ids.length;
    const snapshot = commissionsData;
    const idSet = new Set(ids);

    setBulkConfirmIds(null);
    clearSelection();
    setIsBulkSubmitting(false);
    setBulkError("");
    setError("");

    setCommissionsData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        commissions: prev.commissions.filter((item) => !idSet.has(item.id)),
        total: Math.max(0, prev.total - count),
      };
    });

    await scheduleDelete({
      message:
        count === 1
          ? "Encargo eliminado correctamente."
          : `${count} encargos eliminados correctamente.`,
      restore: () => setCommissionsData(snapshot),
      commit: async () => {
        const token = getToken();
        if (!token) {
          setCommissionsData(snapshot);
          setBulkError("Sesión expirada.");
          return;
        }

        let failed = 0;
        for (const id of ids) {
          const response = await adminCommissionsApi.delete(id, token);
          if (response.error) failed += 1;
        }

        if (failed > 0) {
          setCommissionsData(snapshot);
          setBulkError(`${failed} de ${count} no se pudieron eliminar.`);
          invalidateSearchCache();
          await refreshCommissionsPanel();
          return;
        }

        invalidateSearchCache();
        await refreshCommissionsPanel();
      },
    });
  }, [
    bulkConfirmIds,
    commissionsData,
    scheduleDelete,
    refreshCommissionsPanel,
    invalidateSearchCache,
    clearSelection,
    setIsBulkSubmitting,
    setBulkError,
  ]);

  const data = commissionsData ?? undefined;
  const commissions = data?.commissions ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 0;
  const currentPage = data?.page ?? page;

  return {
    isDataLoading,
    commissions,
    total,
    totalPages,
    currentPage,
    page,
    setPage,
    products,
    assignableUsers,
    externalSellers,
    orders,
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
    showCommissionForm,
    setShowCommissionForm,
    viewingCommission,
    setViewingCommission,
    editingCommission,
    setEditingCommission,
    exportingCommission,
    setExportingCommission,
    editError,
    setEditError,
    exportError,
    setExportError,
    isEditSubmitting,
    isExportSubmitting,
    isSubmitting,
    deleteConfirmCommission,
    setDeleteConfirmCommission,
    deleteError,
    setDeleteError,
    isDeleteSubmitting,
    applySearchFromQuery: (query: string) => applySearchFromQuery(query, resetPage),
    clearSearch: () => clearSearch(resetPage),
    handleCreateCommission,
    handleSaveEdit,
    handleExportCommission,
    handleConfirmDelete,
    handleBulkDeleteConfirm,
    canDeleteCommission,
    canEditCommission,
    selectedIds,
    setSelectedIds,
    bulkConfirmIds,
    setBulkConfirmIds,
    bulkError,
    setBulkError,
    isBulkSubmitting,
    clearSelection,
    getCommissionLabel,
    isAdmin: isAdmin(),
    getCurrentUserId,
  };
}
