"use client";

import { FormEvent, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Box from "@/components/layout/Box";
import Form from "@/components/ui/Form";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Typography from "@/components/ui/Typography";
import { Button } from "@/components/ui/button";
import AdminSearchInput from "@/components/admin/AdminSearchInput";
import AdminProductSearchSuggestion from "@/components/admin/AdminProductSearchSuggestion";
import type { CreateSaleRequest, Product } from "@/lib/api";
import { filterProductsByQuery } from "@/lib/admin-product-search";
import { formatPrice, generateSlug } from "@/lib/utils";
import { getTodayDateInputValue } from "@/lib/sale-date";
import { formFieldClassName } from "@/lib/form-field-classes";
import { getProductTotalStock, orderedSizeEntries } from "@/lib/product-inventory";

type AdminSaleFormProps = {
  products: Product[];
  isSubmitting: boolean;
  onCreate: (payload: CreateSaleRequest) => Promise<boolean>;
  onError: (message: string) => void;
  onCancel?: () => void;
};

function getStockForSize(product: Product, sizeValue: string): number {
  const entries = orderedSizeEntries(product);
  if (entries.length === 0) return getProductTotalStock(product);
  return entries.find(([optionSize]) => optionSize === sizeValue)?.[1] ?? 0;
}

function normalizeQuantityValue(value: string): string {
  if (value === "") return "";
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return "1";
  return String(Math.max(1, Math.floor(parsed)));
}

export default function AdminSaleForm({
  products,
  isSubmitting,
  onCreate,
  onError,
  onCancel,
}: AdminSaleFormProps) {
  const [productId, setProductId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [saleDate, setSaleDate] = useState(getTodayDateInputValue);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === productId) ?? null,
    [productId, products]
  );

  const productSuggestions = useMemo(
    () => filterProductsByQuery(products, productSearch),
    [productSearch, products]
  );

  const productSizes = useMemo(() => {
    if (!selectedProduct) return [];
    return orderedSizeEntries(selectedProduct);
  }, [selectedProduct]);

  const selectedStock = useMemo(() => {
    if (!selectedProduct) return 0;
    if (productSizes.length === 0) return getProductTotalStock(selectedProduct);
    if (!size) return 0;
    return getStockForSize(selectedProduct, size);
  }, [productSizes, selectedProduct, size]);

  const parsedQuantity = Number(quantity);
  const isQuantityValid =
    Number.isInteger(parsedQuantity) && parsedQuantity >= 1;

  const selectedProductHref = selectedProduct
    ? `/product/${(selectedProduct.slug || generateSlug(selectedProduct.name))}-${selectedProduct.id}`
    : "";

  const selectProduct = (product: Product) => {
    setProductId(product.id);
    setProductSearch(product.name);
    setSize("");
    setQuantity("1");
  };

  const clearProductSearch = () => {
    setProductId("");
    setProductSearch("");
    setSize("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedProduct) {
      onError("Seleccioná un producto.");
      return;
    }

    if (productSizes.length > 0 && !size) {
      onError("Seleccioná un talle.");
      return;
    }

    const quantityNumber = Number(quantity);
    if (!Number.isInteger(quantityNumber) || quantityNumber <= 0) {
      onError("Cantidad inválida.");
      return;
    }

    const created = await onCreate({
      product_id: selectedProduct.id,
      size,
      quantity: quantityNumber,
      sale_date: saleDate,
    });

    if (created) {
      clearProductSearch();
      setQuantity("1");
      setSaleDate(getTodayDateInputValue());
    }
  };

  return (
    <Form onSubmit={handleSubmit} spacing="md">
      <AdminSearchInput
        id="sale-product"
        value={productSearch}
        onChange={(value) => {
          setProductSearch(value);
          setProductId("");
          setSize("");
        }}
        onClear={clearProductSearch}
        placeholder="Buscar producto..."
        disabled={isSubmitting}
        required
        listboxId="sale-product-listbox"
        suggestions={productSuggestions}
        getSuggestionKey={(product) => product.id}
        renderSuggestion={(product) => <AdminProductSearchSuggestion product={product} />}
        onSuggestionSelect={selectProduct}
        emptyMessage="No hay productos"
        label={
          <Typography variant="body2" mb={1}>
            Producto *
          </Typography>
        }
      />

      {selectedProduct && (
        <Box display="flex" gap="3" className="items-center border border-border p-3">
          {selectedProduct.image_urls?.[0] ? (
            <Link
              href={selectedProductHref}
              target="_blank"
              rel="noopener noreferrer"
              className="relative block h-12 w-12 shrink-0"
            >
              <Image
                src={selectedProduct.image_urls[0]}
                alt=""
                fill
                className="object-cover"
                sizes="48px"
                unoptimized
              />
            </Link>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
          <Box display="flex" direction="col" gap="1">
            <Link
              href={selectedProductHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              <Typography variant="body2" as="span">
                {selectedProduct.name}
              </Typography>
            </Link>
            <Typography variant="body2" color="muted">
              Precio unitario: {formatPrice(selectedProduct.price)}
            </Typography>
          </Box>
        </Box>
      )}

      {selectedProduct && (
        <Box display="grid" cols={4} gap={4}>
          {productSizes.length > 0 && (
            <Label htmlFor="sale-size" display="block" spacing="sm">
              <Typography variant="body2" mb={1}>
                Talle *
              </Typography>
              <select
                id="sale-size"
                value={size}
                onChange={(event) => setSize(event.target.value)}
                disabled={isSubmitting}
                required
                className={formFieldClassName}
              >
                <option value="">Seleccionar talle</option>
                {productSizes.map(([optionSize]) => (
                  <option key={optionSize} value={optionSize}>
                    {optionSize}
                  </option>
                ))}
              </select>
            </Label>
          )}

          <Label htmlFor="sale-stock" display="block" spacing="sm">
            <Typography variant="body2" mb={1}>
              Stock disponible
            </Typography>
            <Input
              id="sale-stock"
              type="number"
              value={selectedStock}
              readOnly
              disabled
            />
          </Label>

          <Label htmlFor="sale-quantity" display="block" spacing="sm">
            <Typography variant="body2" mb={1}>
              Cantidad vendida *
            </Typography>
            <Input
              id="sale-quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(normalizeQuantityValue(event.target.value))}
              onBlur={() => {
                if (quantity === "") {
                  setQuantity("1");
                }
              }}
              disabled={isSubmitting}
              required
            />
          </Label>

          <Label htmlFor="sale-date" display="block" spacing="sm">
            <Typography variant="body2" mb={1}>
              Fecha de venta *
            </Typography>
            <Input
              id="sale-date"
              type="date"
              value={saleDate}
              onChange={(event) => setSaleDate(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </Label>
        </Box>
      )}

      <Box display="flex" gap="2" className="flex-wrap">
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            products.length === 0 ||
            !selectedProduct ||
            !isQuantityValid ||
            (productSizes.length > 0 && !size)
          }
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
