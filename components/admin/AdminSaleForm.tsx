"use client";

import { FormEvent, useMemo, useState } from "react";
import Box from "@/components/layout/Box";
import Form from "@/components/ui/Form";
import Input from "@/components/ui/Input";
import FormField from "@/components/ui/FormField";
import Textarea from "@/components/ui/Textarea";
import Typography from "@/components/ui/Typography";
import { Button } from "@/components/ui/button";
import AdminSearchInput from "@/components/admin/AdminSearchInput";
import AdminProductSearchSuggestion from "@/components/admin/AdminProductSearchSuggestion";
import AdminSaleLineItemRow, {
  getSaleLineItemDraftTotal,
  type SaleLineItemDraft,
} from "@/components/admin/AdminSaleLineItemRow";
import AdminSaleSellerField from "@/components/admin/AdminSaleSellerField";
import type { CreateSaleRequest, ExternalSeller, Product, SaleAssignableUser } from "@/lib/api";
import { filterProductsByQuery } from "@/lib/admin-product-search";
import {
  createDefaultSaleSellerValue,
  saleSellerValueToPayload,
  validateSaleSellerValue,
  type SaleSellerFormValue,
} from "@/lib/sale-seller";
import { formatPrice } from "@/lib/utils";
import { getTodaySaleDateDisplayValue, saleDateInputToApiValue } from "@/lib/sale-date";
import { orderedSizeEntries } from "@/lib/product-inventory";

type AdminSaleFormProps = {
  products: Product[];
  assignableUsers: SaleAssignableUser[];
  externalSellers: ExternalSeller[];
  currentUserId: string | null;
  canAssignUser: boolean;
  isSubmitting: boolean;
  onCreate: (payload: CreateSaleRequest) => Promise<boolean>;
  onError: (message: string) => void;
  onCancel?: () => void;
};

function createLineItemDraft(product: Product): SaleLineItemDraft {
  return {
    key: crypto.randomUUID(),
    product,
    size: "",
    quantity: "1",
    unitPrice: String(product.price),
    skipStockDeduction: false,
  };
}

