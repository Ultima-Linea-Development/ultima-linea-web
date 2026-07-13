"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Box from "@/components/layout/Box";
import Form from "@/components/ui/Form";
import Input from "@/components/ui/Input";
import CurrencyInput from "@/components/ui/CurrencyInput";
import FormField from "@/components/ui/FormField";
import Textarea from "@/components/ui/Textarea";
import Typography from "@/components/ui/Typography";
import Select from "@/components/ui/Select";
import { Button } from "@/components/ui/button";
import AdminSupplierField from "@/components/admin/AdminSupplierField";
import AdminSupplierOrderMilestoneDateFields from "@/components/admin/AdminSupplierOrderMilestoneDateFields";
import AdminSaleDateField from "@/components/admin/AdminSaleDateField";
import AdminSupplierOrderTrackingFields from "@/components/admin/AdminSupplierOrderTrackingFields";
import AdminSupplierOrderLineItemRow, {
  createEmptySupplierOrderLineItemDraft,
  createLineItemReservationSellerValue,
  getSupplierOrderLineItemIdentityRequestFields,
  getSupplierOrderLineItemDraftTotal,
  getSupplierOrderLineItemReservationRequestFields,
  validateSupplierOrderLineItemReservations,
  validateSupplierOrderLineItemIdentity,
  type SupplierOrderLineItemDraft,
} from "@/components/admin/AdminSupplierOrderLineItemRow";
import type {
  ExternalSeller,
  Product,
  ProductOptionsResponse,
  SaleAssignableUser,
  Supplier,
  SupplierOrder,
  SupplierOrderStatus,
  UpdateSupplierOrderRequest,
} from "@/lib/api";
import { productsApi } from "@/lib/api";
import { EMPTY_PRODUCT_OPTIONS } from "@/lib/product-options";
import {
  buildProductName,
  DEFAULT_PRODUCT_TYPE,
  extractKitTypeFromName,
  extractProductTypeFromName,
} from "@/lib/product-name";
import {
  supplierToFormValue,
  supplierValueToPayload,
  validateSupplierValue,
} from "@/lib/supplier-field";
import { sizeRowsFromLineItem, sizeRowsToPayload, reservationRowsFromLineItem } from "@/lib/supplier-order-sizes";
import {
  SUPPLIER_ORDER_STATUS_OPTIONS,
  normalizeSupplierOrderTrackingLink,
  validateSupplierOrderTrackingLink,
} from "@/lib/supplier-order-display";
import {
  orderMilestoneDatesFromOrder,
  supplierOrderMilestoneDatesToUpdatePayload,
  validateSupplierOrderMilestoneDates,
  type SupplierOrderMilestoneDates,
} from "@/lib/supplier-order-dates";
import {
  allocateSupplierOrderPrices,
  getSupplierOrderFixedPriceSubtotal,
  normalizeSupplierOrderPriceValue,
  parseSupplierOrderTotalPaid,
} from "@/lib/supplier-order-price-allocation";
import { parseSupplierOrderOptionalCost } from "@/lib/supplier-order-costs";
import { saleDateInputToApiValue, saleDateIsoToDisplayValue } from "@/lib/sale-date";
import { formatPrice } from "@/lib/utils";
import { commissionSellerValueToPayload } from "@/lib/commission-seller";
import { createDefaultSaleSellerValue } from "@/lib/sale-seller";

type AdminSupplierOrderEditFormProps = {
  order: SupplierOrder;
  products: Product[];
  suppliers: Supplier[];
  assignableUsers: SaleAssignableUser[];
  externalSellers: ExternalSeller[];
  currentUserId: string | null;
  canAssignUser: boolean;
  isSubmitting: boolean;
  onSave: (payload: UpdateSupplierOrderRequest) => Promise<boolean>;
  onError: (message: string) => void;
  onCancel?: () => void;
};

const fieldLabelClassName = "w-full min-w-0";

function orderItemToDraft(
  item: SupplierOrder["items"][number],
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
    isCustomPrice: false,
    reserveProduct: Boolean(item.reserved),
    reservationSellerValue: createLineItemReservationSellerValue(
      {
        reservationSellerValue: createDefaultSaleSellerValue(currentUserId),
        reserved_for_user_id: item.reserved_for_user_id,
        reserved_for_external_seller_id: item.reserved_for_external_seller_id,
        reserved_for_external_seller_name: item.reserved_for_external_seller_name,
      },
      currentUserId
    ),
  };
}

