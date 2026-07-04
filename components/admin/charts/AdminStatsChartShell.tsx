import type { ReactNode } from "react";
import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import { ADMIN_CHART_DEFAULT_HEIGHT } from "@/lib/admin-chart-theme";
import { cn } from "@/lib/utils";

type AdminStatsChartShellProps = {
  title?: string;
  height?: number;
  emptyMessage?: string;
  isEmpty?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export default function AdminStatsChartShell({
  title,
  height = ADMIN_CHART_DEFAULT_HEIGHT,
  emptyMessage = "Sin datos para graficar",
  isEmpty = false,
  children,
  footer,
  className,
}: AdminStatsChartShellProps) {
  return (
    <Box display="flex" direction="col" gap="2" className={cn("w-full min-w-0", className)}>
      {title ? (
        <Typography variant="body2" className="font-medium">
          {title}
        </Typography>
      ) : null}
      <div className="w-full overflow-visible border border-border bg-background">
        <div className="overflow-visible px-2 py-3 sm:px-3" style={{ height: isEmpty ? height : undefined, minHeight: isEmpty ? undefined : height }}>
          {isEmpty ? (
            <Box display="flex" className="h-full min-h-[inherit] items-center justify-center">
              <Typography variant="body2" color="muted">
                {emptyMessage}
              </Typography>
            </Box>
          ) : (
            <div className="h-full min-h-[inherit] w-full overflow-visible">{children}</div>
          )}
        </div>
        {!isEmpty && footer ? (
          <div className="border-t border-border px-3 py-3 sm:px-4">{footer}</div>
        ) : null}
      </div>
    </Box>
  );
}
