"use client";

import { FormEvent, useMemo, useState } from "react";
import Box from "@/components/layout/Box";
import Form from "@/components/ui/Form";
import AdminSaleSellerField from "@/components/admin/AdminSaleSellerField";
import AdminSearchInput from "@/components/admin/AdminSearchInput";
import AdminProductSearchSuggestion from "@/components/admin/AdminProductSearchSuggestion";
import AdminSaleLineItemRow, {
  getSaleLineItemDraftTotal,
  type SaleLineItemDraft,
} from "@/components/admin/AdminSaleLineItemRow";
import Input from "@/components/ui/Input";
import FormField from "@/components/ui/FormField";
import Textarea from "@/components/ui/Textarea";
import Typography from "@/components/ui/Typography";
import { InlineAlert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/button";
import type { ExternalSeller, Product, Sale, SaleAssignableUser, SaleLineItem, UpdateSaleRequest } from "@/lib/api";
import { filterProductsByQuery } from "@/lib/admin-product-search";
import { getSaleLineItems } from "@/lib/sale-items";
import {
  saleSellerValueToPayload,
  saleToSellerFormValue,
  validateSaleSellerValue,
  type SaleSellerFormValue,
} from "@/lib/sale-seller";
import { saleDateInputToApiValue, saleDateIsoToDisplayValue, saleDateToInputValue } from "@/lib/sale-date";
import { formatPrice } from "@/lib/utils";
import { orderedSizeEntries } from "@/lib/product-inventory";

type AdminSaleEditFormProps = {
  sale: Sale;
  products: Product[];
  assignableUsers: SaleAssignableUser[];
  externalSellers: ExternalSeller[];
  currentUserId: string | null;
  canAssignUser: boolean;
  isSubmitting: boolean;
  error?: string;
  onSave: (payload: UpdateSaleRequest) => Promise<boolean>;
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

function createFallbackProduct(item: SaleLineItem): Product {
  return {
    id: item.product_id,
    name: item.product_name,
    price: item.unit_price,
    stock: item.quantity,
    size: item.size,
    sizes: item.size ? [item.size] : [],
    stock_by_sizes: item.size ? { [item.size]: item.quantity } : {},
    image_urls: [],
    is_active: true,
  };
}

function addOriginalItemStock(product: Product, item: SaleLineItem): Product {
  const stockBySizes = { ...(product.stock_by_sizes ?? {}) };
  if (!item.skip_stock_deduction && item.size) {
    stockBySizes[item.size] = (stockBySizes[item.size] ?? 0) + item.quantity;
  }

  return {
    ...product,
    stock: (product.stock ?? 0) + (item.skip_stock_deduction ? 0 : item.quantity),
    stock_by_sizes: stockBySizes,
    sizes: product.sizes?.includes(item.size) || !item.size
      ? product.sizes
      : [...(product.sizes ?? []), item.size],
  };
}

function createDraftFromSaleItem(item: SaleLineItem, products: Product[]): SaleLineItemDraft {
  const product = products.find((candidate) => candidate.id === item.product_id);
  const editableProduct = product
    ? addOriginalItemStock(product, item)
    : createFallbackProduct(item);

  return {
    key: crypto.randomUUID(),
    product: editableProduct,
    size: item.size,
    quantity: String(item.quantity),
    unitPrice: String(item.unit_price),
    skipStockDeduction: Boolean(item.skip_stock_deduction),
  };
}

function serializeLineItems(items: SaleLineItemDraft[]) {
  return JSON.stringify(
    items.map((item) => ({
      product_id: item.product.id,
      size: item.size,
      quantity: Number(item.quantity),
      unit_price: Number(item.unitPrice),
      skip_stock_deduction: item.skipStockDeduction,
    }))
  );
}

export default function AdminSaleEditForm({
  sale,
  products,
  assignableUsers,
  externalSellers,
  currentUserId,
  canAssignUser,
  isSubmitting,
  error,
  onSave,
  onCancel,
}: AdminSaleEditFormProps) {
  const [saleDate, setSaleDate] = useState(() => saleDateIsoToDisplayValue(sale.created_at));
  const [sellerValue, setSellerValue] = useState<SaleSellerFormValue>(() =>
    saleToSellerFormValue(sale, currentUserId)
  );
  const [lineItems, setLineItems] = useState<SaleLineItemDraft[]>(() =>
    getSaleLineItems(sale).map((item) => createDraftFromSaleItem(item, products))
  );
  const [productSearch, setProductSearch] = useState("");
  const [transferAlias, setTransferAlias] = useState(sale.transfer_alias ?? "");
  const [description, setDescription] = useState(sale.description ?? "");
  const [validationError, setValidationError] = useState("");

  const productSuggestions = useMemo(
    () => filterProductsByQuery(products, productSearch),
    [productSearch, products]
  );

  const saleTotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + getSaleLineItemDraftTotal(item), 0),
    [lineItems]
  );

  const initialLineItemsSignature = useMemo(
    () =>
      JSON.stringify(
        getSaleLineItems(sale).map((item) => ({
          product_id: item.product_id,
          size: item.size,
          quantity: item.quantity,
          unit_price: item.unit_price,
          skip_stock_deduction: Boolean(item.skip_stock_deduction),
        }))
      ),
    [sale]
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError("");

    const lineItemsError = validateLineItems();
    if (lineItemsError) {
      setValidationError(lineItemsError);
      return;
    }

    if (!saleDate) {
      setValidationError("La fecha es obligatoria.");
      return;
    }

    const sellerError = validateSaleSellerValue(sellerValue, canAssignUser);
    if (sellerError) {
      setValidationError(sellerError);
      return;
    }

    const saleDateApiValue = saleDateInputToApiValue(saleDate);
    if (!saleDateApiValue) {
      setValidationError("Fecha inválida.");
      return;
    }

    const payload: UpdateSaleRequest = {};
    let hasChanges = false;

    const currentLineItemsSignature = serializeLineItems(lineItems);
    if (currentLineItemsSignature !== initialLineItemsSignature) {
      payload.items = lineItems.map((item) => ({
        product_id: item.product.id,
        size: item.size,
        quantity: Number(item.quantity),
        unit_price: Number(item.unitPrice),
        skip_stock_deduction: item.skipStockDeduction,
      }));
      hasChanges = true;
    }

    if (saleDateApiValue !== saleDateToInputValue(sale.created_at)) {
      payload.sale_date = saleDateApiValue;
      hasChanges = true;
    }

    const initialSeller = saleToSellerFormValue(sale, currentUserId);
    const sellerChanged =
      sellerValue.sellerType !== initialSeller.sellerType ||
      sellerValue.internalUserId !== initialSeller.internalUserId ||
      sellerValue.externalSellerId !== initialSeller.externalSellerId ||
      sellerValue.externalSellerName.trim() !== initialSeller.externalSellerName.trim();

    if (sellerChanged) {
      Object.assign(payload, saleSellerValueToPayload(sellerValue, canAssignUser));
      hasChanges = true;
    }

    const trimmedAlias = transferAlias.trim();
    const initialAlias = sale.transfer_alias ?? "";
    if (trimmedAlias !== initialAlias) {
      payload.transfer_alias = trimmedAlias;
      hasChanges = true;
    }

    const trimmedDescription = description.trim();
    const initialDescription = sale.description ?? "";
    if (trimmedDescription !== initialDescription) {
      payload.description = trimmedDescription;
      hasChanges = true;
    }

    if (!hasChanges) {
      setValidationError("No hay cambios para guardar.");
      return;
    }

    await onSave(payload);
  };

  const displayError = validationError || error;

  return (
    <Form onSubmit={handleSubmit} spacing="md">
      <AdminSearchInput
        id="edit-sale-product"
        value={productSearch}
        onChange={setProductSearch}
        onClear={() => setProductSearch("")}
        placeholder="Buscar producto para agregar..."
        disabled={isSubmitting}
        listboxId="edit-sale-product-listbox"
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

      <AdminSaleSellerField
        value={sellerValue}
        onChange={setSellerValue}
        assignableUsers={assignableUsers}
        externalSellers={externalSellers}
        canAssignUser={canAssignUser}
        currentUserId={currentUserId}
        saleDate={saleDate}
        onSaleDateChange={setSaleDate}
        saleDateId="edit-sale-date"
        disabled={isSubmitting}
      />

      <FormField htmlFor="edit-sale-transfer-alias" label="Alias de quien transfirió">
        <Input
          id="edit-sale-transfer-alias"
          value={transferAlias}
          onChange={(event) => setTransferAlias(event.target.value)}
          placeholder="Opcional"
          disabled={isSubmitting}
        />
      </FormField>

      <FormField htmlFor="edit-sale-description" label="Descripción">
        <Textarea
          id="edit-sale-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Opcional"
          disabled={isSubmitting}
          rows={3}
        />
      </FormField>

      <Typography variant="body2" className="text-right font-medium">
        Total de la venta: {formatPrice(saleTotal)}
      </Typography>

      {displayError && (
        <InlineAlert variant="destructive">
          <Typography variant="body2" color="destructive">
            {displayError}
          </Typography>
        </InlineAlert>
      )}

      <Box display="flex" gap="2" className="flex-wrap">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : "Guardar cambios"}
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
