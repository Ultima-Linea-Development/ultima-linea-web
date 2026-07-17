"use client";

import { useCallback, useEffect, useState } from "react";
import { PER_PAGE } from "@/components/admin/AdminProductsTable";
import { getToken, getUserFromToken, getCurrentUserId } from "@/lib/auth";
import { canDeleteOwnedResource } from "@/lib/roles";
import {
  productsApi,
  adminProductsApi,
  adminSalesApi,
  type ExternalSeller,
  type Product,
  type SaleAssignableUser,
  type UpdateProductRequest,
} from "@/lib/api";
import { filterProductsByQuery } from "@/lib/admin-product-search";
import { useAdminSearch } from "@/lib/hooks/use-admin-search";
import { usePendingDelete } from "@/lib/use-pending-delete";
import type { CatalogStatusFilter } from "@/components/admin/AdminCatalogStatusLinks";

type ProductsListData = NonNullable<
  Awaited<ReturnType<typeof adminProductsApi.getAll>>["data"]
>;

function activeFilterToStatus(activeFilter: string): CatalogStatusFilter {
  if (activeFilter === "false") return "inactive";
  if (activeFilter === "in_stock") return "in_stock";
  return "all";
}

export function useAdminProductsCatalog() {
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [products, setProducts] = useState<ProductsListData | undefined>(undefined);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [page, setPage] = useState(1);
  const [sizeFilter, setSizeFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [todoCount, setTodoCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [inStockCount, setInStockCount] = useState(0);
  const [sizeOptions, setSizeOptions] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [bulkConfirmIds, setBulkConfirmIds] = useState<string[] | null>(null);
  const [bulkError, setBulkError] = useState("");
  const [assignableUsers, setAssignableUsers] = useState<SaleAssignableUser[]>([]);
  const [externalSellers, setExternalSellers] = useState<ExternalSeller[]>([]);

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
    bumpSearch,
    invalidateSearchCache,
  } = useAdminSearch<Product>({
    searchApi: (token, query) => adminProductsApi.search(token, query),
    filterCached: filterProductsByQuery,
  });

  const catalogFilters = {
    ...(sizeFilter ? { size: sizeFilter } : {}),
    ...(activeFilter === "false" ? { is_active: false } : {}),
    ...(activeFilter === "in_stock" ? { in_stock: true } : {}),
  };

  const refreshStatusCounts = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    const [allResponse, inactiveResponse, inStockResponse] = await Promise.all([
      adminProductsApi.getAll(token, { page: 1, per_page: 1 }),
      adminProductsApi.getAll(token, { page: 1, per_page: 1, is_active: false }),
      adminProductsApi.getAll(token, { page: 1, per_page: 1, in_stock: true }),
    ]);

    if (allResponse.data) setTodoCount(allResponse.data.total);
    if (inactiveResponse.data) setInactiveCount(inactiveResponse.data.total);
    if (inStockResponse.data) setInStockCount(inStockResponse.data.total);
  }, []);

  const loadCatalog = useCallback(async () => {
    setIsDataLoading(true);
    try {
      await flushPendingDelete();
      setError("");
      const token = getToken();
      if (!token) {
        setError("Sesión expirada. Volvé a iniciar sesión.");
        setProducts(undefined);
        return;
      }

      const q = searchQuery.trim();
      if (!q) {
        const response = await adminProductsApi.getAll(token, {
          page,
          per_page: PER_PAGE,
          ...catalogFilters,
        });
        if (response.error) {
          setError(response.error);
          setProducts(undefined);
          return;
        }
        setProducts(response.data ?? undefined);
        return;
      }

      let all = searchCacheRef.current?.query === q ? searchCacheRef.current.results : null;
      if (!all) {
        const response = await adminProductsApi.search(token, q, catalogFilters);
        if (response.error || !response.data) {
          setError(response.error ?? "Error al buscar");
          setProducts(undefined);
          return;
        }
        all = response.data.results;
        searchCacheRef.current = { query: q, results: all };
      }

      const total = all.length;
      const total_pages = Math.max(1, Math.ceil(total / PER_PAGE));
      const safePage = Math.min(Math.max(1, page), total_pages);
      const start = (safePage - 1) * PER_PAGE;
      setProducts({
        products: all.slice(start, start + PER_PAGE),
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
  }, [searchQuery, page, sizeFilter, activeFilter, flushPendingDelete, searchCacheRef]);

  const refreshCatalog = useCallback(async () => {
    invalidateSearchCache();
    await Promise.all([loadCatalog(), refreshStatusCounts()]);
  }, [loadCatalog, invalidateSearchCache, refreshStatusCounts]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadCatalog();
    });
  }, [loadCatalog, searchTick]);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshStatusCounts();
    });
  }, [refreshStatusCounts]);

  useEffect(() => {
    void productsApi.getOptions().then((response) => {
      if (response.data) {
        setSizeOptions(response.data.sizes);
      }
    });
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    void Promise.all([
      adminSalesApi.getAssignableUsers(token),
      adminSalesApi.getExternalSellers(token),
    ]).then(([usersResponse, sellersResponse]) => {
      setAssignableUsers(usersResponse.data?.users ?? []);
      setExternalSellers(sellersResponse.data?.sellers ?? []);
    });
  }, []);

  const handleSizeFilterChange = useCallback(
    (value: string) => {
      setSizeFilter(value);
      invalidateSearchCache();
      setPage(1);
      bumpSearch();
    },
    [invalidateSearchCache, bumpSearch]
  );

  const handleActiveFilterChange = useCallback(
    (value: string) => {
      setActiveFilter(value);
      invalidateSearchCache();
      setPage(1);
      bumpSearch();
    },
    [invalidateSearchCache, bumpSearch]
  );

  const showInactiveProducts = useCallback(() => {
    handleActiveFilterChange("false");
  }, [handleActiveFilterChange]);

  const showTodoProducts = useCallback(() => {
    handleActiveFilterChange("");
  }, [handleActiveFilterChange]);

  const showInStockProducts = useCallback(() => {
    handleActiveFilterChange("in_stock");
  }, [handleActiveFilterChange]);

  const handleDeactivate = useCallback(
    async (product: Product) => {
      await flushPendingDelete();
      const token = getToken();
      if (!token) {
        setError("Sesión expirada. Volvé a iniciar sesión.");
        return;
      }
      setError("");
      const response = await adminProductsApi.update(product.id, { is_active: false }, token);
      if (response.error) {
        setError(response.error);
        return;
      }
      await refreshCatalog();
    },
    [refreshCatalog, flushPendingDelete]
  );

  const handleReactivate = useCallback(
    async (product: Product) => {
      await flushPendingDelete();
      const token = getToken();
      if (!token) {
        setError("Sesión expirada. Volvé a iniciar sesión.");
        return;
      }
      setError("");
      const response = await adminProductsApi.update(product.id, { is_active: true }, token);
      if (response.error) {
        setError(response.error);
        return;
      }
      await refreshCatalog();
    },
    [refreshCatalog, flushPendingDelete]
  );

  const handleBulkDesactivar = useCallback(async () => {
    if (selectedIds.length === 0) return;
    const token = getToken();
    if (!token) {
      setBulkError("Sesión expirada.");
      return;
    }
    const count = selectedIds.length;
    setIsBulkSubmitting(true);
    setBulkError("");
    let failed = 0;
    for (const id of selectedIds) {
      const res = await adminProductsApi.update(id, { is_active: false }, token);
      if (res.error) failed++;
    }
    setSelectedIds([]);
    await refreshCatalog();
    setIsBulkSubmitting(false);
    if (failed > 0) setBulkError(`${failed} de ${count} no se pudieron desactivar.`);
  }, [selectedIds, refreshCatalog]);

  const handleBulkEliminarConfirm = useCallback(async () => {
    if (!bulkConfirmIds?.length) return;
    const ids = bulkConfirmIds;
    const count = ids.length;
    const productsSnapshot = products;
    const idSet = new Set(ids);

    setBulkConfirmIds(null);
    setSelectedIds([]);
    setIsBulkSubmitting(false);
    setBulkError("");
    setError("");

    setProducts((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        products: prev.products.filter((product) => !idSet.has(product.id)),
        total: Math.max(0, prev.total - count),
      };
    });

    await scheduleDelete({
      message:
        count === 1
          ? "Artículo eliminado correctamente."
          : `${count} artículos eliminados correctamente.`,
      restore: () => setProducts(productsSnapshot),
      commit: async () => {
        const token = getToken();
        if (!token) {
          setProducts(productsSnapshot);
          setBulkError("Sesión expirada.");
          return;
        }

        let failed = 0;
        for (const id of ids) {
          const res = await adminProductsApi.delete(id, token);
          if (res.error) failed++;
        }

        if (failed > 0) {
          setProducts(productsSnapshot);
          setBulkError(`${failed} de ${count} no se pudieron eliminar.`);
          invalidateSearchCache();
          await loadCatalog();
          return;
        }

        invalidateSearchCache();
        await loadCatalog();
      },
    });
  }, [bulkConfirmIds, products, scheduleDelete, loadCatalog, invalidateSearchCache]);

  const confirmSingleDelete = useCallback(
    async (product: Product) => {
      const productsSnapshot = products;

      setError("");

      setProducts((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          products: prev.products.filter((item) => item.id !== product.id),
          total: Math.max(0, prev.total - 1),
        };
      });

      await scheduleDelete({
        message: "Artículo eliminado correctamente.",
        restore: () => setProducts(productsSnapshot),
        commit: async () => {
          const token = getToken();
          if (!token) {
            setProducts(productsSnapshot);
            setError("Sesión expirada. Volvé a iniciar sesión.");
            return;
          }

          const response = await adminProductsApi.delete(product.id, token);
          if (response.error) {
            setProducts(productsSnapshot);
            setError(response.error);
            return;
          }

          invalidateSearchCache();
          await loadCatalog();
        },
      });
    },
    [products, scheduleDelete, loadCatalog, invalidateSearchCache]
  );

  const confirmDeactivate = useCallback(
    async (product: Product) => {
      const token = getToken();
      if (!token) {
        throw new Error("Sesión expirada. Volvé a iniciar sesión.");
      }
      const response = await adminProductsApi.update(product.id, { is_active: false }, token);
      if (response.error) {
        throw new Error(response.error);
      }
      await refreshCatalog();
    },
    [refreshCatalog]
  );

  const canDeleteProduct = useCallback(
    (product: Product) =>
      canDeleteOwnedResource(getUserFromToken()?.role, getCurrentUserId(), product.created_by),
    []
  );

  const data = products ?? undefined;
  const list = data?.products ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 0;
  const currentPage = data?.page ?? 1;

  return {
    isDataLoading,
    list,
    total,
    totalPages,
    currentPage,
    page,
    setPage,
    error,
    setError,
    success,
    setSuccess,
    bulkError,
    setBulkError,
    selectedIds,
    setSelectedIds,
    isBulkSubmitting,
    bulkConfirmIds,
    setBulkConfirmIds,
    sizeFilter,
    activeFilter,
    statusFilter: activeFilterToStatus(activeFilter),
    todoCount,
    inactiveCount,
    inStockCount,
    showInactiveProducts,
    showTodoProducts,
    showInStockProducts,
    sizeOptions,
    assignableUsers,
    externalSellers,
    searchInput,
    setSearchInput,
    searchSuggestions,
    deleteToast,
    undoDuration,
    undoDelete,
    dismissDeleteToast,
    flushPendingDelete,
    loadCatalog,
    refreshCatalog,
    applySearchFromQuery: (query: string) => applySearchFromQuery(query, resetPage),
    clearSearch: () => clearSearch(resetPage),
    handleSizeFilterChange,
    handleActiveFilterChange,
    handleDeactivate,
    handleReactivate,
    handleBulkDesactivar,
    handleBulkEliminarConfirm,
    confirmSingleDelete,
    confirmDeactivate,
    canDeleteProduct,
  };
}

