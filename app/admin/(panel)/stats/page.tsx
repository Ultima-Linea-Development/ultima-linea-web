"use client";

import { Suspense, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import AdminCatalogStatsSection from "@/components/admin/AdminCatalogStatsSection";
import AdminOperationsStatsSection from "@/components/admin/AdminOperationsStatsSection";
import AdminSalesStatsSection from "@/components/admin/AdminSalesStatsSection";
import AdminSellerStatsSection from "@/components/admin/AdminSellerStatsSection";
import AdminStatsTabNav from "@/components/admin/AdminStatsTabNav";
import Spinner from "@/components/ui/Spinner";
import { ADMIN_PAGE_PADDING_CLASS } from "@/components/admin/AdminTable";
import {
  parseAdminStatsTabId,
  type AdminStatsTabId,
} from "@/lib/admin-stats-tabs";
import { useAdminStats } from "@/lib/hooks/use-admin-stats";
import { cn } from "@/lib/utils";

export default function AdminStatsPage() {
  return (
    <Suspense
      fallback={
        <Box display="flex" className="min-h-[12rem] items-center justify-center">
          <Spinner fullscreen={false} />
        </Box>
      }
    >
      <AdminStatsPageContent />
    </Suspense>
  );
}

function AdminStatsPageContent() {
  const { stats, isLoading, error } = useAdminStats();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = parseAdminStatsTabId(searchParams.get("tab"));

  const handleTabChange = useCallback(
    (tab: AdminStatsTabId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "catalog") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const renderActivePanel = () => {
    const panelProps = {
      isLoading,
      error,
    };

    switch (activeTab) {
      case "sales":
        return <AdminSalesStatsSection stats={stats?.sales ?? null} {...panelProps} />;
      case "sellers":
        return <AdminSellerStatsSection stats={stats?.sellers ?? null} {...panelProps} />;
      case "operations":
        return (
          <AdminOperationsStatsSection stats={stats?.operations ?? null} {...panelProps} />
        );
      case "catalog":
      default:
        return <AdminCatalogStatsSection stats={stats?.catalog ?? null} {...panelProps} />;
    }
  };

  return (
    <Box display="flex" direction="col" gap="6" className="w-full min-w-0">
      <div className={cn("flex flex-col gap-6", ADMIN_PAGE_PADDING_CLASS)}>
        <Box display="flex" direction="col" gap="2">
          <Typography variant="h1">Estadísticas</Typography>
        </Box>

        <AdminStatsTabNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {isLoading && !stats ? (
        <Box display="flex" className="min-h-[12rem] items-center justify-center">
          <Spinner fullscreen={false} />
        </Box>
      ) : error && !stats ? (
        <div className={ADMIN_PAGE_PADDING_CLASS}>
          <Typography variant="body2" color="destructive">
            {error}
          </Typography>
        </div>
      ) : (
        <div className={ADMIN_PAGE_PADDING_CLASS}>{renderActivePanel()}</div>
      )}
    </Box>
  );
}
