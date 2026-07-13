"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Box from "@/components/layout/Box";
import Form from "@/components/ui/Form";
import Input from "@/components/ui/Input";
import FormField from "@/components/ui/FormField";
import Textarea from "@/components/ui/Textarea";
import Typography from "@/components/ui/Typography";
import Select from "@/components/ui/Select";
import { Button } from "@/components/ui/button";
import AdminCommissionSellerField from "@/components/admin/AdminCommissionSellerField";
import AdminSaleDateField from "@/components/admin/AdminSaleDateField";
import AdminSupplierOrderLineItemRow, {
  createEmptySupplierOrderLineItemDraft,
  createLineItemReservationSellerValue,
  getSupplierOrderLineItemIdentityRequestFields,
  getSupplierOrderLineItemDraftTotal,
  getSupplierOrderLineItemReservationRequestFields,
  lineItemDraftHasReservationEnabled,
  validateSupplierOrderLineItemIdentity,
  type SupplierOrderLineItemDraft,
} from "@/components/admin/AdminSupplierOrderLineItemRow";
import type {
  Commission,
  CommissionStatus,
  ExternalSeller,
  Product,
  ProductOptionsResponse,
  SaleAssignableUser,
  UpdateCommissionRequest,
} from "@/lib/api";
import { productsApi } from "@/lib/api";
import { EMPTY_PRODUCT_OPTIONS } from "@/lib/product-options";
import {
  buildProductName,
  DEFAULT_PRODUCT_TYPE,
  extractKitTypeFromName,
  extractProductTypeFromName,
} from "@/lib/product-name";
import { COMMISSION_STATUS_OPTIONS } from "@/lib/commission-display";
import {
  createDefaultCommissionSellerValue,
  commissionSellerValueToPayload,
  commissionToSellerFormValue,
  validateCommissionSellerValue,
} from "@/lib/commission-seller";
import { type SaleSellerFormValue } from "@/lib/sale-seller";
import { sizeRowsFromLineItem, sizeRowsToPayload, reservationRowsFromLineItem } from "@/lib/supplier-order-sizes";
import { saleDateInputToApiValue, saleDateIsoToDisplayValue } from "@/lib/sale-date";
import { formatPrice } from "@/lib/utils";
import { getSaleSellerLabel } from "@/lib/sale-seller";

type AdminCommissionEditFormProps = {
  commission: Commission;
  products: Product[];
  assignableUsers: SaleAssignableUser[];
  externalSellers: ExternalSeller[];
  currentUserId: string | null;
  canAssignUser: boolean;
  isSubmitting: boolean;
  onSave: (payload: UpdateCommissionRequest) => Promise<boolean>;
  onError: (message: string) => void;
  onCancel?: () => void;
};

const fieldLabelClassName = "w-full min-w-0";

function commissionItemToDraft(
  item: Commission["items"][number],
  products: Product[],
  currentUserId: string | null
): SupplierOrderLineItemDraft {
  const matchedProduct = item.product_id
    ? products.find((product) => product.id === item.product_id)
    : products.find(
        (product) => product.name.toLocaleLowerCase() === item.shirt_name.toLocaleLowerCase()
      );

  const productType = item.product_type ?? extractProductTypeFromName(item.shirt_name) ?? DEFAULT_PRODUCT_TYPE;
  const kitType = item.kit_type ?? extractKitTypeFromName(item.shirt_name) ?? "";
  const team = item.team ?? matchedProduct?.team ?? "";
  const season = item.season ?? matchedProduct?.season ?? "";
  const generatedName = buildProductName({
    productType,
    kitType,
    team,
    season,
    type: item.type,
  });

  return {
    key: item.id,
    productId: item.product_id ?? matchedProduct?.id,
    productName: item.shirt_name,
    isNameManuallyEdited: item.shirt_name.trim() !== generatedName.trim(),
    productType,
    kitType,
    team,
    league: item.league ?? matchedProduct?.league ?? "",
    season,
    isCustomProductType: false,
    isCustomKitType: false,
    isCustomTeam: false,
    isCustomLeague: false,
    isCustomSeason: false,
    isCustomProduct: !item.product_id && !matchedProduct,
    type: item.type,
    sizeRows: sizeRowsFromLineItem(item),
    reservationRows: reservationRowsFromLineItem(item, currentUserId),
    dorsal: item.dorsal ?? "",
    description: item.description ?? "",
    link: item.link ?? "",
    price: String(item.price),
    isCustomPrice: true,
    reserveProduct: Boolean(item.reserved),
    reservationSellerValue: createLineItemReservationSellerValue(
      {
        reservationSellerValue: createDefaultCommissionSellerValue(currentUserId),
        reserved_for_user_id: item.reserved_for_user_id,
        reserved_for_external_seller_id: item.reserved_for_external_seller_id,
        reserved_for_external_seller_name: item.reserved_for_external_seller_name,
      },
      currentUserId
    ),
  };
}

