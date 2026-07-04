"use client";

import { useCallback, useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { adminStatsApi, type AdminStats } from "@/lib/api";

export function useAdminStats(refreshKey = 0) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshStats = useCallback(async () => {
    setIsLoading(true);
    try {
      setError("");
      const token = getToken();
      if (!token) {
        setStats(null);
        setError("Sesión expirada. Volvé a iniciar sesión.");
        return;
      }

      const response = await adminStatsApi.getAll(token);
      if (response.error) {
        setError(response.error);
        setStats(null);
        return;
      }

      setStats(response.data ?? null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshStats();
    });
  }, [refreshStats, refreshKey]);

  return {
    stats,
    isLoading,
    error,
    refreshStats,
  };
}
