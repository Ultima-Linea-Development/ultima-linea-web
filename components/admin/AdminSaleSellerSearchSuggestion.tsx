import Typography from "@/components/ui/Typography";
import type { SaleAssignableUser } from "@/lib/api";
import { formatAssignableUserLabel } from "@/lib/user-display";

type AdminSaleSellerSearchSuggestionProps = {
  user: SaleAssignableUser;
};

export default function AdminSaleSellerSearchSuggestion({
  user,
}: AdminSaleSellerSearchSuggestionProps) {
  const label = formatAssignableUserLabel(user);

  return (
    <Typography variant="body2" as="span">
      Usuario: &quot;{label}&quot;
    </Typography>
  );
}
