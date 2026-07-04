"use client";

import Typography from "@/components/ui/Typography";
import AdminTextLink from "@/components/admin/AdminTextLink";
import {
  ADMIN_STATS_TABS,
  type AdminStatsTabId,
} from "@/lib/admin-stats-tabs";

type AdminStatsTabNavProps = {
  activeTab: AdminStatsTabId;
  onTabChange: (tab: AdminStatsTabId) => void;
};

export default function AdminStatsTabNav({
  activeTab,
  onTabChange,
}: AdminStatsTabNavProps) {
  return (
    <nav
      aria-label="Secciones de estadísticas"
      className="flex flex-wrap items-center gap-2 border-b border-border pb-3"
    >
      {ADMIN_STATS_TABS.map((tab, index) => (
        <span key={tab.id} className="inline-flex items-center gap-2">
          {index > 0 ? (
            <Typography variant="body2" color="muted" as="span" aria-hidden="true">
              |
            </Typography>
          ) : null}
          <AdminTextLink
            selected={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
          >
            <Typography variant="body2" as="span">
              {tab.label}
            </Typography>
          </AdminTextLink>
        </span>
      ))}
    </nav>
  );
}
