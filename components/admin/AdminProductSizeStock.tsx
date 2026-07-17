"use client";

import AdminSizeStockChip from "@/components/admin/AdminSizeStockChip";
import Typography from "@/components/ui/Typography";
import type { Product } from "@/lib/api";
import {
  formatProductSizeStockDisplay,
  getProductStockEntries,
  getProductTotalStock,
} from "@/lib/product-inventory";
import { getReservedQuantityForSize } from "@/lib/product-reservation";
import { cn } from "@/lib/utils";

const VISIBLE_SIZE_LIMIT = 4;

type AdminProductSizeStockProps = {
  product: Product;
  className?: string;
  highlightSize?: string;
};

export default function AdminProductSizeStock({
  product,
  className,
  highlightSize,
}: AdminProductSizeStockProps) {
  const entries = getProductStockEntries(product).filter(([size]) =>
    highlightSize ? size === highlightSize : true
  );

  if (entries.length === 0) {
    if (highlightSize) {
      return (
        <Typography variant="body2" className={className}>
          —
        </Typography>
      );
    }

    const total = formatProductSizeStockDisplay(getProductTotalStock(product));
    if (!total) {
      return (
        <Typography variant="body2" className={className}>
          —
        </Typography>
      );
    }

    return (
      <Typography variant="body2" className={cn("tabular-nums", className)}>
        {total}
      </Typography>
    );
  }

  const visible = entries.slice(0, VISIBLE_SIZE_LIMIT);
  const hidden = entries.slice(VISIBLE_SIZE_LIMIT);

  return (
    <div className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-2 pt-0.5", className)}>
      {visible.map(([size, stock]) => (
        <AdminSizeStockChip
          key={size}
          size={size}
          stock={stock}
          reservedQuantity={getReservedQuantityForSize(product, size)}
          highlighted={highlightSize === size}
        />
      ))}

      {hidden.length > 0 && (
        <div className="group relative shrink-0">
          <span
            className="inline-flex cursor-default rounded-sm bg-muted/40 px-2 py-1 text-xs font-medium text-muted-foreground tabular-nums"
            tabIndex={0}
            aria-label={`${hidden.length} talles más`}
          >
            +{hidden.length}
          </span>
          <div
            role="tooltip"
            className="absolute left-0 top-full z-30 mt-1.5 hidden flex-wrap gap-x-1.5 gap-y-2 border border-border bg-background p-2 shadow-sm group-hover:flex group-focus-within:flex"
          >
            {hidden.map(([size, stock]) => (
              <AdminSizeStockChip
                key={size}
                size={size}
                stock={stock}
                reservedQuantity={getReservedQuantityForSize(product, size)}
                highlighted={highlightSize === size}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
