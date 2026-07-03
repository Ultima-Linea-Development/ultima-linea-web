"use client";

import { useEffect, useMemo, useState } from "react";
import Div from "@/components/ui/Div";
import Input from "@/components/ui/Input";
import FormField from "@/components/ui/FormField";
import Typography from "@/components/ui/Typography";
import AdminSearchInput from "@/components/admin/AdminSearchInput";
import AdminProductSearchSuggestion from "@/components/admin/AdminProductSearchSuggestion";
import AdminProductSourceSwitch from "@/components/admin/AdminProductSourceSwitch";
import type { Product } from "@/lib/api";
import { filterProductsByQuery } from "@/lib/admin-product-search";

type AdminCatalogProductSelectProps = {
  id: string;
  label?: string;
  products: Product[];
  productName: string;
  isCustomProduct: boolean;
  disabled?: boolean;
  required?: boolean;
  onSelectProduct: (product: Product) => void;
  onClearProduct: () => void;
  onCustomChange: (isCustom: boolean) => void;
  onCustomNameChange: (name: string) => void;
};

export default function AdminCatalogProductSelect({
  id,
  label = "Producto",
  products,
  productName,
  isCustomProduct,
  disabled = false,
  required = false,
  onSelectProduct,
  onClearProduct,
  onCustomChange,
  onCustomNameChange,
}: AdminCatalogProductSelectProps) {
  const [searchInput, setSearchInput] = useState(productName);

  useEffect(() => {
    if (!isCustomProduct) {
      setSearchInput(productName);
    }
  }, [productName, isCustomProduct]);

  const suggestions = useMemo(
    () => filterProductsByQuery(products, searchInput, 12),
    [products, searchInput]
  );

  if (isCustomProduct) {
    return (
      <FormField htmlFor={`${id}-custom`} label={label} required={required} className="w-full min-w-0">
        <Input
          id={`${id}-custom`}
          type="text"
          value={productName}
          onChange={(event) => onCustomNameChange(event.target.value)}
          placeholder="Ingresá el nombre del producto"
          disabled={disabled}
          required={required}
        />
        <Div mt={3}>
          <AdminProductSourceSwitch
            mode="custom"
            disabled={disabled}
            onSwitch={() => onCustomChange(false)}
          />
        </Div>
      </FormField>
    );
  }

  return (
    <FormField label={label} required={required} className="w-full min-w-0">
      <AdminSearchInput
        id={id}
        value={searchInput}
        onChange={setSearchInput}
        onClear={() => {
          setSearchInput("");
          onClearProduct();
        }}
        placeholder="Buscar producto..."
        disabled={disabled}
        required={required}
        listboxId={`${id}-listbox`}
        suggestions={suggestions}
        getSuggestionKey={(product) => product.id}
        renderSuggestion={(product) => <AdminProductSearchSuggestion product={product} />}
        onSuggestionSelect={(product) => {
          setSearchInput(product.name);
          onSelectProduct(product);
        }}
        emptyMessage="No hay productos"
        label={
          <Typography variant="body2" mb={1} className="sr-only">
            {label}
          </Typography>
        }
      />
      <Div mt={3}>
        <AdminProductSourceSwitch
          mode="catalog"
          disabled={disabled}
          onSwitch={() => onCustomChange(true)}
        />
      </Div>
    </FormField>
  );
}
