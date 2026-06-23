"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Box from "@/components/layout/Box";
import Form from "@/components/ui/Form";
import Input from "@/components/ui/Input";
import FormField from "@/components/ui/FormField";
import Textarea from "@/components/ui/Textarea";
import Typography from "@/components/ui/Typography";
import { Button } from "@/components/ui/button";
import AdminCommissionSellerField from "@/components/admin/AdminCommissionSellerField";
import AdminSaleDateField from "@/components/admin/AdminSaleDateField";
import AdminSupplierOrderLineItemRow, {
  createEmptySupplierOrderLineItemDraft,
  getSupplierOrderLineItemIdentityRequestFields,
  getSupplierOrderLineItemDraftTotal,
  validateSupplierOrderLineItemIdentity,
  type SupplierOrderLineItemDraft,
} from "@/components/admin/AdminSupplierOrderLineItemRow";
import type {
  CreateCommissionRequest,
  ExternalSeller,
  Product,
  ProductOptionsResponse,
  SaleAssignableUser,
} from "@/lib/api";
import { productsApi } from "@/lib/api";
import { EMPTY_PRODUCT_OPTIONS } from "@/lib/product-options";
import {
  commissionSellerValueToPayload,
  createDefaultCommissionSellerValue,
  validateCommissionSellerValue,
} from "@/lib/commission-seller";
import { type SaleSellerFormValue } from "@/lib/sale-seller";
import { sizeRowsToPayload } from "@/lib/supplier-order-sizes";
import { getTodaySaleDateDisplayValue, saleDateInputToApiValue } from "@/lib/sale-date";
import { formatPrice } from "@/lib/utils";

const fieldLabelClassName = "w-full min-w-0";

type AdminCommissionFormProps = {
  products: Product[];
  assignableUsers: SaleAssignableUser[];
  externalSellers: ExternalSeller[];
  currentUserId: string | null;
  canAssignUser: boolean;
  isSubmitting: boolean;
  onCreate: (payload: CreateCommissionRequest) => Promise<boolean>;
  onError: (message: string) => void;
  onCancel?: () => void;
};

function draftToRequestItem(item: SupplierOrderLineItemDraft) {
  const sizesPayload = sizeRowsToPayload(item.sizeRows);
  if (!sizesPayload) {
    throw new Error("invalid sizes");
  }

  return {
    product_id: item.productId,
    shirt_name: item.productName.trim(),
    ...getSupplierOrderLineItemIdentityRequestFields(item),
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

export default function AdminCommissionForm({
  products,
  assignableUsers,
  externalSellers,
  currentUserId,
  canAssignUser,
  isSubmitting,
  onCreate,
  onError,
  onCancel,
}: AdminCommissionFormProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [commissionDate, setCommissionDate] = useState(() => getTodaySaleDateDisplayValue());
  const [notes, setNotes] = useState("");
  const [sellerValue, setSellerValue] = useState<SaleSellerFormValue>(() =>
    createDefaultCommissionSellerValue(currentUserId)
  );
  const [lineItems, setLineItems] = useState<SupplierOrderLineItemDraft[]>([
    createEmptySupplierOrderLineItemDraft(),
  ]);
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

    const success = await onCreate({
      customer_name: trimmedCustomerName,
      customer_contact: customerContact.trim() || undefined,
      commission_date: commissionDateApiValue,
      notes: notes.trim(),
      ...commissionSellerValueToPayload(sellerValue, canAssignUser),
      items: lineItems.map(draftToRequestItem),
    });

    if (success) {
      setCustomerName("");
      setCustomerContact("");
      setCommissionDate(getTodaySaleDateDisplayValue());
      setNotes("");
      setSellerValue(createDefaultCommissionSellerValue(currentUserId));
      setLineItems([createEmptySupplierOrderLineItemDraft()]);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Box display="flex" direction="col" gap="4" align="stretch" className="w-full min-w-0">
        <div className="grid w-full min-w-0 grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          <FormField htmlFor="commission-customer-name" label="Cliente" required className={fieldLabelClassName}>
            <Input
              id="commission-customer-name"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </FormField>

          <FormField htmlFor="commission-customer-contact" label="Contacto del cliente" className={fieldLabelClassName}>
            <Input
              id="commission-customer-contact"
              value={customerContact}
              onChange={(event) => setCustomerContact(event.target.value)}
              disabled={isSubmitting}
              placeholder="Teléfono, WhatsApp..."
            />
          </FormField>
        </div>

        <FormField htmlFor="commission-date" label="Fecha del encargo" required className={fieldLabelClassName}>
          <AdminSaleDateField
            id="commission-date"
            value={commissionDate}
            onChange={setCommissionDate}
            disabled={isSubmitting}
            required
          />
        </FormField>

        <AdminCommissionSellerField
          value={sellerValue}
          onChange={setSellerValue}
          assignableUsers={assignableUsers}
          externalSellers={externalSellers}
          canAssignUser={canAssignUser}
          currentUserId={currentUserId}
          disabled={isSubmitting}
        />

        <FormField htmlFor="commission-notes" label="Notas" className={fieldLabelClassName}>
          <Textarea
            id="commission-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={isSubmitting}
            rows={2}
          />
        </FormField>

        <Box display="flex" direction="col" gap="3" align="stretch" className="w-full min-w-0">
          <Box display="flex" className="items-center justify-between gap-4">
            <Typography variant="h3">Productos</Typography>
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
          </Box>

          {lineItems.map((item) => (
            <AdminSupplierOrderLineItemRow
              key={item.key}
              item={item}
              products={products}
              productOptions={productOptions}
              isSubmitting={isSubmitting}
              onChange={updateLineItem}
              onRemove={removeLineItem}
            />
          ))}
        </Box>

        <Typography variant="body" className="text-right">
          Total estimado: {formatPrice(commissionTotal)}
        </Typography>

        <Box display="flex" gap="3" className="justify-end flex-wrap">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Crear encargo"}
          </Button>
        </Box>
      </Box>
    </Form>
  );
}
