"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import AdminStatsChartLegend from "@/components/admin/charts/AdminStatsChartLegend";
import AdminStatsChartShell from "@/components/admin/charts/AdminStatsChartShell";
import AdminStatsChartTooltip from "@/components/admin/charts/AdminStatsChartTooltip";
import type { AdminChartDatum } from "@/lib/admin-chart-data";
import {
  ADMIN_CHART_DEFAULT_HEIGHT,
  getAdminChartSeriesColor,
} from "@/lib/admin-chart-theme";
import { zIndex } from "@/lib/design-tokens";

type AdminStatsPieChartProps = {
  data: AdminChartDatum[];
  title?: string;
  height?: number;
  valueFormatter?: (value: number) => string;
  valueLabel?: string;
  emptyMessage?: string;
};

export default function AdminStatsPieChart({
  data,
  title,
  height = ADMIN_CHART_DEFAULT_HEIGHT,
  valueFormatter,
  valueLabel,
  emptyMessage,
}: AdminStatsPieChartProps) {
  const chartData = data.filter((item) => item.value > 0);
  const isEmpty = chartData.length === 0;
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <AdminStatsChartShell
      title={title}
      height={height}
      isEmpty={isEmpty}
      emptyMessage={emptyMessage}
      footer={
        <AdminStatsChartLegend data={chartData} valueFormatter={valueFormatter} />
      }
    >
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            outerRadius="82%"
            innerRadius="0%"
            paddingAngle={1}
            stroke="hsl(0 0% 100%)"
            strokeWidth={1}
            label={({ name, percent }) =>
              percent != null && percent >= 0.08
                ? `${name} (${(percent * 100).toFixed(0)}%)`
                : ""
            }
            labelLine={{ stroke: "hsl(0 0% 46.3%)", strokeWidth: 1 }}
          >
            {chartData.map((entry, index) => (
              <Cell key={entry.label} fill={getAdminChartSeriesColor(index)} />
            ))}
          </Pie>
          <Tooltip
            wrapperStyle={{ zIndex: zIndex.tooltip, outline: "none" }}
            content={(props) => (
              <AdminStatsChartTooltip
                {...props}
                valueFormatter={valueFormatter}
                valueLabel={valueLabel}
                total={total}
                showShare
              />
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </AdminStatsChartShell>
  );
}