export default function AdminSaleForm({
  products,
  assignableUsers,
  externalSellers,
  currentUserId,
  canAssignUser,
  isSubmitting,
  onCreate,
  onError,
  onCancel,
}: AdminSaleFormProps) {
  const [lineItems, setLineItems] = useState<SaleLineItemDraft[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [saleDate, setSaleDate] = useState(getTodaySaleDateDisplayValue);
  const [sellerValue, setSellerValue] = useState<SaleSellerFormValue>(() =>
    createDefaultSaleSellerValue(currentUserId)
  );
  const [transferAlias, setTransferAlias] = useState("");
  const [description, setDescription] = useState("");

  const productSuggestions = useMemo(
    () => filterProductsByQuery(products, productSearch),
    [productSearch, products]
  );

  const saleTotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + getSaleLineItemDraftTotal(item), 0),
    [lineItems]
  );

  const addProduct = (product: Product) => {
    setLineItems((prev) => [...prev, createLineItemDraft(product)]);
    setProductSearch("");
  };

  const updateLineItem = (
    key: string,
    updates: Partial<Pick<SaleLineItemDraft, "size" | "quantity" | "unitPrice" | "skipStockDeduction">>
  ) => {
    setLineItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...updates } : item))
    );
  };

  const removeLineItem = (key: string) => {
    setLineItems((prev) => prev.filter((item) => item.key !== key));
  };

  const validateLineItems = (): string | null => {
    if (lineItems.length === 0) {
      return "Agregá al menos un producto.";
    }

    for (const item of lineItems) {
      const sizes = orderedSizeEntries(item.product);
      if (sizes.length > 0 && !item.size) {
        return `Seleccioná un talle para ${item.product.name}.`;
      }

      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return `Cantidad inválida para ${item.product.name}.`;
      }

      const unitPrice = Number(item.unitPrice);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return `Precio inválido para ${item.product.name}.`;
      }
    }

    return null;
  };

  const resetForm = () => {
    setLineItems([]);
    setProductSearch("");
    setSaleDate(getTodaySaleDateDisplayValue());
    setSellerValue(createDefaultSaleSellerValue(currentUserId));
    setTransferAlias("");
    setDescription("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateLineItems();
    if (validationError) {
      onError(validationError);
      return;
    }

    const sellerError = validateSaleSellerValue(sellerValue, canAssignUser);
    if (sellerError) {
      onError(sellerError);
      return;
    }

    const saleDateApiValue = saleDateInputToApiValue(saleDate);
    if (!saleDateApiValue) {
      onError("Fecha inválida.");
      return;
    }

    const payload: CreateSaleRequest = {
      items: lineItems.map((item) => ({
        product_id: item.product.id,
        size: item.size,
        quantity: Number(item.quantity),
        unit_price: Number(item.unitPrice),
        skip_stock_deduction: item.skipStockDeduction,
      })),
      sale_date: saleDateApiValue,
      ...saleSellerValueToPayload(sellerValue, canAssignUser),
    };

    const trimmedAlias = transferAlias.trim();
    const trimmedDescription = description.trim();
    if (trimmedAlias) payload.transfer_alias = trimmedAlias;
    if (trimmedDescription) payload.description = trimmedDescription;

    const created = await onCreate(payload);

    if (created) {
      resetForm();
    }
  };

  return (
    <Form onSubmit={handleSubmit} spacing="md">
      <AdminSearchInput
        id="sale-product"
        value={productSearch}
        onChange={setProductSearch}
        onClear={() => setProductSearch("")}
        placeholder="Buscar producto para agregar..."
        disabled={isSubmitting}
        listboxId="sale-product-listbox"
        suggestions={productSuggestions}
        getSuggestionKey={(product) => product.id}
        renderSuggestion={(product) => <AdminProductSearchSuggestion product={product} />}
        onSuggestionSelect={addProduct}
        emptyMessage="No hay productos"
        label={
          <Typography variant="body2" mb={1}>
            Agregar producto
          </Typography>
        }
      />

      {lineItems.length > 0 && (
        <Box display="flex" direction="col" gap="3">
          <Typography variant="body2">Productos en la venta</Typography>
          {lineItems.map((item) => (
            <AdminSaleLineItemRow
              key={item.key}
              item={item}
              isSubmitting={isSubmitting}
              onChange={updateLineItem}
              onRemove={removeLineItem}
            />
          ))}
        </Box>
      )}

      <AdminSaleSellerField
        value={sellerValue}
        onChange={setSellerValue}
        assignableUsers={assignableUsers}
        externalSellers={externalSellers}
        canAssignUser={canAssignUser}
        currentUserId={currentUserId}
        saleDate={saleDate}
        onSaleDateChange={setSaleDate}
        disabled={isSubmitting}
      />

      <FormField htmlFor="sale-transfer-alias" label="Alias de quien transfirió">
        <Input
          id="sale-transfer-alias"
          value={transferAlias}
          onChange={(event) => setTransferAlias(event.target.value)}
          placeholder="Opcional"
          disabled={isSubmitting}
        />
      </FormField>

      <FormField htmlFor="sale-description" label="Descripción">
        <Textarea
          id="sale-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Opcional"
          disabled={isSubmitting}
          rows={3}
        />
      </FormField>

      {lineItems.length > 0 && (
        <Typography variant="body2" className="text-right font-medium">
          Total de la venta: {formatPrice(saleTotal)}
        </Typography>
      )}

      <Box display="flex" gap="2" className="flex-wrap">
        <Button
          type="submit"
          disabled={isSubmitting || products.length === 0 || lineItems.length === 0}
        >
          {isSubmitting ? "Registrando..." : "Registrar venta"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        )}
      </Box>
    </Form>
  );
}
