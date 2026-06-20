"use client";

import Image from "next/image";
import Link from "next/link";
import Box from "@/components/layout/Box";
import Input from "@/components/ui/Input";
import FormField from "@/components/ui/FormField";
import Typography from "@/components/ui/Typography";
import Icon from "@/components/ui/Icons";
import type { Product } from "@/lib/api";
import { adminIconTriggerClassName } from "@/lib/admin-interactive-styles";
import Select from "@/components/ui/Select";
import { getProductTotalStock, orderedSizeEntries } from "@/lib/product-inventory";
import { cn, formatPrice, generateSlug } from "@/lib/utils";

export type SaleLineItemDraft = {
  key: string;
  product: Product;
  size: string;
  quantity: string;
  unitPrice: string;
  skipStockDeduction: boolean;
};

type AdminSaleLineItemRowProps = {
  item: SaleLineItemDraft;
  isSubmitting: boolean;
  onChange: (key: string, updates: Partial<Pick<SaleLineItemDraft, "size" | "quantity" | "unitPrice" | "skipStockDeduction">>) => void;
  onRemove: (key: string) => void;
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

function normalizeUnitPriceValue(value: string): string {
  if (value === "") return "";
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return "0";
  return String(Math.max(0, parsed));
}

export function getSaleLineItemDraftTotal(item: SaleLineItemDraft): number {
  const quantity = Number(item.quantity);
  const unitPrice = Number(item.unitPrice);
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return 0;
  return Math.max(0, quantity) * Math.max(0, unitPrice);
}

export default function AdminSaleLineItemRow({
  item,
  isSubmitting,
  onChange,
  onRemove,
}: AdminSaleLineItemRowProps) {
  const productSizes = orderedSizeEntries(item.product);
  const selectedStock =
    productSizes.length === 0
      ? getProductTotalStock(item.product)
      : item.size
        ? getStockForSize(item.product, item.size)
        : 0;

  const productHref = `/product/${(item.product.slug || generateSlug(item.product.name))}-${item.product.id}`;
  const lineTotal = getSaleLineItemDraftTotal(item);

  return (
    <Box display="flex" direction="col" gap="3" className="relative border border-border p-3 pr-10">
      <button
        type="button"
        onClick={() => onRemove(item.key)}
        disabled={isSubmitting}
        aria-label="Quitar producto"
        className={cn(
          adminIconTriggerClassName,
          "absolute top-2 right-2 text-muted-foreground hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
        )}
      >
        <Icon name="delete" className="size-5" />
      </button>

      <Box display="flex" align="start" gap="3">
        <Box display="flex" gap="3" className="min-w-0 items-center">
          {item.product.image_urls?.[0] ? (
            <Link
              href={productHref}
              target="_blank"
              rel="noopener noreferrer"
              className="relative block h-12 w-12 shrink-0"
            >
              <Image
                src={item.product.image_urls[0]}
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
          <Box display="flex" direction="col" gap="1" className="min-w-0">
            <Link
              href={productHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              <Typography variant="body2" as="span" className="line-clamp-2">
                {item.product.name}
              </Typography>
            </Link>
            <Typography variant="body2" color="muted">
              Catálogo: {formatPrice(item.product.price)}
            </Typography>
          </Box>
        </Box>
      </Box>

      <div className="grid w-full grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(140px,1fr)_120px_120px_minmax(180px,1.25fr)]">
        {productSizes.length > 0 ? (
          <FormField htmlFor={`sale-size-${item.key}`} label="Talle" required>
            <Select
              id={`sale-size-${item.key}`}
              value={item.size}
              onChange={(event) => onChange(item.key, { size: event.target.value })}
              disabled={isSubmitting}
              required
            >
              <option value="">Seleccionar talle</option>
              {productSizes.map(([optionSize]) => (
                <option key={optionSize} value={optionSize}>
                  {optionSize}
                </option>
              ))}
            </Select>
          </FormField>
        ) : (
          <div className="hidden lg:block" />
        )}

        <FormField htmlFor={`sale-stock-${item.key}`} label="Stock disponible">
          <Input
            id={`sale-stock-${item.key}`}
            type="number"
            value={selectedStock}
            readOnly
            disabled
          />
        </FormField>

        <FormField htmlFor={`sale-quantity-${item.key}`} label="Cantidad" required>
          <Input
            id={`sale-quantity-${item.key}`}
            type="number"
            min={1}
            value={item.quantity}
            onChange={(event) =>
              onChange(item.key, { quantity: normalizeQuantityValue(event.target.value) })
            }
            onBlur={() => {
              if (item.quantity === "") {
                onChange(item.key, { quantity: "1" });
              }
            }}
            disabled={isSubmitting}
            required
          />
        </FormField>

        <div className="sm:col-span-2 lg:col-span-1">
          <FormField htmlFor={`sale-unit-price-${item.key}`} label="Precio unitario" required>
            <Input
              id={`sale-unit-price-${item.key}`}
              type="number"
              min={0}
              value={item.unitPrice}
              onChange={(event) =>
                onChange(item.key, { unitPrice: normalizeUnitPriceValue(event.target.value) })
              }
              onBlur={() => {
                if (item.unitPrice === "") {
                  onChange(item.key, { unitPrice: String(item.product.price) });
                }
              }}
              disabled={isSubmitting}
              required
            />
          </FormField>
        </div>
      </div>

      <label className="flex w-fit max-w-full items-center gap-2">
        <input
          type="checkbox"
          checked={item.skipStockDeduction}
          onChange={(event) =>
            onChange(item.key, { skipStockDeduction: event.target.checked })
          }
          disabled={isSubmitting}
          className="size-4 shrink-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <Typography variant="body2" as="span">
          No descontar del stock
        </Typography>
      </label>

      <Typography variant="body2" className="text-right">
        Subtotal: {formatPrice(lineTotal)}
      </Typography>
    </Box>
  );
}