function draftToRequestItem(
  item: SupplierOrderLineItemDraft,
  sellerPayload: ReturnType<typeof commissionSellerValueToPayload>
) {
  const sizesPayload = sizeRowsToPayload(item.sizeRows);
  if (!sizesPayload) {
    throw new Error("invalid sizes");
  }

  return {
    id: item.key,
    product_id: item.productId,
    shirt_name: item.productName.trim(),
    ...getSupplierOrderLineItemIdentityRequestFields(item),
    ...getSupplierOrderLineItemReservationRequestFields(item, {
      mode: "inherit",
      sellerPayload,
    }),
    quantity: sizesPayload.quantity,
    type: item.type,
    sizes: sizesPayload.sizes,
    quantity_by_sizes: sizesPayload.quantity_by_sizes,
    dorsal: item.dorsal.trim() || undefined,
    description: item.description.trim() || undefined,
    link: item.link.trim() || undefined,
    price: Number(item.price),
  };
}

function validateLineItems(lineItems: SupplierOrderLineItemDraft[]): string | null {
  if (lineItems.length === 0) {
    return "Agregá al menos un producto.";
  }

  for (const item of lineItems) {
    if (!item.productName.trim()) {
      return "Cada producto necesita un nombre.";
    }

    const identityError = validateSupplierOrderLineItemIdentity(item);
    if (identityError) return identityError;

    const sizesPayload = sizeRowsToPayload(item.sizeRows);
    if (!sizesPayload) {
      return `Indicá al menos un talle con cantidad para ${item.productName || "un producto"}.`;
    }

    const price = Number(item.price);
    if (!Number.isFinite(price) || price < 0) {
      return `Precio inválido para ${item.productName}.`;
    }
  }

  return null;
}

