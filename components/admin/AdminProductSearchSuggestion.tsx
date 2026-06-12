import Typography from "@/components/ui/Typography";
import type { Product } from "@/lib/api";
import { getProductTotalStock } from "@/lib/product-inventory";

type AdminProductSearchSuggestionProps = {
  product: Product;
};

export default function AdminProductSearchSuggestion({ product }: AdminProductSearchSuggestionProps) {
  return (
    <>
      <span className="min-w-0">
        <Typography variant="body2" as="span">
          {product.name}
        </Typography>
      </span>
      <span className="shrink-0 text-muted-foreground text-xs">
        Stock {getProductTotalStock(product)}
      </span>
    </>
  );
}
