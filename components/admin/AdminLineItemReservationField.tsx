"use client";

import Box from "@/components/layout/Box";
import Label from "@/components/ui/Label";
import Typography from "@/components/ui/Typography";
import AdminCommissionSellerField from "@/components/admin/AdminCommissionSellerField";
import type { ExternalSeller, SaleAssignableUser } from "@/lib/api";
import type { SaleSellerFormValue } from "@/lib/sale-seller";

type AdminLineItemReservationFieldProps = {
  idPrefix: string;
  reserved: boolean;
  onReservedChange: (reserved: boolean) => void;
  reservationSellerValue: SaleSellerFormValue;
  onReservationSellerChange: (value: SaleSellerFormValue) => void;
  assignableUsers: SaleAssignableUser[];
  externalSellers: ExternalSeller[];
  canAssignUser: boolean;
  currentUserId?: string | null;
  disabled?: boolean;
  inheritSellerLabel?: string;
  showSellerField?: boolean;
  pendingCatalogProduct?: boolean;
};

export default function AdminLineItemReservationField({
  idPrefix,
  reserved,
  onReservedChange,
  reservationSellerValue,
  onReservationSellerChange,
  assignableUsers,
  externalSellers,
  canAssignUser,
  currentUserId = null,
  disabled = false,
  inheritSellerLabel,
  showSellerField = true,
  pendingCatalogProduct = false,
}: AdminLineItemReservationFieldProps) {
  const checkboxId = `${idPrefix}-reserved`;

  return (
    <Box display="flex" direction="col" gap="3" align="stretch" className="w-full min-w-0 self-stretch">
      <div className="flex items-start gap-2">
        <input
          id={checkboxId}
          type="checkbox"
          checked={reserved}
          onChange={(event) => onReservedChange(event.target.checked)}
          disabled={disabled}
          className="mt-1 size-4 shrink-0 cursor-pointer"
        />
        <Label htmlFor={checkboxId} className="cursor-pointer">
          <Typography variant="body2">
            {inheritSellerLabel
              ? pendingCatalogProduct
                ? `Reservar para ${inheritSellerLabel} (pendiente de catálogo)`
                : `Reservar del catálogo para ${inheritSellerLabel}`
              : pendingCatalogProduct
                ? "Reservar producto (pendiente de catálogo)"
                : "Reservar del catálogo"}
          </Typography>
        </Label>
      </div>

      {reserved && showSellerField && (
        <AdminCommissionSellerField
          value={reservationSellerValue}
          onChange={onReservationSellerChange}
          assignableUsers={assignableUsers}
          externalSellers={externalSellers}
          canAssignUser={canAssignUser}
          currentUserId={currentUserId}
          disabled={disabled}
        />
      )}
    </Box>
  );
}