export default function AdminCommissionEditForm({
  commission,
  products,
  assignableUsers,
  externalSellers,
  currentUserId,
  canAssignUser,
  isSubmitting,
  onSave,
  onError,
  onCancel,
}: AdminCommissionEditFormProps) {
  const isReadOnly = commission.status === "exported";

  const [customerName, setCustomerName] = useState(commission.customer_name);
  const [customerContact, setCustomerContact] = useState(commission.customer_contact ?? "");
  const [commissionDate, setCommissionDate] = useState(() =>
    saleDateIsoToDisplayValue(commission.created_at)
  );
  const [status, setStatus] = useState<CommissionStatus>(commission.status);
  const [notes, setNotes] = useState(commission.notes ?? "");
  const [sellerValue, setSellerValue] = useState<SaleSellerFormValue>(() =>
    commissionToSellerFormValue(commission, currentUserId)
  );
  const [lineItems, setLineItems] = useState<SupplierOrderLineItemDraft[]>(() =>
    commission.items.map((item) => commissionItemToDraft(item, products, currentUserId))
  );
  const [productOptions, setProductOptions] = useState<ProductOptionsResponse>(
    EMPTY_PRODUCT_OPTIONS
  );

  useEffect(() => {
    let isMounted = true;

    const loadProductOptions = async () => {
      const response = await productsApi.getOptions();
      if (isMounted && response.data) {
        setProductOptions(response.data);
      }
    };

    void loadProductOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  const commissionTotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + getSupplierOrderLineItemDraftTotal(item), 0),
    [lineItems]
  );

  const inheritSellerLabel = useMemo(
    () =>
      getSaleSellerLabel(
        {
          created_by: sellerValue.internalUserId,
          external_seller_name:
            sellerValue.sellerType === "external"
              ? sellerValue.externalSellerName ||
                externalSellers.find((seller) => seller.id === sellerValue.externalSellerId)?.name
              : undefined,
        },
        assignableUsers
      ),
    [sellerValue, assignableUsers, externalSellers]
  );

  const updateLineItem = (
    key: string,
    updates: Partial<Omit<SupplierOrderLineItemDraft, "key">>
  ) => {
    setLineItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...updates } : item))
    );
  };

  const removeLineItem = (key: string) => {
    setLineItems((prev) => prev.filter((item) => item.key !== key));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isReadOnly) {
      onError("Este encargo ya fue exportado y no se puede editar.");
      return;
    }

    const trimmedCustomerName = customerName.trim();
    if (!trimmedCustomerName) {
      onError("El nombre del cliente es obligatorio.");
      return;
    }

    const sellerError = validateCommissionSellerValue(sellerValue, canAssignUser);
    if (sellerError) {
      onError(sellerError);
      return;
    }

    const itemsError = validateLineItems(lineItems);
    if (itemsError) {
      onError(itemsError);
      return;
    }

    const commissionDateApiValue = saleDateInputToApiValue(commissionDate);
    if (!commissionDateApiValue) {
      onError("Fecha del encargo inválida.");
      return;
    }

    const initialSeller = commissionToSellerFormValue(commission, currentUserId);
    const sellerChanged =
      sellerValue.sellerType !== initialSeller.sellerType ||
      sellerValue.internalUserId !== initialSeller.internalUserId ||
      sellerValue.externalSellerId !== initialSeller.externalSellerId ||
      sellerValue.externalSellerName.trim() !== initialSeller.externalSellerName.trim();

    const reservationSellerPayload = commissionSellerValueToPayload(
      canAssignUser ? sellerValue : initialSeller,
      canAssignUser
    );

    await onSave({
      customer_name: trimmedCustomerName,
      customer_contact: customerContact.trim(),
      commission_date: commissionDateApiValue,
      status,
      notes: notes.trim(),
      ...(canAssignUser && sellerChanged
        ? commissionSellerValueToPayload(sellerValue, canAssignUser)
        : {}),
      items: lineItems.map((item) => draftToRequestItem(item, reservationSellerPayload)),
    });
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Box display="flex" direction="col" gap="4" align="stretch" className="w-full min-w-0">
        <div className="grid w-full min-w-0 grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          <FormField htmlFor="edit-commission-customer-name" label="Cliente" required className={fieldLabelClassName}>
            <Input
              id="edit-commission-customer-name"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              disabled={isSubmitting || isReadOnly}
              required
            />
          </FormField>

          <FormField htmlFor="edit-commission-customer-contact" label="Contacto del cliente" className={fieldLabelClassName}>
            <Input
              id="edit-commission-customer-contact"
              value={customerContact}
              onChange={(event) => setCustomerContact(event.target.value)}
              disabled={isSubmitting || isReadOnly}
            />
          </FormField>
        </div>

        <div className="grid w-full min-w-0 grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          <FormField htmlFor="edit-commission-date" label="Fecha del encargo" required className={fieldLabelClassName}>
            <AdminSaleDateField
              id="edit-commission-date"
              value={commissionDate}
              onChange={setCommissionDate}
              disabled={isSubmitting || isReadOnly}
              required
            />
          </FormField>

          <FormField htmlFor="edit-commission-status" label="Estado" required className={fieldLabelClassName}>
            <Select
              id="edit-commission-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as CommissionStatus)}
              disabled={isSubmitting || isReadOnly}
              required
            >
              {COMMISSION_STATUS_OPTIONS.filter((option) => option.value !== "exported").map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              {commission.status === "exported" && (
                <option value="exported">Exportado</option>
              )}
            </Select>
          </FormField>
        </div>

        <AdminCommissionSellerField
          value={sellerValue}
          onChange={setSellerValue}
          assignableUsers={assignableUsers}
          externalSellers={externalSellers}
          canAssignUser={canAssignUser}
          currentUserId={currentUserId}
          disabled={isSubmitting || isReadOnly || !canAssignUser}
        />

        <FormField htmlFor="edit-commission-notes" label="Notas" className={fieldLabelClassName}>
          <Textarea
            id="edit-commission-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={isSubmitting || isReadOnly}
            rows={2}
          />
        </FormField>

        {!isReadOnly ? (
          <Box display="flex" gap="3" className="justify-end flex-wrap">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar cambios"}
            </Button>
          </Box>
        ) : (
          <Box display="flex" gap="3" className="justify-end flex-wrap">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cerrar
              </Button>
            )}
          </Box>
        )}

        <Box display="flex" direction="col" gap="3" align="stretch" className="w-full min-w-0">
          <Box display="flex" className="items-center justify-between gap-4">
            <Typography variant="h3">Productos</Typography>
            {!isReadOnly && (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setLineItems((prev) => [createEmptySupplierOrderLineItemDraft(), ...prev])
                }
                disabled={isSubmitting}
              >
                Agregar producto
              </Button>
            )}
          </Box>

          {lineItems.map((item) => (
            <AdminSupplierOrderLineItemRow
              key={item.key}
              item={item}
              products={products}
              productOptions={productOptions}
              isSubmitting={isSubmitting || isReadOnly}
              reservationConfig={{
                mode: "inherit",
                inheritSellerLabel,
                assignableUsers,
                externalSellers,
                canAssignUser,
                currentUserId,
              }}
              onChange={updateLineItem}
              onRemove={removeLineItem}
            />
          ))}
        </Box>

        <Typography variant="body" className="text-right">
          Total estimado: {formatPrice(commissionTotal)}
        </Typography>

        {!isReadOnly ? (
          <Box display="flex" gap="3" className="justify-end flex-wrap">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar cambios"}
            </Button>
          </Box>
        ) : (
          <Box display="flex" gap="3" className="justify-end flex-wrap">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cerrar
              </Button>
            )}
          </Box>
        )}
      </Box>
    </Form>
  );
}
