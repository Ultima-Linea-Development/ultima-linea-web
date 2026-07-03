"use client";

import { useMemo } from "react";
import Box from "@/components/layout/Box";
import AdminSaleDateField from "@/components/admin/AdminSaleDateField";
import Input from "@/components/ui/Input";
import FormField from "@/components/ui/FormField";
import Select from "@/components/ui/Select";
import type { ExternalSeller, SaleAssignableUser } from "@/lib/api";
import {
  NEW_EXTERNAL_SELLER_VALUE,
  type SaleSellerFormValue,
} from "@/lib/sale-seller";
import { formatAssignableUserLabel } from "@/lib/user-display";

type AdminSaleSellerFieldProps = {
  value: SaleSellerFormValue;
  onChange: (value: SaleSellerFormValue) => void;
  assignableUsers: SaleAssignableUser[];
  externalSellers: ExternalSeller[];
  canAssignUser: boolean;
  currentUserId?: string | null;
  saleDate: string;
  onSaleDateChange: (value: string) => void;
  saleDateId?: string;
  disabled?: boolean;
  readOnlySeller?: boolean;
};

const fieldLabelClassName = "w-full min-w-0";

export default function AdminSaleSellerField({
  value,
  onChange,
  assignableUsers,
  externalSellers,
  canAssignUser,
  currentUserId = null,
  saleDate,
  onSaleDateChange,
  saleDateId = "sale-date",
  disabled = false,
  readOnlySeller = false,
}: AdminSaleSellerFieldProps) {
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

  const sellerDisabled = disabled || readOnlySeller;

  return (
    <Box display="flex" direction="col" gap="3" className="w-full min-w-0">
      <div className="grid w-full min-w-0 grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
        <div className="min-w-0 w-full">
          <FormField
            htmlFor={saleDateId}
            label="Fecha de venta"
            required
            className={fieldLabelClassName}
          >
            <AdminSaleDateField
              id={saleDateId}
              value={saleDate}
              onChange={onSaleDateChange}
              disabled={disabled}
              required
            />
          </FormField>
        </div>

        <div className="min-w-0 w-full">
          <FormField
            htmlFor="sale-seller-type"
            label="Vendedor"
            required
            className={fieldLabelClassName}
          >
            <Select
              id="sale-seller-type"
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
              disabled={sellerDisabled}
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
              htmlFor="sale-internal-seller"
              label="Usuario asignado"
              required
              className={fieldLabelClassName}
            >
              <Select
                id="sale-internal-seller"
                value={value.internalUserId}
                onChange={(event) =>
                  onChange({
                    ...value,
                    internalUserId: event.target.value,
                  })
                }
                disabled={sellerDisabled}
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
              htmlFor="sale-external-seller"
              label="Vendedor externo"
              required
              className={fieldLabelClassName}
            >
              <Select
                id="sale-external-seller"
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
                disabled={sellerDisabled}
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
          htmlFor="sale-external-seller-name"
          label="Nombre del vendedor"
          required
          className={fieldLabelClassName}
        >
          <Input
            id="sale-external-seller-name"
            value={value.externalSellerName}
            onChange={(event) =>
              onChange({
                ...value,
                externalSellerId: NEW_EXTERNAL_SELLER_VALUE,
                externalSellerName: event.target.value,
              })
            }
            disabled={sellerDisabled}
            required
          />
        </FormField>
      )}
    </Box>
  );
}
