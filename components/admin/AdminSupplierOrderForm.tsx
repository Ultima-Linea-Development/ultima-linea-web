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
  getSupplierOrderLineItemIdentityRequestFields,
  getSupplierOrderLineItemDraftTotal,
  validateSupplierOrderLineItemIdentity,
  type SupplierOrderLineItemDraft,
} from "@/components/admin/AdminSupplierOrderLineItemRow";
import type {
  CreateSupplierOrderRequest,
  Product,
  ProductOptionsResponse,
  Supplier,
  SupplierOrderStatus,
} from "@/lib/api";
import { productsApi } from "@/lib/api";
import { EMPTY_PRODUCT_OPTIONS } from "@/lib/product-options";
import {
  createDefaultSupplierValue,
  supplierValueToPayload,
  validateSupplierValue,
} from "@/lib/supplier-field";
import { sizeRowsToPayload } from "@/lib/supplier-order-sizes";
import {
  SUPPLIER_ORDER_STATUS_OPTIONS,
  normalizeSupplierOrderTrackingLink,
  validateSupplierOrderTrackingLink,
} from "@/lib/supplier-order-display";
import {
  EMPTY_SUPPLIER_ORDER_MILESTONE_DATES,
  supplierOrderMilestoneDatesToCreatePayload,
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
import { getTodaySaleDateDisplayValue, saleDateInputToApiValue } from "@/lib/sale-date";
import { formatPrice } from "@/lib/utils";

const fieldLabelClassName = "w-full min-w-0";

type AdminSupplierOrderFormProps = {
  products: Product[];
  suppliers: Supplier[];
  isSubmitting: boolean;
  onCreate: (payload: CreateSupplierOrderRequest) => Promise<boolean>;
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
  }

  return null;
}

export default function AdminSupplierOrderForm({
  products,
  suppliers,
  isSubmitting,
  onCreate,
  onError,
  onCancel,
}: AdminSupplierOrderFormProps) {
  const [name, setName] = useState("");
  const [orderDate, setOrderDate] = useState(() => getTodaySaleDateDisplayValue());
  const [status, setStatus] = useState<SupplierOrderStatus>("draft");
  const [notes, setNotes] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingLink, setTrackingLink] = useState("");
  const [totalPaid, setTotalPaid] = useState("");
  const [taxCost, setTaxCost] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [milestoneDates, setMilestoneDates] = useState<SupplierOrderMilestoneDates>(
    EMPTY_SUPPLIER_ORDER_MILESTONE_DATES
  );
  const [supplierValue, setSupplierValue] = useState(createDefaultSupplierValue);
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
      allocateSupplierOrderPrices([createEmptySupplierOrderLineItemDraft(), ...prev], totalPaid)
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
    const itemsError = validateLineItems(finalLineItems);
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
    const trimmedTrackingNumber = trackingNumber.trim();

    const orderDateApiValue = saleDateInputToApiValue(orderDate);
    if (!orderDateApiValue) {
      onError("Fecha del pedido inválida.");
      return;
    }

    const success = await onCreate({
      name: trimmedName,
      status,
      order_date: orderDateApiValue,
      notes: notes.trim(),
      ...(trimmedTrackingNumber ? { tracking_number: trimmedTrackingNumber } : {}),
      ...(normalizedTrackingLink ? { tracking_link: normalizedTrackingLink } : {}),
      ...(parsedTaxCost !== null ? { tax_cost: parsedTaxCost } : {}),
      ...(parsedShippingCost !== null ? { shipping_cost: parsedShippingCost } : {}),
      ...supplierValueToPayload(supplierValue),
      ...supplierOrderMilestoneDatesToCreatePayload(milestoneDates),
      items: finalLineItems.map(draftToRequestItem),
    });

    if (success) {
      setName("");
      setOrderDate(getTodaySaleDateDisplayValue());
      setStatus("draft");
      setNotes("");
      setTrackingNumber("");
      setTrackingLink("");
      setTotalPaid("");
      setTaxCost("");
      setShippingCost("");
      setMilestoneDates(EMPTY_SUPPLIER_ORDER_MILESTONE_DATES);
      setSupplierValue(createDefaultSupplierValue());
      setLineItems([createEmptySupplierOrderLineItemDraft()]);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Box display="flex" direction="col" gap="4" align="stretch" className="w-full min-w-0">
        <div className="grid w-full min-w-0 grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          <div className="min-w-0 w-full">
            <FormField htmlFor="order-name" label="Nombre del pedido" required className={fieldLabelClassName}>
            <Input
              id="order-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </FormField>
          </div>

          <div className="min-w-0 w-full">
            <FormField htmlFor="order-status" label="Estado" required className={fieldLabelClassName}>
            <Select
              id="order-status"
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

        <FormField htmlFor="order-date" label="Fecha del pedido" required className={fieldLabelClassName}>
          <AdminSaleDateField
            id="order-date"
            value={orderDate}
            onChange={setOrderDate}
            disabled={isSubmitting}
            required
          />
        </FormField>

        <AdminSupplierOrderMilestoneDateFields
          idPrefix="order"
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

        <FormField htmlFor="order-notes" label="Notas del pedido" className={fieldLabelClassName}>
          <Textarea
            id="order-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={isSubmitting}
            rows={2}
          />
        </FormField>

        <AdminSupplierOrderTrackingFields
          idPrefix="order"
          trackingNumber={trackingNumber}
          trackingLink={trackingLink}
          onTrackingNumberChange={setTrackingNumber}
          onTrackingLinkChange={setTrackingLink}
          disabled={isSubmitting}
        />

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
              onChange={updateLineItem}
              onRemove={removeLineItem}
            />
          ))}
        </Box>

        <Typography variant="body" className="text-right">
          Total estimado: {formatPrice(orderTotal)}
        </Typography>

        <Box display="flex" direction="col" gap="3" align="stretch" className="w-full min-w-0">
          <FormField htmlFor="order-total-paid" label="Total pagado" className={fieldLabelClassName}>
            <CurrencyInput
              id="order-total-paid"
              value={totalPaid}
              onChange={handleTotalPaidChange}
              disabled={isSubmitting}
            />
          </FormField>

          <div className="grid w-full min-w-0 grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <div className="min-w-0 w-full">
              <FormField htmlFor="order-tax-cost" label="Costo de impuesto" className={fieldLabelClassName}>
                <CurrencyInput
                  id="order-tax-cost"
                  value={taxCost}
                  onChange={setTaxCost}
                  disabled={isSubmitting}
                />
              </FormField>
            </div>

            <div className="min-w-0 w-full">
              <FormField htmlFor="order-shipping-cost" label="Costo de envío" className={fieldLabelClassName}>
                <CurrencyInput
                  id="order-shipping-cost"
                  value={shippingCost}
                  onChange={setShippingCost}
                  disabled={isSubmitting}
                />
              </FormField>
            </div>
          </div>
        </Box>

        <Box display="flex" gap="3" className="justify-end flex-wrap">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Crear pedido"}
          </Button>
        </Box>
      </Box>
    </Form>
  );
}
