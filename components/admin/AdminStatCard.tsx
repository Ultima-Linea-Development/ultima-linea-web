import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import { cn } from "@/lib/utils";

type AdminStatCardProps = {
  label: string;
  value: string;
  hint?: string;
  className?: string;
};

export default function AdminStatCard({
  label,
  value,
  hint,
  className,
}: AdminStatCardProps) {
  return (
    <Box
      display="flex"
      direction="col"
      gap="1"
      className={cn(
        "w-full min-w-0 border border-border bg-background px-3 py-2.5 sm:px-4 sm:py-3",
        className
      )}
    >
      <Typography variant="caption" color="muted">
        {label}
      </Typography>
      <Typography variant="h3" as="p" className="tabular-nums">
        {value}
      </Typography>
      {hint ? (
        <Typography variant="caption" color="muted">
          {hint}
        </Typography>
      ) : null}
    </Box>
  );
}
