export const ADMIN_CHART_THEME = {
  grid: "hsl(0 0% 89.8%)",
  axis: "hsl(0 0% 46.3%)",
  bar: "hsl(0 0% 20%)",
  barMuted: "hsl(0 0% 55%)",
  tooltipBorder: "hsl(0 0% 89.8%)",
  tooltipBackground: "hsl(0 0% 100%)",
  tooltipText: "hsl(0 0% 0%)",
  tooltipMuted: "hsl(0 0% 46.3%)",
  series: [
    "hsl(0 0% 15%)",
    "hsl(0 0% 30%)",
    "hsl(0 0% 45%)",
    "hsl(0 0% 60%)",
    "hsl(0 0% 72%)",
  ],
} as const;

export const ADMIN_CHART_DEFAULT_HEIGHT = 320;

export const ADMIN_CHART_TICK_STYLE = {
  fill: ADMIN_CHART_THEME.axis,
  fontSize: 12,
} as const;

export function getAdminChartSeriesColor(index: number): string {
  return ADMIN_CHART_THEME.series[index % ADMIN_CHART_THEME.series.length];
}
