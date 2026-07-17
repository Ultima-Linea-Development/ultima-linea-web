import { cn } from "@/lib/utils";

type AdminSizeStockChipProps = {
  size: string;
  stock: number;
  /** Unidades reservadas de este talle (puede ser menor al stock). */
  reservedQuantity?: number;
  highlighted?: boolean;
  badgeAriaLabel?: string;
  className?: string;
};

export default function AdminSizeStockChip({
  size,
  stock,
  reservedQuantity = 0,
  highlighted = false,
  badgeAriaLabel,
  className,
}: AdminSizeStockChipProps) {
  const reservedQty = Math.max(0, Math.min(reservedQuantity, stock));
  const availableQty = Math.max(0, stock - reservedQty);
  const fullyReserved = reservedQty > 0 && availableQty === 0;
  const partiallyReserved = reservedQty > 0 && availableQty > 0;

  const badgeValue = partiallyReserved ? `${availableQty}/${stock}` : String(stock);

  const title = partiallyReserved
    ? `Talle ${size}: ${availableQty} disponible${availableQty === 1 ? "" : "s"} de ${stock} (${reservedQty} reservada${reservedQty === 1 ? "" : "s"})`
    : fullyReserved
      ? `Talle ${size} reservado (${reservedQty})`
      : undefined;

  return (
    <span className={cn("relative inline-flex shrink-0", partiallyReserved && "mr-1", className)}>
      <span
        className={cn(
          "inline-flex min-w-[1.75rem] items-center justify-center rounded-sm px-2 py-1 text-xs font-medium leading-none",
          partiallyReserved && "pr-3.5",
          fullyReserved
            ? "bg-amber-50 text-amber-800/80 ring-1 ring-dashed ring-amber-300/70"
            : highlighted
              ? "bg-muted"
              : "bg-muted/40"
        )}
        title={title}
      >
        {size}
      </span>
      <span
        className={cn(
          "absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none tabular-nums",
          partiallyReserved && "-right-2.5",
          fullyReserved ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
        )}
        aria-label={
          badgeAriaLabel ??
          (partiallyReserved
            ? `Talle ${size}: ${availableQty} disponibles de ${stock}, ${reservedQty} reservadas`
            : fullyReserved
              ? `Talle ${size} reservado, stock ${stock}`
              : `Stock ${stock}`)
        }
        title={title}
      >
        {badgeValue}
      </span>
    </span>
  );
}
