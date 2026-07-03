"use client";

import { useCallback, useEffect, useState } from "react";
import { PER_PAGE } from "@/components/admin/AdminSupplierOrdersTable";
import { getToken, getUserFromToken, getCurrentUserId, isAdmin } from "@/lib/auth";
import { canDeleteOwnedResource } from "@/lib/roles";
import {
  adminOrdersApi,
  adminProductsApi,
  adminSalesApi,
  adminSuppliersApi,
  adminCommissionsApi,
  type CreateSupplierOrderRequest,
  type Commission,
  type ExternalSeller,
  type Product,
  type SaleAssignableUser,
  type Supplier,
  type SupplierOrder,
  type UpdateSupplierOrderRequest,
} from "@/lib/api";
import { filterSupplierOrdersByQuery } from "@/lib/admin-supplier-orders-search";
import { getSupplierOrderLabel, getSupplierOrderSearchQuery } from "@/lib/supplier-order-display";
import { useAdminSearch } from "@/lib/hooks/use-admin-search";
import { useAdminTableSelection } from "@/lib/hooks/use-admin-table-selection";
import { usePendingDelete } from "@/lib/use-pending-delete";

type SupplierOrdersListData = {
  orders: SupplierOrder[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

export function useAdminSupplierOrdersPanel() {
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<SaleAssignableUser[]>([]);
  const [externalSellers, setExternalSellers] = useState<ExternalSeller[]>([]);
  const [ordersData, setOrdersData] = useState<SupplierOrdersListData>();
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<SupplierOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<SupplierOrder | null>(null);
  const [editError, setEditError] = useState("");
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<SupplierOrder | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [exportConfirmOrder, setExportConfirmOrder] = useState<SupplierOrder | null>(null);
  const [exportError, setExportError] = useState("");
  const [isExportSubmitting, setIsExportSubmitting] = useState(false);
  const [pendingCommissions, setPendingCommissions] = useState<Commission[]>([]);

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
    invalidateSearchCache,
  } = useAdminSearch<SupplierOrder>({
    searchApi: (token, query) => adminOrdersApi.search(token, query),
    filterCached: filterSupplierOrdersByQuery,
  });

  const loadSuppliers = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    const response = await adminSuppliersApi.getAll(token);
    setSuppliers(response.data?.suppliers ?? []);
  }, []);

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

  const loadPendingCommissions = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    const response = await adminCommissionsApi.getAll(token, {
      page: 1,
      per_page: 200,
      status: "pending",
    });

    setPendingCommissions(response.data?.commissions ?? []);
  }, []);

  const loadOrders = useCallback(async () => {
    await flushPendingDelete();
    const token = getToken();
    if (!token) {
      setError("Sesión expirada. Volvé a iniciar sesión.");
      return;
    }

    const q = searchQuery.trim();
    if (!q) {
      const response = await adminOrdersApi.getAll(token, { page, per_page: PER_PAGE });
      if (response.error || !response.data) {
        setError(response.error || "No se pudieron cargar los pedidos.");
        setOrdersData(undefined);
        return;
      }
      setOrdersData(response.data);
      return;
    }

    let all = searchCacheRef.current?.query === q ? searchCacheRef.current.results : null;
    if (!all) {
      const response = await adminOrdersApi.search(token, q);
      if (response.error || !response.data) {
        setError(response.error || "Error al buscar pedidos.");
        setOrdersData(undefined);
        return;
      }
      all = response.data.results;
      searchCacheRef.current = { query: q, results: all };
    }

    const total = all.length;
    const total_pages = Math.max(1, Math.ceil(total / PER_PAGE));
    const safePage = Math.min(Math.max(1, page), total_pages);
    const start = (safePage - 1) * PER_PAGE;
    setOrdersData({
      orders: all.slice(start, start + PER_PAGE),
      page: safePage,
      per_page: PER_PAGE,
      total,
      total_pages,
    });
    if (safePage !== page) {
      setPage(safePage);
    }
  }, [page, searchQuery, flushPendingDelete, searchCacheRef]);

  const refreshOrdersList = useCallback(async () => {
    setIsDataLoading(true);
    try {
      await Promise.all([loadOrders(), loadSuppliers(), loadProducts(), loadSellerData()]);
    } finally {
      setIsDataLoading(false);
    }
  }, [loadOrders, loadSuppliers, loadProducts, loadSellerData]);

  const refreshOrdersPanel = useCallback(async () => {
    setIsDataLoading(true);
    try {
      await Promise.all([loadSuppliers(), loadProducts(), loadOrders(), loadSellerData()]);
    } finally {
      setIsDataLoading(false);
    }
  }, [loadSuppliers, loadProducts, loadOrders, loadSellerData]);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshOrdersList();
    });
  }, [refreshOrdersList, searchTick]);

  useEffect(() => {
    if (!showOrderForm && !editingOrder) return;

    queueMicrotask(() => {
      void Promise.all([loadSuppliers(), loadProducts(), loadSellerData(), loadPendingCommissions()]);
    });
  }, [showOrderForm, editingOrder, loadSuppliers, loadProducts, loadSellerData, loadPendingCommissions]);

  const handleCreateOrder = useCallback(
    async (payload: CreateSupplierOrderRequest) => {
      await flushPendingDelete();
      const token = getToken();
      if (!token) {
        setError("Sesión expirada. Volvé a iniciar sesión.");
        return false;
      }

      setError("");
      setSuccess("");
      setIsSubmitting(true);

      const response = await adminOrdersApi.create(payload, token);
      if (response.error || !response.data) {
        setError(response.error || "No se pudo crear el pedido.");
        setIsSubmitting(false);
        return false;
      }

      setSuccess("Pedido creado correctamente.");
      invalidateSearchCache();
      await refreshOrdersPanel();
      setIsSubmitting(false);
      setShowOrderForm(false);
      return true;
    },
    [refreshOrdersPanel, flushPendingDelete, invalidateSearchCache]
  );

  const handleSaveEdit = useCallback(
    async (payload: UpdateSupplierOrderRequest) => {
      if (!editingOrder) return false;

      await flushPendingDelete();
      const token = getToken();
      if (!token) {
        setEditError("Sesión expirada. Volvé a iniciar sesión.");
        return false;
      }

      setEditError("");
      setIsEditSubmitting(true);

      const response = await adminOrdersApi.update(editingOrder.id, payload, token);
      if (response.error || !response.data) {
        setEditError(response.error || "No se pudo actualizar el pedido.");
        setIsEditSubmitting(false);
        return false;
      }

      setSuccess("Pedido actualizado correctamente.");
      setEditingOrder(null);
      invalidateSearchCache();
      await loadOrders();
      await loadSuppliers();
      setIsEditSubmitting(false);
      return true;
    },
    [editingOrder, loadOrders, loadSuppliers, flushPendingDelete, invalidateSearchCache]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirmOrder) return;
    const order = deleteConfirmOrder;
    const ordersSnapshot = ordersData;

    setDeleteConfirmOrder(null);
    setIsDeleteSubmitting(false);
    setDeleteError("");
    setError("");

    setOrdersData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        orders: prev.orders.filter((item) => item.id !== order.id),
        total: Math.max(0, prev.total - 1),
      };
    });

    await scheduleDelete({
      message: "Pedido eliminado correctamente.",
      restore: () => setOrdersData(ordersSnapshot),
      commit: async () => {
        const token = getToken();
        if (!token) {
          setOrdersData(ordersSnapshot);
          setError("Sesión expirada. Volvé a iniciar sesión.");
          return;
        }

        const response = await adminOrdersApi.delete(order.id, token);
        if (response.error) {
          setOrdersData(ordersSnapshot);
          setError(response.error);
          return;
        }

        invalidateSearchCache();
        await refreshOrdersPanel();
      },
    });
  }, [deleteConfirmOrder, ordersData, scheduleDelete, refreshOrdersPanel, invalidateSearchCache]);

  const handleExportToCatalog = useCallback(async () => {
    if (!exportConfirmOrder) return;

    await flushPendingDelete();
    const token = getToken();
    if (!token) {
      setExportError("Sesión expirada. Volvé a iniciar sesión.");
      return;
    }

    setExportError("");
    setIsExportSubmitting(true);

    const response = await adminOrdersApi.exportToCatalog(exportConfirmOrder.id, token);
    if (response.error || !response.data) {
      setExportError(response.error || "No se pudo exportar el pedido al catálogo.");
      setIsExportSubmitting(false);
      return;
    }

    setSuccess(
      `Stock agregado al catálogo para ${response.data.updated_products} producto${
        response.data.updated_products === 1 ? "" : "s"
      }.`
    );
    setExportConfirmOrder(null);
    invalidateSearchCache();
    await refreshOrdersPanel();
    setIsExportSubmitting(false);
  }, [exportConfirmOrder, flushPendingDelete, invalidateSearchCache, refreshOrdersPanel]);

  const canDeleteOrder = useCallback(
    (order: SupplierOrder) =>
      canDeleteOwnedResource(getUserFromToken()?.role, getCurrentUserId(), order.created_by),
    []
  );

  const canExportOrderToCatalog = useCallback(
    (order: SupplierOrder) =>
      !order.catalog_exported_at && order.items.some((item) => Boolean(item.product_id)),
    []
  );

  const handleBulkDeleteConfirm = useCallback(async () => {
    if (!bulkConfirmIds?.length) return;

    const ids = bulkConfirmIds;
    const count = ids.length;
    const ordersSnapshot = ordersData;
    const idSet = new Set(ids);

    setBulkConfirmIds(null);
    clearSelection();
    setIsBulkSubmitting(false);
    setBulkError("");
    setError("");

    setOrdersData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        orders: prev.orders.filter((item) => !idSet.has(item.id)),
        total: Math.max(0, prev.total - count),
      };
    });

    await scheduleDelete({
      message:
        count === 1
          ? "Pedido eliminado correctamente."
          : `${count} pedidos eliminados correctamente.`,
      restore: () => setOrdersData(ordersSnapshot),
      commit: async () => {
        const token = getToken();
        if (!token) {
          setOrdersData(ordersSnapshot);
          setBulkError("Sesión expirada.");
          return;
        }

        let failed = 0;
        for (const id of ids) {
          const response = await adminOrdersApi.delete(id, token);
          if (response.error) failed += 1;
        }

        if (failed > 0) {
          setOrdersData(ordersSnapshot);
          setBulkError(`${failed} de ${count} no se pudieron eliminar.`);
          invalidateSearchCache();
          await refreshOrdersPanel();
          return;
        }

        invalidateSearchCache();
        await refreshOrdersPanel();
      },
    });
  }, [
    bulkConfirmIds,
    ordersData,
    scheduleDelete,
    refreshOrdersPanel,
    invalidateSearchCache,
    clearSelection,
    setIsBulkSubmitting,
    setBulkError,
  ]);

  const data = ordersData ?? undefined;
  const orders = data?.orders ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 0;
  const currentPage = data?.page ?? page;

  return {
    isDataLoading,
    orders,
    total,
    totalPages,
    currentPage,
    page,
    setPage,
    suppliers,
    products,
    assignableUsers,
    externalSellers,
    pendingCommissions,
    isAdmin: isAdmin(),
    getCurrentUserId,
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
    showOrderForm,
    setShowOrderForm,
    viewingOrder,
    setViewingOrder,
    editingOrder,
    setEditingOrder,
    editError,
    setEditError,
    isEditSubmitting,
    isSubmitting,
    deleteConfirmOrder,
    setDeleteConfirmOrder,
    deleteError,
    setDeleteError,
    isDeleteSubmitting,
    exportConfirmOrder,
    setExportConfirmOrder,
    exportError,
    setExportError,
    isExportSubmitting,
    applySearchFromQuery: (query: string) => applySearchFromQuery(query, resetPage),
    clearSearch: () => clearSearch(resetPage),
    handleCreateOrder,
    handleSaveEdit,
    handleConfirmDelete,
    handleExportToCatalog,
    handleBulkDeleteConfirm,
    canDeleteOrder,
    canExportOrderToCatalog,
    selectedIds,
    setSelectedIds,
    bulkConfirmIds,
    setBulkConfirmIds,
    bulkError,
    setBulkError,
    isBulkSubmitting,
    clearSelection,
    getSupplierOrderLabel,
    getSupplierOrderSearchQuery,
  };
}
