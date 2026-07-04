import Typography from "@/components/ui/Typography";
import type { AdminChartDatum } from "@/lib/admin-chart-data";
import { getAdminChartSeriesColor } from "@/lib/admin-chart-theme";

type AdminStatsChartLegendProps = {
  data: AdminChartDatum[];
  valueFormatter?: (value: number) => string;
};

export default function AdminStatsChartLegend({
  data,
  valueFormatter = (value) => String(value),
}: AdminStatsChartLegendProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((item, index) => {
        const share = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0";

        return (
          <li key={item.label} className="flex min-w-0 items-start gap-2">
            <span
              className="mt-1 size-3 shrink-0"
              style={{ backgroundColor: getAdminChartSeriesColor(index) }}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <Typography variant="body2" className="truncate">
                {item.label}
              </Typography>
              <Typography variant="caption" color="muted" className="tabular-nums">
                {valueFormatter(item.value)} · {share}%
              </Typography>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
