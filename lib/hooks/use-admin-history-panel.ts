"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminHistoryApi,
  adminProductsApi,
  type AdminHistoryEntry,
} from "@/lib/api";
import { getToken } from "@/lib/auth";

const PER_PAGE = 20;

type HistoryData = NonNullable<
  Awaited<ReturnType<typeof adminHistoryApi.getAll>>["data"]
>;

export function useAdminHistoryPanel() {
  const [data, setData] = useState<HistoryData | undefined>();
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkConfirmIds, setBulkConfirmIds] = useState<string[] | null>(null);
  const [bulkError, setBulkError] = useState("");

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const token = getToken();
      if (!token) {
        setData(undefined);
        setError("Sesión expirada. Volvé a iniciar sesión.");
        return;
      }

      const response = await adminHistoryApi.getAll(token, {
        page,
        per_page: PER_PAGE,
      });
      if (response.error || !response.data) {
        setData(undefined);
        setError(response.error ?? "No se pudo cargar el historial.");
        return;
      }

      setData(response.data);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const deleteHistoryItem = useCallback(
    async (entry: AdminHistoryEntry) => {
      const token = getToken();
      if (!token) {
        setError("Sesión expirada. Volvé a iniciar sesión.");
        return false;
      }

      setIsSubmitting(true);
      setError("");
      setSuccess("");
      const response = await adminHistoryApi.delete(entry.id, token);
      if (response.error) {
        setError(response.error);
        setIsSubmitting(false);
        return false;
      }

      setSuccess("Ítem de historial eliminado.");
      setSelectedIds((prev) => prev.filter((id) => id !== entry.id));
      await loadHistory();
      setIsSubmitting(false);
      return true;
    },
    [loadHistory]
  );

  const deleteSelectedHistoryItems = useCallback(async () => {
    if (!bulkConfirmIds?.length) return;

    const token = getToken();
    if (!token) {
      setBulkError("Sesión expirada.");
      return;
    }

    const ids = bulkConfirmIds;
    setIsSubmitting(true);
    setBulkError("");
    setError("");
    setSuccess("");

    let failed = 0;
    for (const id of ids) {
      const response = await adminHistoryApi.delete(id, token);
      if (response.error) failed += 1;
    }

    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    setBulkConfirmIds(null);
    await loadHistory();
    setIsSubmitting(false);

    if (failed > 0) {
      setBulkError(`${failed} de ${ids.length} ítems no se pudieron eliminar.`);
      return;
    }

    setSuccess(`${ids.length} ítem${ids.length === 1 ? "" : "s"} de historial eliminado${ids.length === 1 ? "" : "s"}.`);
  }, [bulkConfirmIds, loadHistory]);

  const restoreProduct = useCallback(
    async (entry: AdminHistoryEntry) => {
      const token = getToken();
      if (!token) {
        setError("Sesión expirada. Volvé a iniciar sesión.");
        return;
      }

      setIsSubmitting(true);
      setError("");
      setSuccess("");
      const response = await adminProductsApi.restore(entry.resource_id, token);
      if (response.error) {
        setError(response.error);
        setIsSubmitting(false);
        return;
      }

      setSuccess("Producto restaurado correctamente.");
      await loadHistory();
      setIsSubmitting(false);
    },
    [loadHistory]
  );

  return {
    entries: data?.history ?? [],
    page: data?.page ?? page,
    perPage: data?.per_page ?? PER_PAGE,
    total: data?.total ?? 0,
    totalPages: data?.total_pages ?? 0,
    setPage,
    isLoading,
    error,
    setError,
    success,
    setSuccess,
    isSubmitting,
    selectedIds,
    setSelectedIds,
    bulkConfirmIds,
    setBulkConfirmIds,
    bulkError,
    setBulkError,
    deleteHistoryItem,
    deleteSelectedHistoryItems,
    restoreProduct,
  };
}