export function useAdminProductEdit(refreshCatalog: () => Promise<void>, flushPendingDelete: () => Promise<void>) {
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editError, setEditError] = useState("");
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [focusReservation, setFocusReservation] = useState(false);

  const handleEdit = useCallback(
    (product: Product) => {
      void flushPendingDelete();
      setFocusReservation(false);
      setEditingProductId(product.id);
      setEditingProduct(null);
      setEditError("");
    },
    [flushPendingDelete]
  );

  const handleReserve = useCallback(
    (product: Product) => {
      void flushPendingDelete();
      setFocusReservation(true);
      setEditingProductId(product.id);
      setEditingProduct(null);
      setEditError("");
    },
    [flushPendingDelete]
  );

  useEffect(() => {
    if (!editingProductId) return;
    const id = editingProductId;
    queueMicrotask(() => {
      setIsLoadingProduct(true);
      setEditError("");
    });
    const token = getToken();
    if (!token) {
      queueMicrotask(() => {
        setEditError("Sesión expirada. Volvé a iniciar sesión.");
        setIsLoadingProduct(false);
      });
      return;
    }

    adminProductsApi
      .getById(id, token)
      .then((response) => {
        if (response.error || !response.data) {
          setEditError(response.error ?? "No se pudo cargar el producto.");
          return;
        }
        setEditingProduct(response.data);
      })
      .finally(() => setIsLoadingProduct(false));
  }, [editingProductId]);

  const handleSaveEdit = useCallback(
    async (payload: UpdateProductRequest) => {
      if (!editingProduct) return;
      const token = getToken();
      if (!token) {
        setEditError("Sesión expirada. Volvé a iniciar sesión.");
        return;
      }
      setIsEditSubmitting(true);
      setEditError("");
      const response = await adminProductsApi.update(editingProduct.id, payload, token);
      if (response.error) {
        setEditError(response.error);
        setIsEditSubmitting(false);
        return;
      }
      setEditingProductId(null);
      setEditingProduct(null);
      setFocusReservation(false);
      await refreshCatalog();
      setIsEditSubmitting(false);
    },
    [editingProduct, refreshCatalog]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingProductId(null);
    setEditingProduct(null);
    setFocusReservation(false);
    setEditError("");
  }, []);

  return {
    editingProductId,
    editingProduct,
    editError,
    isEditSubmitting,
    isLoadingProduct,
    focusReservation,
    handleEdit,
    handleReserve,
    handleSaveEdit,
    handleCancelEdit,
  };
}