function draftToRequestItem(item: SupplierOrderLineItemDraft, canAssignUser: boolean) {
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
      mode: "line",
      canAssignUser,
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

function validateLineItems(
  lineItems: SupplierOrderLineItemDraft[],
  canAssignUser: boolean
): string | null {
  if (lineItems.length === 0) {
    return "Agregá al menos un ítem.";
  }

  for (const item of lineItems) {
    if (!item.productName.trim()) {
      return "Cada ítem necesita un nombre de producto.";
    }

    const identityError = validateSupplierOrderLineItemIdentity(item);
    if (identityError) return identityError;

    const sizesPayload = sizeRowsToPayload(item.sizeRows);
    if (!sizesPayload) {
      return `Indicá al menos un talle con cantidad para ${item.productName || "un ítem"}.`;
    }

    const price = Number(item.price);
    if (!Number.isFinite(price) || price < 0) {
      return `Precio inválido para ${item.productName}.`;
    }

    if (item.reserveProduct) {
      const reservationError = validateSupplierOrderLineItemReservations(
        item,
        canAssignUser,
        "line"
      );
      if (reservationError) return reservationError;
    }
  }

  return null;
}

export default function AdminSupplierOrderEditForm({
  order,
  products,
  suppliers,
  assignableUsers,
  externalSellers,
  currentUserId,
  canAssignUser,
  isSubmitting,
  onSave,
  onError,
  onCancel,
}: AdminSupplierOrderEditFormProps) {
  const initialSupplier = useMemo(
    () =>
      suppliers.find((supplier) => supplier.id === order.supplier_id) ??
      (order.supplier_name
        ? {
            id: order.supplier_id ?? "",
            name: order.supplier_name,
            created_at: order.created_at,
            updated_at: order.updated_at,
          }
        : null),
    [order, suppliers]
  );

  const [name, setName] = useState(order.name);
  const [orderDate, setOrderDate] = useState(() => saleDateIsoToDisplayValue(order.created_at));
  const [status, setStatus] = useState<SupplierOrderStatus>(order.status);
  const [notes, setNotes] = useState(order.notes ?? "");
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number ?? "");
  const [trackingLink, setTrackingLink] = useState(order.tracking_link ?? "");
  const [totalPaid, setTotalPaid] = useState(() =>
    String(order.items.reduce((sum, item) => sum + item.price * item.quantity, 0))
  );
  const [taxCost, setTaxCost] = useState(() => String(order.tax_cost ?? ""));
  const [shippingCost, setShippingCost] = useState(() => String(order.shipping_cost ?? ""));
  const [milestoneDates, setMilestoneDates] = useState<SupplierOrderMilestoneDates>(() =>
    orderMilestoneDatesFromOrder(order)
  );
  const [supplierValue, setSupplierValue] = useState(() => supplierToFormValue(initialSupplier));
  const [lineItems, setLineItems] = useState<SupplierOrderLineItemDraft[]>(() =>
    order.items.map((item) => orderItemToDraft(item, products, currentUserId))
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

  const orderTotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + getSupplierOrderLineItemDraftTotal(item), 0),
    [lineItems]
  );
  const parsedTotalPaid = parseSupplierOrderTotalPaid(totalPaid);
  const parsedTaxCost = parseSupplierOrderOptionalCost(taxCost);
  const parsedShippingCost = parseSupplierOrderOptionalCost(shippingCost);
  const isPriceAllocationEnabled = parsedTotalPaid !== null;

  const updateLineItem = (
    key: string,
    updates: Partial<Omit<SupplierOrderLineItemDraft, "key">>
  ) => {
    setLineItems((prev) =>
      allocateSupplierOrderPrices(
        prev.map((item) => (item.key === key ? { ...item, ...updates } : item)),
        totalPaid
      )
    );
  };

  const removeLineItem = (key: string) => {
    setLineItems((prev) => allocateSupplierOrderPrices(prev.filter((item) => item.key !== key), totalPaid));
  };

  const addLineItem = () => {
    setLineItems((prev) =>
      allocateSupplierOrderPrices(
        [
          {
            ...createEmptySupplierOrderLineItemDraft(),
            reservationSellerValue: createDefaultSaleSellerValue(currentUserId),
          },
          ...prev,
        ],
        totalPaid
      )
    );
  };

  const handleTotalPaidChange = (value: string) => {
    const nextTotalPaid = normalizeSupplierOrderPriceValue(value);
    setTotalPaid(nextTotalPaid);
    setLineItems((prev) => allocateSupplierOrderPrices(prev, nextTotalPaid));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      onError("El nombre del pedido es obligatorio.");
      return;
    }

    const supplierError = validateSupplierValue(supplierValue);
    if (supplierError) {
      onError(supplierError);
      return;
    }

    if (totalPaid.trim() && parsedTotalPaid === null) {
      onError("Total pagado inválido.");
      return;
    }

    if (taxCost.trim() && parsedTaxCost === null) {
      onError("Costo de impuesto inválido.");
      return;
    }

    if (shippingCost.trim() && parsedShippingCost === null) {
      onError("Costo de envío inválido.");
      return;
    }

    if (
      parsedTotalPaid !== null &&
      getSupplierOrderFixedPriceSubtotal(lineItems) > parsedTotalPaid
    ) {
      onError("El total pagado no alcanza para los precios diferenciados.");
      return;
    }

    const finalLineItems = allocateSupplierOrderPrices(lineItems, totalPaid);
    const itemsError = validateLineItems(finalLineItems, canAssignUser);
    if (itemsError) {
      onError(itemsError);
      return;
    }

    const datesError = validateSupplierOrderMilestoneDates(milestoneDates);
    if (datesError) {
      onError(datesError);
      return;
    }

    const trackingLinkError = validateSupplierOrderTrackingLink(trackingLink);
    if (trackingLinkError) {
      onError(trackingLinkError);
      return;
    }

    const normalizedTrackingLink = normalizeSupplierOrderTrackingLink(trackingLink);

    const orderDateApiValue = saleDateInputToApiValue(orderDate);
    if (!orderDateApiValue) {
      onError("Fecha del pedido inválida.");
      return;
    }

    await onSave({
      name: trimmedName,
      status,
      order_date: orderDateApiValue,
      notes: notes.trim(),
      tracking_number: trackingNumber.trim(),
      tracking_link: normalizedTrackingLink ?? "",
      tax_cost: parsedTaxCost,
      shipping_cost: parsedShippingCost,
      ...supplierValueToPayload(supplierValue),
      ...supplierOrderMilestoneDatesToUpdatePayload(milestoneDates),
      items: finalLineItems.map((item) => draftToRequestItem(item, canAssignUser)),
    });
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Box display="flex" direction="col" gap="4" align="stretch" className="w-full min-w-0">
        <div className="grid w-full min-w-0 grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          <div className="min-w-0 w-full">
            <FormField htmlFor="edit-order-name" label="Nombre del pedido" required className={fieldLabelClassName}>
            <Input
              id="edit-order-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </FormField>
          </div>

          <div className="min-w-0 w-full">
            <FormField htmlFor="edit-order-status" label="Estado" required className={fieldLabelClassName}>
            <Select
              id="edit-order-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as SupplierOrderStatus)}
              disabled={isSubmitting}
              required
            >
              {SUPPLIER_ORDER_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormField>
          </div>
        </div>

        <FormField htmlFor="edit-order-date" label="Fecha del pedido" required className={fieldLabelClassName}>
          <AdminSaleDateField
            id="edit-order-date"
            value={orderDate}
            onChange={setOrderDate}
            disabled={isSubmitting}
            required
          />
        </FormField>

        <AdminSupplierOrderMilestoneDateFields
          idPrefix="edit-order"
          value={milestoneDates}
          onChange={setMilestoneDates}
          disabled={isSubmitting}
        />

        <AdminSupplierField
          value={supplierValue}
          onChange={setSupplierValue}
          suppliers={suppliers}
          disabled={isSubmitting}
        />

        <FormField htmlFor="edit-order-notes" label="Notas del pedido" className={fieldLabelClassName}>
          <Textarea
            id="edit-order-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={isSubmitting}
            rows={2}
          />
        </FormField>

        <AdminSupplierOrderTrackingFields
          idPrefix="edit-order"
          trackingNumber={trackingNumber}
          trackingLink={trackingLink}
          onTrackingNumberChange={setTrackingNumber}
          onTrackingLinkChange={setTrackingLink}
          disabled={isSubmitting}
        />

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

        <Box display="flex" direction="col" gap="3" align="stretch" className="w-full min-w-0">
          <Box display="flex" className="items-center justify-between gap-4">
            <Typography variant="h3">Ítems</Typography>
            <Button
              type="button"
              variant="outline"
              onClick={addLineItem}
              disabled={isSubmitting}
            >
              Agregar ítem
            </Button>
          </Box>

          {lineItems.map((item) => (
            <AdminSupplierOrderLineItemRow
              key={item.key}
              item={item}
              products={products}
              productOptions={productOptions}
              isSubmitting={isSubmitting}
              isPriceAllocationEnabled={isPriceAllocationEnabled}
              reservationConfig={{
                mode: "line",
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
          Total estimado: {formatPrice(orderTotal)}
        </Typography>

        <Box display="flex" direction="col" gap="3" align="stretch" className="w-full min-w-0">
          <FormField htmlFor="edit-order-total-paid" label="Total pagado" className={fieldLabelClassName}>
            <CurrencyInput
              id="edit-order-total-paid"
              value={totalPaid}
              onChange={handleTotalPaidChange}
              disabled={isSubmitting}
            />
          </FormField>

          <div className="grid w-full min-w-0 grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <div className="min-w-0 w-full">
              <FormField htmlFor="edit-order-tax-cost" label="Costo de impuesto" className={fieldLabelClassName}>
                <CurrencyInput
                  id="edit-order-tax-cost"
                  value={taxCost}
                  onChange={setTaxCost}
                  disabled={isSubmitting}
                />
              </FormField>
            </div>

            <div className="min-w-0 w-full">
              <FormField htmlFor="edit-order-shipping-cost" label="Costo de envío" className={fieldLabelClassName}>
                <CurrencyInput
                  id="edit-order-shipping-cost"
                  value={shippingCost}
                  onChange={setShippingCost}
                  disabled={isSubmitting}
                />
              </FormField>
            </div>
          </div>
        </Box>
      </Box>
    </Form>
  );
}
