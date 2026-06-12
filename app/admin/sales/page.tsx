"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@/components/layout/Box";
import Spinner from "@/components/ui/Spinner";
import Typography from "@/components/ui/Typography";
import Alert, { InlineAlert } from "@/components/ui/Alert";
import Modal from "@/components/ui/Modal";
import AdminShell from "@/components/admin/AdminShell";
import AdminSaleForm from "@/components/admin/AdminSaleForm";
import AdminSalesTable, { PER_PAGE } from "@/components/admin/AdminSalesTable";
import { Button } from "@/components/ui/button";
import { clearAuth, getToken, getUserFromToken, isAdmin } from "@/lib/auth";
import { adminSalesApi, type CreateSaleRequest, type Product, type Sale } from "@/lib/api";
import { usePendingDelete } from "@/lib/use-pending-delete";

export default function AdminSalesPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [salesData, setSalesData] = useState<{
    sales: Sale[];
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  }>();
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const {
    deleteToast,
    undoDuration,
    scheduleDelete,
    undoDelete,
    dismissDeleteToast,
    flushPendingDelete,
  } = usePendingDelete();
  const [deleteConfirmSale, setDeleteConfirmSale] = useState<Sale | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [updatingSaleId, setUpdatingSaleId] = useState<string | null>(null);
  const [showSaleForm, setShowSaleForm] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const user = getUserFromToken();

      if (!user || !isAdmin()) {
        clearAuth();
        router.push("/login?redirect=/admin/sales");
        return;
      }

      setIsAuthorized(true);
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  const loadProducts = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError("Sesión expirada. Volvé a iniciar sesión.");
      return;
    }

    const response = await adminSalesApi.getAvailableProducts(token);
    if (response.error || !response.data) {
      setError(response.error || "No se pudieron cargar los productos.");
      setProducts([]);
      return;
    }

    setProducts(response.data.products);
  }, []);

  const loadSales = useCallback(async () => {
    await flushPendingDelete();
    const token = getToken();
    if (!token) {
      setError("Sesión expirada. Volvé a iniciar sesión.");
      return;
    }

    const response = await adminSalesApi.getAll(token, {
      page,
      per_page: PER_PAGE,
    });
    if (response.error || !response.data) {
      setError(response.error || "No se pudieron cargar las ventas.");
      setSalesData(undefined);
      return;
    }

    setSalesData(response.data);
  }, [page, flushPendingDelete]);

  const refreshSalesPanel = useCallback(async () => {
    await Promise.all([loadProducts(), loadSales()]);
  }, [loadProducts, loadSales]);

  useEffect(() => {
    if (!isAuthorized) return;
    queueMicrotask(() => {
      void refreshSalesPanel();
    });
  }, [isAuthorized, refreshSalesPanel]);

  const handleCreateSale = useCallback(
    async (payload: CreateSaleRequest) => {
      await flushPendingDelete();
      const token = getToken();
      if (!token) {
        setError("Sesión expirada. Volvé a iniciar sesión.");
        return false;
      }

      setError("");
      setSuccess("");
      setIsSubmitting(true);

      const response = await adminSalesApi.create(payload, token);
      if (response.error || !response.data) {
        setError(response.error || "No se pudo registrar la venta.");
        setIsSubmitting(false);
        return false;
      }

      setSuccess("Venta registrada correctamente.");
      await refreshSalesPanel();
      setIsSubmitting(false);
      setShowSaleForm(false);
      return true;
    },
    [refreshSalesPanel, flushPendingDelete]
  );

  const handleDelete = (sale: Sale) => {
    setDeleteConfirmSale(sale);
    setDeleteError("");
  };

  const handleCancelDelete = () => {
    setDeleteConfirmSale(null);
    setDeleteError("");
  };

  const handleUpdateSaleDate = useCallback(
    async (sale: Sale, saleDate: string) => {
      await flushPendingDelete();
      const token = getToken();
      if (!token) {
        setError("Sesión expirada. Volvé a iniciar sesión.");
        return;
      }

      setUpdatingSaleId(sale.id);
      setError("");
      setSuccess("");

      const response = await adminSalesApi.update(sale.id, { sale_date: saleDate }, token);
      if (response.error || !response.data) {
        setError(response.error || "No se pudo actualizar la fecha.");
        await loadSales();
        setUpdatingSaleId(null);
        return;
      }

      setSuccess("Fecha actualizada correctamente.");
      await loadSales();
      setUpdatingSaleId(null);
    },
    [loadSales, flushPendingDelete]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirmSale) return;
    const sale = deleteConfirmSale;
    const salesSnapshot = salesData;

    setDeleteConfirmSale(null);
    setIsDeleteSubmitting(false);
    setDeleteError("");
    setError("");

    setSalesData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sales: prev.sales.filter((item) => item.id !== sale.id),
        total: Math.max(0, prev.total - 1),
      };
    });

    await scheduleDelete({
      message: "Venta eliminada correctamente.",
      restore: () => setSalesData(salesSnapshot),
      commit: async () => {
        const token = getToken();
        if (!token) {
          setSalesData(salesSnapshot);
          setError("Sesión expirada. Volvé a iniciar sesión.");
          return;
        }

        const response = await adminSalesApi.delete(sale.id, token);
        if (response.error) {
          setSalesData(salesSnapshot);
          setError(response.error);
          return;
        }

        await refreshSalesPanel();
      },
    });
  }, [deleteConfirmSale, salesData, scheduleDelete, refreshSalesPanel]);

  if (isLoading) {
    return (
      <Box display="flex" direction="col" gap="4" className="min-h-[60vh] items-center justify-center">
        <Spinner />
      </Box>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const data = salesData ?? undefined;
  const sales = data?.sales ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 0;
  const currentPage = data?.page ?? page;

  return (
    <AdminShell>
      <Box display="flex" direction="col" gap="6">
        <Box display="flex" className="items-center justify-between flex-wrap gap-4">
          <Typography variant="h1">Ventas</Typography>
          {!showSaleForm && (
            <Button type="button" onClick={() => setShowSaleForm(true)}>
              Agregar venta
            </Button>
          )}
        </Box>

        <Alert
          open={!!error}
          message={error}
          variant="destructive"
          onClose={() => setError("")}
        />

        <Alert
          open={!!success}
          message={success}
          variant="default"
          onClose={() => setSuccess("")}
        />

        <Alert
          open={!!deleteToast}
          message={deleteToast}
          variant="default"
          duration={undoDuration}
          onClose={dismissDeleteToast}
          onUndo={undoDelete}
        />

        {showSaleForm && (
          <AdminSaleForm
            products={products}
            isSubmitting={isSubmitting}
            onCreate={handleCreateSale}
            onCancel={() => setShowSaleForm(false)}
            onError={(message) => {
              setSuccess("");
              setError(message);
            }}
          />
        )}

        {deleteConfirmSale && (
          <Modal open={!!deleteConfirmSale} onClose={handleCancelDelete} title="Eliminar venta">
            <Box display="flex" direction="col" gap="4">
              <Typography variant="body2">
                Estás seguro que deseas eliminar esta venta?
              </Typography>
              {deleteError && (
                <InlineAlert variant="destructive">
                  <Typography variant="body2" color="destructive">
                    {deleteError}
                  </Typography>
                </InlineAlert>
              )}
              <Box display="flex" gap="2" className="flex-wrap">
                <Button
                  type="button"
                  variant="delete"
                  onClick={handleConfirmDelete}
                  disabled={isDeleteSubmitting}
                >
                  {isDeleteSubmitting ? "..." : "Eliminar"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancelDelete}
                  disabled={isDeleteSubmitting}
                >
                  Cancelar
                </Button>
              </Box>
            </Box>
          </Modal>
        )}

        <AdminSalesTable
          sales={sales}
          products={products}
          page={currentPage}
          perPage={PER_PAGE}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          onDelete={handleDelete}
          onUpdateDate={handleUpdateSaleDate}
          updatingSaleId={updatingSaleId}
        />
      </Box>
    </AdminShell>
  );
}
