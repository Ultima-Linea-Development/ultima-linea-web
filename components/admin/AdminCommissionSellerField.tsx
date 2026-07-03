"use client";

import { useMemo } from "react";
import Box from "@/components/layout/Box";
import Input from "@/components/ui/Input";
import FormField from "@/components/ui/FormField";
import Select from "@/components/ui/Select";
import type { ExternalSeller, SaleAssignableUser } from "@/lib/api";
import {
  NEW_EXTERNAL_SELLER_VALUE,
  type SaleSellerFormValue,
} from "@/lib/sale-seller";
import { formatAssignableUserLabel } from "@/lib/user-display";

type AdminCommissionSellerFieldProps = {
  value: SaleSellerFormValue;
  onChange: (value: SaleSellerFormValue) => void;
  assignableUsers: SaleAssignableUser[];
  externalSellers: ExternalSeller[];
  canAssignUser: boolean;
  currentUserId?: string | null;
  disabled?: boolean;
};

const fieldLabelClassName = "w-full min-w-0";

export default function AdminCommissionSellerField({
  value,
  onChange,
  assignableUsers,
  externalSellers,
  canAssignUser,
  currentUserId = null,
  disabled = false,
}: AdminCommissionSellerFieldProps) {
  const internalSellerOptions = useMemo(() => {
    if (canAssignUser) return assignableUsers;
    if (!currentUserId) return [];

    const self = assignableUsers.find((user) => user.id === currentUserId);
    return self ? [self] : [];
  }, [assignableUsers, canAssignUser, currentUserId]);

  const showInternalAssignee = value.sellerType === "internal" && internalSellerOptions.length > 0;
  const showExternalPicker = value.sellerType === "external";
  const showNewExternalName =
    showExternalPicker &&
    (!value.externalSellerId || value.externalSellerId === NEW_EXTERNAL_SELLER_VALUE);

  return (
    <Box display="flex" direction="col" gap="3" className="w-full min-w-0">
      <div className="grid w-full min-w-0 grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        <div className="min-w-0 w-full">
          <FormField
            htmlFor="commission-seller-type"
            label="Vendedor"
            required
            className={fieldLabelClassName}
          >
            <Select
              id="commission-seller-type"
              value={value.sellerType}
              onChange={(event) => {
                const sellerType = event.target.value as SaleSellerFormValue["sellerType"];
                onChange({
                  ...value,
                  sellerType,
                  ...(sellerType === "internal" && !canAssignUser && currentUserId
                    ? { internalUserId: currentUserId }
                    : {}),
                });
              }}
              disabled={disabled}
              required
            >
              <option value="internal">Usuario del sistema</option>
              <option value="external">Vendedor externo</option>
            </Select>
          </FormField>
        </div>

        {showInternalAssignee && (
          <div className="min-w-0 w-full">
            <FormField
              htmlFor="commission-internal-seller"
              label="Usuario asignado"
              required
              className={fieldLabelClassName}
            >
              <Select
                id="commission-internal-seller"
                value={value.internalUserId}
                onChange={(event) =>
                  onChange({
                    ...value,
                    internalUserId: event.target.value,
                  })
                }
                disabled={disabled}
                required
              >
                {internalSellerOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {formatAssignableUserLabel(user)}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        )}

        {showExternalPicker && (
          <div className="min-w-0 w-full">
            <FormField
              htmlFor="commission-external-seller"
              label="Vendedor externo"
              required
              className={fieldLabelClassName}
            >
              <Select
                id="commission-external-seller"
                value={value.externalSellerId || NEW_EXTERNAL_SELLER_VALUE}
                onChange={(event) => {
                  const nextId = event.target.value;
                  onChange({
                    ...value,
                    externalSellerId: nextId,
                    externalSellerName:
                      nextId === NEW_EXTERNAL_SELLER_VALUE ? value.externalSellerName : "",
                  });
                }}
                disabled={disabled}
                required
              >
                {externalSellers.map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name}
                  </option>
                ))}
                <option value={NEW_EXTERNAL_SELLER_VALUE}>Agregar nuevo...</option>
              </Select>
            </FormField>
          </div>
        )}
      </div>

      {showNewExternalName && (
        <FormField
          htmlFor="commission-external-seller-name"
          label="Nombre del vendedor"
          required
          className={fieldLabelClassName}
        >
          <Input
            id="commission-external-seller-name"
            value={value.externalSellerName}
            onChange={(event) =>
              onChange({
                ...value,
                externalSellerId: NEW_EXTERNAL_SELLER_VALUE,
                externalSellerName: event.target.value,
              })
            }
            disabled={disabled}
            required
          />
        </FormField>
      )}
    </Box>
  );
}
