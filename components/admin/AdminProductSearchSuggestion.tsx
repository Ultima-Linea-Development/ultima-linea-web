import Typography from "@/components/ui/Typography";
import AdminSearchSuggestionRow from "@/components/admin/AdminSearchSuggestionRow";
import AdminProductReservationBadge from "@/components/admin/AdminProductReservationBadge";
import type { ExternalSeller, Product, SaleAssignableUser } from "@/lib/api";
import { getProductPrimaryImageUrl } from "@/lib/admin-product-image";
import { getProductTotalStock } from "@/lib/product-inventory";
import { isProductReserved } from "@/lib/product-reservation";

type AdminProductSearchSuggestionProps = {
  product: Product;
  assignableUsers?: SaleAssignableUser[];
  externalSellers?: ExternalSeller[];
};

export default function AdminProductSearchSuggestion({
  product,
  assignableUsers = [],
  externalSellers = [],
}: AdminProductSearchSuggestionProps) {
  return (
    <AdminSearchSuggestionRow
      imageUrl={getProductPrimaryImageUrl(product)}
      trailing={`Stock ${getProductTotalStock(product)}`}
    >
      {isProductReserved(product) ? (
        <AdminProductReservationBadge
          product={product}
          size="sm"
          className="mb-1"
          assignableUsers={assignableUsers}
          externalSellers={externalSellers}
        />
      ) : null}
      <Typography variant="body2" as="span">
        {product.name}
      </Typography>
    </AdminSearchSuggestionRow>
  );
}
