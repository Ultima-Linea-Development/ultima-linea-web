"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AdminStatsChartShell from "@/components/admin/charts/AdminStatsChartShell";
import AdminStatsChartTooltip from "@/components/admin/charts/AdminStatsChartTooltip";
import type { AdminChartDatum } from "@/lib/admin-chart-data";
import {
  ADMIN_CHART_DEFAULT_HEIGHT,
  ADMIN_CHART_THEME,
  ADMIN_CHART_TICK_STYLE,
  getAdminChartSeriesColor,
} from "@/lib/admin-chart-theme";
import { zIndex } from "@/lib/design-tokens";

type AdminStatsBarChartProps = {
  data: AdminChartDatum[];
  title?: string;
  layout?: "vertical" | "horizontal";
  height?: number;
  valueFormatter?: (value: number) => string;
  valueLabel?: string;
  emptyMessage?: string;
  coloredBars?: boolean;
};

export default function AdminStatsBarChart({
  data,
  title,
  layout = "vertical",
  height = ADMIN_CHART_DEFAULT_HEIGHT,
  valueFormatter,
  valueLabel,
  emptyMessage,
  coloredBars = false,
}: AdminStatsBarChartProps) {
  const chartData = data.filter((item) => item.value > 0);
  const isHorizontal = layout === "horizontal";
  const isEmpty = chartData.length === 0;
  const yAxisWidth = isHorizontal
    ? Math.min(220, Math.max(120, ...chartData.map((item) => item.label.length * 7)))
    : undefined;
  const chartHeight = isHorizontal
    ? Math.max(height, chartData.length * 44 + 48)
    : height;

  const formatLabelValue = (value: unknown) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return "";
    return valueFormatter ? valueFormatter(numeric) : String(numeric);
  };

  return (
    <AdminStatsChartShell
      title={title}
      height={chartHeight}
      isEmpty={isEmpty}
      emptyMessage={emptyMessage}
    >
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={chartData}
          layout={isHorizontal ? "vertical" : "horizontal"}
          margin={{
            top: isHorizontal ? 8 : 20,
            right: isHorizontal ? 72 : 12,
            left: isHorizontal ? 8 : 0,
            bottom: isHorizontal ? 8 : 0,
          }}
        >
          <CartesianGrid
            stroke={ADMIN_CHART_THEME.grid}
            strokeDasharray="3 3"
            vertical={!isHorizontal}
            horizontal
          />
          {isHorizontal ? (
            <>
              <XAxis
                type="number"
                tick={ADMIN_CHART_TICK_STYLE}
                axisLine={{ stroke: ADMIN_CHART_THEME.grid }}
                tickLine={false}
                tickFormatter={(value) => formatLabelValue(value)}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={yAxisWidth}
                tick={ADMIN_CHART_TICK_STYLE}
                axisLine={{ stroke: ADMIN_CHART_THEME.grid }}
                tickLine={false}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="label"
                tick={ADMIN_CHART_TICK_STYLE}
                axisLine={{ stroke: ADMIN_CHART_THEME.grid }}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tick={ADMIN_CHART_TICK_STYLE}
                axisLine={{ stroke: ADMIN_CHART_THEME.grid }}
                tickLine={false}
                tickFormatter={(value) => formatLabelValue(value)}
              />
            </>
          )}
          <Tooltip
            cursor={{ fill: "hsl(0 0% 96.1%)" }}
            wrapperStyle={{ zIndex: zIndex.tooltip, outline: "none" }}
            content={(props) => (
              <AdminStatsChartTooltip
                {...props}
                valueFormatter={valueFormatter}
                valueLabel={valueLabel}
              />
            )}
          />
          <Bar
            dataKey="value"
            fill={ADMIN_CHART_THEME.bar}
            radius={0}
            maxBarSize={isHorizontal ? 32 : 56}
          >
            {coloredBars
              ? chartData.map((entry, index) => (
                  <Cell key={entry.label} fill={getAdminChartSeriesColor(index)} />
                ))
              : null}
            <LabelList
              dataKey="value"
              position={isHorizontal ? "right" : "top"}
              formatter={formatLabelValue}
              style={{ fill: ADMIN_CHART_THEME.axis, fontSize: 11 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </AdminStatsChartShell>
  );
}
