"use client";

import Typography from "@/components/ui/Typography";
import type { Product } from "@/lib/api";
import {
  formatProductSizeStockDisplay,
  getProductStockEntries,
  getProductTotalStock,
} from "@/lib/product-inventory";
import { cn } from "@/lib/utils";

const VISIBLE_SIZE_LIMIT = 4;

type AdminProductSizeStockProps = {
  product: Product;
  className?: string;
  highlightSize?: string;
};

function SizeStockBadge({ size, stock }: { size: string; stock: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs tabular-nums whitespace-nowrap">
      <span className="font-medium">{size}</span>
      <span className="text-muted-foreground">{stock}</span>
    </span>
  );
}

export default function AdminProductSizeStock({
  product,
  className,
  highlightSize,
}: AdminProductSizeStockProps) {
  const entries = getProductStockEntries(product).filter(([size]) =>
    highlightSize ? size === highlightSize : true
  );

  if (entries.length === 0) {
    const total = formatProductSizeStockDisplay(getProductTotalStock(product));
    if (!total) return null;

    return (
      <Typography variant="body2" className={cn("tabular-nums", className)}>
        {total}
      </Typography>
    );
  }

  const visible = entries.slice(0, VISIBLE_SIZE_LIMIT);
  const hidden = entries.slice(VISIBLE_SIZE_LIMIT);

  return (
    <div className={cn("flex max-w-[220px] flex-wrap items-center gap-1", className)}>
      {visible.map(([size, stock]) => (
        <SizeStockBadge key={size} size={size} stock={stock} />
      ))}

      {hidden.length > 0 && (
        <div className="group relative">
          <span
            className="inline-flex cursor-default rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground tabular-nums"
            tabIndex={0}
            aria-label={`${hidden.length} talles más`}
          >
            +{hidden.length}
          </span>
          <div
            role="tooltip"
            className="absolute left-0 top-full z-30 mt-1 hidden min-w-[9rem] max-w-[240px] flex-wrap gap-1 border border-border bg-background p-2 shadow-sm group-hover:flex group-focus-within:flex"
          >
            {hidden.map(([size, stock]) => (
              <SizeStockBadge key={size} size={size} stock={stock} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
