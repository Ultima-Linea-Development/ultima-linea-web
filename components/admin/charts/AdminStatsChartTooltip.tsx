"use client";

import { ADMIN_CHART_THEME } from "@/lib/admin-chart-theme";
import { zIndex } from "@/lib/design-tokens";

type TooltipPayloadItem = {
  value?: unknown;
  name?: unknown;
  payload?: Record<string, unknown>;
};

type AdminStatsChartTooltipProps = {
  active?: boolean;
  payload?: readonly TooltipPayloadItem[];
  label?: string | number;
  valueFormatter?: (value: number) => string;
  valueLabel?: string;
  total?: number;
  showShare?: boolean;
};

export default function AdminStatsChartTooltip({
  active,
  payload,
  label,
  valueFormatter = (value) => String(value),
  valueLabel = "Valor",
  total = 0,
  showShare = false,
}: AdminStatsChartTooltipProps) {
  const entry = payload?.[0];
  if (!active || !entry) return null;

  const rawValue = entry.value;
  const numericValue = Array.isArray(rawValue)
    ? Number(rawValue[0])
    : Number(rawValue);
  if (Number.isNaN(numericValue)) return null;

  const itemLabel = String(
    entry.payload?.label ?? entry.name ?? label ?? "—"
  );
  const share =
    showShare && total > 0
      ? `${((numericValue / total) * 100).toFixed(1)}% del total`
      : null;

  return (
    <div
      className="pointer-events-none border px-3 py-2 text-sm shadow-md"
      style={{
        zIndex: zIndex.tooltip,
        borderColor: ADMIN_CHART_THEME.tooltipBorder,
        backgroundColor: ADMIN_CHART_THEME.tooltipBackground,
        color: ADMIN_CHART_THEME.tooltipText,
      }}
    >
      <p className="font-medium">{itemLabel}</p>
      <p className="tabular-nums" style={{ color: ADMIN_CHART_THEME.tooltipMuted }}>
        {valueLabel}: {valueFormatter(numericValue)}
      </p>
      {share ? (
        <p className="tabular-nums" style={{ color: ADMIN_CHART_THEME.tooltipMuted }}>
          {share}
        </p>
      ) : null}
    </div>
  );
}
