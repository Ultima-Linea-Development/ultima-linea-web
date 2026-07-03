"use client";

import { useMemo } from "react";
import Box from "@/components/layout/Box";
import Input from "@/components/ui/Input";
import CurrencyInput from "@/components/ui/CurrencyInput";
import FormField from "@/components/ui/FormField";
import Label from "@/components/ui/Label";
import Typography from "@/components/ui/Typography";
import Icon from "@/components/ui/Icons";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import AdminCatalogProductSelect from "@/components/admin/AdminCatalogProductSelect";
import AdminProductIdentityFields from "@/components/admin/AdminProductIdentityFields";
import SupplierOrderSizeQuantityFields from "@/components/admin/SupplierOrderSizeQuantityFields";
import AdminProductImagePreview from "@/components/admin/AdminProductImagePreview";
import AdminProductSourceSwitch from "@/components/admin/AdminProductSourceSwitch";
import type { Product, ProductOptionsResponse, SupplierOrderItemType } from "@/lib/api";
import { adminIconTriggerClassName } from "@/lib/admin-interactive-styles";
import { getProductPrimaryImageUrl } from "@/lib/admin-product-image";
import { SUPPLIER_ORDER_ITEM_TYPE_OPTIONS } from "@/lib/supplier-order-display";
import {
  buildReservationRowsFromSizeRows,
  emptySupplierOrderSizeRow,
  draftHasSizeReservations,
  getReservedQuantityBySizesFromReservationRows,
  reservationEntriesFromRows,
  getSupplierOrderLineItemQuantity,
  sizeRowsToPayload,
  type SupplierOrderSizeQuantityRow,
  type SupplierOrderSizeReservationRow,
} from "@/lib/supplier-order-sizes";
import {
  reservationSellerFieldsFromCommissionPayload,
  reservationSellerFieldsFromFormValue,
} from "@/lib/reservation-seller";
import { validateSaleSellerValue } from "@/lib/sale-seller";
import { normalizeSupplierOrderPriceValue } from "@/lib/supplier-order-price-allocation";
import {
  buildProductName,
  DEFAULT_PRODUCT_TYPE,
  extractKitTypeFromName,
  extractProductTypeFromName,
} from "@/lib/product-name";
import { validateRequiredProductFields } from "@/lib/product-form-validation";
import { cn, formatPrice, type ShirtType } from "@/lib/utils";
import AdminLineItemReservationField from "@/components/admin/AdminLineItemReservationField";
import AdminLineItemSizeReservationFields from "@/components/admin/AdminLineItemSizeReservationFields";
import type { ExternalSeller, SaleAssignableUser } from "@/lib/api";
import {
  createDefaultSaleSellerValue,
  saleToSellerFormValue,
  type SaleSellerFormValue,
} from "@/lib/sale-seller";

export type SupplierOrderLineItemDraft = {
  key: string;
  productId?: string;
  productName: string;
  isNameManuallyEdited: boolean;
  productType: string;
  kitType: string;
  team: string;
  league: string;
  season: string;
  isCustomProductType: boolean;
  isCustomKitType: boolean;
  isCustomTeam: boolean;
  isCustomLeague: boolean;
  isCustomSeason: boolean;
  isCustomProduct: boolean;
  type: SupplierOrderItemType;
  sizeRows: SupplierOrderSizeQuantityRow[];
  reservationRows: SupplierOrderSizeReservationRow[];
  dorsal: string;
  description: string;
  link: string;
  price: string;
  isCustomPrice: boolean;
  reserveProduct: boolean;
  reservationSellerValue: SaleSellerFormValue;
};

export type SupplierOrderLineItemReservationConfig = {
  mode: "inherit" | "line";
  inheritSellerLabel?: string;
  assignableUsers: SaleAssignableUser[];
  externalSellers: ExternalSeller[];
  canAssignUser: boolean;
  currentUserId?: string | null;
};

type AdminSupplierOrderLineItemRowProps = {
  item: SupplierOrderLineItemDraft;
  products: Product[];
  productOptions: ProductOptionsResponse;
  isSubmitting: boolean;
  isPriceAllocationEnabled?: boolean;
  reservationConfig?: SupplierOrderLineItemReservationConfig;
  onChange: (
    key: string,
    updates: Partial<Omit<SupplierOrderLineItemDraft, "key">>
  ) => void;
  onRemove: (key: string) => void;
};

const fieldLabelClassName = "w-full min-w-0";

function parseProductType(type?: string): SupplierOrderItemType | null {
  const normalized = type?.trim().toUpperCase();
  if (normalized === "FAN" || normalized === "PLAYER" || normalized === "RETRO") {
    return normalized;
  }
  return null;
}

function shirtTypeToSupplierOrderType(value: ShirtType): SupplierOrderItemType {
  return value.toUpperCase() as SupplierOrderItemType;
}

function supplierOrderTypeToShirtType(value: SupplierOrderItemType): ShirtType {
  return value.toLocaleLowerCase() as ShirtType;
}

function buildLineItemProductName(item: SupplierOrderLineItemDraft): string {
  return buildProductName({
    productType: item.productType,
    kitType: item.kitType,
    team: item.team,
    season: item.season,
    type: supplierOrderTypeToShirtType(item.type),
  });
}

export function getSupplierOrderLineItemDraftTotal(item: SupplierOrderLineItemDraft): number {
  const payload = sizeRowsToPayload(item.sizeRows);
  const quantity = payload?.quantity ?? 0;
  const price = Number(item.price);
  if (!Number.isFinite(quantity) || !Number.isFinite(price)) return 0;
  return Math.max(0, quantity) * Math.max(0, price);
}

export function getSupplierOrderLineItemReservationRequestFields(
  item: SupplierOrderLineItemDraft,
  options?: {
    mode?: "inherit" | "line";
    canAssignUser?: boolean;
    sellerPayload?: {
      seller_type?: "internal" | "external";
      seller_user_id?: string;
      external_seller_id?: string;
      external_seller_name?: string;
    };
  }
) {
  const reservedQuantityBySizes = item.reserveProduct
    ? getReservedQuantityBySizesFromReservationRows(item.reservationRows, item.sizeRows)
    : {};
  const reservedSizes = Object.keys(reservedQuantityBySizes);

  if (reservedSizes.length === 0) {
    return {
      reserved: false,
      reserved_sizes: [] as string[],
      reserved_quantity_by_sizes: {} as Record<string, number>,
      reservation_entries: [] as ReturnType<typeof reservationEntriesFromRows>,
    };
  }

  const resolveSeller =
    options?.mode === "inherit" && options.sellerPayload
      ? () => reservationSellerFieldsFromCommissionPayload(options.sellerPayload!)
      : (row: SupplierOrderSizeReservationRow) =>
          reservationSellerFieldsFromFormValue(
            row.reservationSellerValue,
            options?.canAssignUser ?? false
          );

  const reservationEntries = reservationEntriesFromRows(
    item.reservationRows,
    item.sizeRows,
    resolveSeller
  );

  const primaryEntry = reservationEntries[0];

  return {
    reserved: true,
    reserved_sizes: reservedSizes,
    reserved_quantity_by_sizes: reservedQuantityBySizes,
    reservation_entries: reservationEntries,
    reserved_seller_type: primaryEntry?.reserved_seller_type,
    reserved_for_user_id: primaryEntry?.reserved_for_user_id,
    reserved_for_external_seller_id: primaryEntry?.reserved_for_external_seller_id,
    reserved_for_external_seller_name: primaryEntry?.reserved_for_external_seller_name,
  };
}

export function validateSupplierOrderLineItemReservations(
  item: SupplierOrderLineItemDraft,
  canAssignUser: boolean,
  mode: "inherit" | "line" = "line"
): string | null {
  if (!item.reserveProduct) return null;

  if (!lineItemDraftHasReservationEnabled(item)) {
    return `Indicá cuántas unidades reservar por talle en ${item.productName}.`;
  }

  if (mode === "line") {
    for (const row of item.reservationRows) {
      const quantity = Number(row.quantity);
      if (!row.size.trim() || !Number.isInteger(quantity) || quantity <= 0) continue;

      const sellerError = validateSaleSellerValue(row.reservationSellerValue, canAssignUser);
      if (sellerError) {
        return `Reserva de ${item.productName} (${row.size}): ${sellerError}`;
      }
    }
  }

  return null;
}

export function createLineItemReservationSellerValue(
  item: Pick<
    SupplierOrderLineItemDraft,
    "reservationSellerValue"
  > & {
    reserved_for_user_id?: string;
    reserved_for_external_seller_id?: string;
    reserved_for_external_seller_name?: string;
  },
  currentUserId: string | null
): SaleSellerFormValue {
  if (
    item.reserved_for_external_seller_id ||
    item.reserved_for_external_seller_name
  ) {
    return saleToSellerFormValue(
      {
        external_seller_id: item.reserved_for_external_seller_id,
        external_seller_name: item.reserved_for_external_seller_name,
      },
      currentUserId
    );
  }

  if (item.reserved_for_user_id) {
    return saleToSellerFormValue({ created_by: item.reserved_for_user_id }, currentUserId);
  }

  return item.reservationSellerValue;
}

export function lineItemDraftHasReservationEnabled(
  item: Pick<
    SupplierOrderLineItemDraft,
    "reserveProduct" | "sizeRows" | "reservationRows"
  >
): boolean {
  return draftHasSizeReservations(item.reserveProduct, item.reservationRows, item.sizeRows);
}

export function getSupplierOrderLineItemIdentityRequestFields(
  item: SupplierOrderLineItemDraft
) {
  return {
    product_type: item.productType.trim() || undefined,
    kit_type: item.kitType.trim() || undefined,
    team: item.team.trim() || undefined,
    league: item.league.trim() || undefined,
    season: item.season.trim() || undefined,
  };
}

export function validateSupplierOrderLineItemIdentity(
  item: SupplierOrderLineItemDraft
): string | null {
  if (!item.isCustomProduct) return null;
  if (!item.productType.trim()) {
    return `Completá el tipo de producto para ${item.productName || "un producto externo"}.`;
  }

  const requiredError = validateRequiredProductFields({
    name: item.productName,
  });

  if (!requiredError) return null;
  return `${item.productName || "Producto externo"}: ${requiredError}`;
}

export function createEmptySupplierOrderLineItemDraft(): SupplierOrderLineItemDraft {
  return {
    key: crypto.randomUUID(),
    productId: undefined,
    productName: "",
    isNameManuallyEdited: false,
    productType: DEFAULT_PRODUCT_TYPE,
    kitType: "",
    team: "",
    league: "",
    season: "",
    isCustomProductType: false,
    isCustomKitType: false,
    isCustomTeam: false,
    isCustomLeague: false,
    isCustomSeason: false,
    isCustomProduct: false,
    type: "FAN",
    sizeRows: [emptySupplierOrderSizeRow()],
    reservationRows: [],
    dorsal: "",
    description: "",
    link: "",
    price: "0",
    isCustomPrice: false,
    reserveProduct: false,
    reservationSellerValue: createDefaultSaleSellerValue(null),
  };
}

export default function AdminSupplierOrderLineItemRow({
  item,
  products,
  productOptions,
  isSubmitting,
  isPriceAllocationEnabled = false,
  reservationConfig,
  onChange,
  onRemove,
}: AdminSupplierOrderLineItemRowProps) {
  const handleSelectProduct = (product: Product) => {
    const productType = extractProductTypeFromName(product.name) ?? DEFAULT_PRODUCT_TYPE;
    const kitType = extractKitTypeFromName(product.name) ?? "";
    onChange(item.key, {
      productName: product.name,
      productId: product.id,
      isCustomProduct: false,
      isNameManuallyEdited: false,
      productType,
      kitType,
      team: product.team ?? "",
      league: product.league ?? "",
      season: product.season ?? "",
      isCustomProductType: false,
      isCustomKitType: false,
      isCustomTeam: false,
      isCustomLeague: false,
      isCustomSeason: false,
      price: String(product.price),
      isCustomPrice: false,
      type: parseProductType(product.type) ?? item.type,
    });
  };

  const handleClearProduct = () => {
    onChange(item.key, {
      productName: "",
      productId: undefined,
      isCustomProduct: false,
      isNameManuallyEdited: false,
      reserveProduct: false,
      reservationRows: [],
    });
  };

  const matchedProduct = useMemo(
    () => (item.productId ? products.find((product) => product.id === item.productId) : undefined),
    [item.productId, products]
  );

  const lineTotal = getSupplierOrderLineItemDraftTotal(item);
  const totalQuantity = getSupplierOrderLineItemQuantity(
    sizeRowsToPayload(item.sizeRows)?.quantity_by_sizes,
    0
  );
  const generatedProductName = buildLineItemProductName(item);

  const updateProductIdentity = (
    updates: Partial<
      Pick<
        SupplierOrderLineItemDraft,
        "productType" | "kitType" | "team" | "season" | "type"
      >
    >
  ) => {
    const nextItem = { ...item, ...updates };
    onChange(item.key, {
      ...updates,
      ...(item.isNameManuallyEdited
        ? {}
        : { productName: buildLineItemProductName(nextItem) }),
    });
  };

  const handleCustomProductChange = (isCustom: boolean) => {
    onChange(item.key, {
      isCustomProduct: isCustom,
      productId: isCustom ? undefined : item.productId,
      productName: isCustom ? generatedProductName : item.productName,
      isNameManuallyEdited: isCustom ? false : item.isNameManuallyEdited,
    });
  };

  const showReservationSection = Boolean(reservationConfig);

  const handleReserveProductChange = (reserveProduct: boolean) => {
    if (reserveProduct && item.reservationRows.length === 0) {
      onChange(item.key, {
        reserveProduct,
        reservationRows: buildReservationRowsFromSizeRows(
          item.sizeRows,
          item.reservationSellerValue
        ),
      });
      return;
    }

    onChange(item.key, {
      reserveProduct,
      reservationRows: reserveProduct ? item.reservationRows : [],
    });
  };

  return (
    <Box display="flex" direction="col" gap="3" align="stretch" className="relative w-full min-w-0 border border-border p-3 pr-10">
      <button
        type="button"
        onClick={() => onRemove(item.key)}
        disabled={isSubmitting}
        aria-label="Quitar ítem"
        className={cn(
          adminIconTriggerClassName,
          "absolute top-2 right-2 text-muted-foreground hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
        )}
      >
        <Icon name="delete" className="size-5" />
      </button>

      {item.isCustomProduct ? (
        <Box display="flex" direction="col" gap="3" className="w-full min-w-0">
          <AdminProductIdentityFields
            idPrefix={`order-product-${item.key}`}
            disabled={isSubmitting}
            name={item.productName}
            onNameChange={(name) =>
              onChange(item.key, {
                productName: name,
                isNameManuallyEdited: name.trim() !== generatedProductName.trim(),
              })
            }
            onRegenerateName={() =>
              onChange(item.key, {
                productName: generatedProductName,
                isNameManuallyEdited: false,
              })
            }
            isNameManuallyEdited={item.isNameManuallyEdited}
            productType={item.productType}
            productTypeOptions={productOptions.productTypes}
            isCustomProductType={item.isCustomProductType}
            onProductTypeChange={(productType) => updateProductIdentity({ productType })}
            onCustomProductTypeChange={(isCustomProductType) =>
              onChange(item.key, { isCustomProductType })
            }
            kitType={item.kitType}
            kitTypeOptions={productOptions.kitTypes}
            isCustomKitType={item.isCustomKitType}
            onKitTypeChange={(kitType) => updateProductIdentity({ kitType })}
            onCustomKitTypeChange={(isCustomKitType) =>
              onChange(item.key, { isCustomKitType })
            }
            team={item.team}
            teamOptions={productOptions.teams}
            isCustomTeam={item.isCustomTeam}
            onTeamChange={(team) => updateProductIdentity({ team })}
            onCustomTeamChange={(isCustomTeam) => onChange(item.key, { isCustomTeam })}
            league={item.league}
            leagueOptions={productOptions.leagues}
            isCustomLeague={item.isCustomLeague}
            onLeagueChange={(league) => onChange(item.key, { league })}
            onCustomLeagueChange={(isCustomLeague) => onChange(item.key, { isCustomLeague })}
            season={item.season}
            seasonOptions={productOptions.seasons}
            isCustomSeason={item.isCustomSeason}
            onSeasonChange={(season) => updateProductIdentity({ season })}
            onCustomSeasonChange={(isCustomSeason) => onChange(item.key, { isCustomSeason })}
            shirtType={supplierOrderTypeToShirtType(item.type)}
            onShirtTypeChange={(shirtType) =>
              updateProductIdentity({ type: shirtType ? shirtTypeToSupplierOrderType(shirtType) : "FAN" })
            }
          />
          <AdminProductSourceSwitch
            mode="custom"
            disabled={isSubmitting}
            onSwitch={() => handleCustomProductChange(false)}
          />
        </Box>
      ) : (
        <AdminCatalogProductSelect
          id={`order-product-${item.key}`}
          label="Producto"
          products={products}
          productName={item.productName}
          isCustomProduct={false}
          disabled={isSubmitting}
          required
          onSelectProduct={handleSelectProduct}
          onClearProduct={handleClearProduct}
          onCustomChange={handleCustomProductChange}
          onCustomNameChange={(name) => onChange(item.key, { productName: name })}
        />
      )}

      {matchedProduct && (
        <Box display="flex" align="center" gap="3" className="min-w-0">
          <AdminProductImagePreview
            imageUrl={getProductPrimaryImageUrl(matchedProduct)}
            alt={matchedProduct.name}
            size="lg"
          />
          <Box display="flex" direction="col" gap="1" className="min-w-0">
            <Typography variant="body2" className="line-clamp-2">
              {matchedProduct.name}
            </Typography>
            <Typography variant="body2" color="muted">
              Producto del catálogo · {formatPrice(matchedProduct.price)}
            </Typography>
          </Box>
        </Box>
      )}

      {!item.isCustomProduct && (
        <FormField htmlFor={`order-type-${item.key}`} label="Tipo" required className={fieldLabelClassName}>
          <Select
            id={`order-type-${item.key}`}
            value={item.type}
            onChange={(event) =>
              onChange(item.key, { type: event.target.value as SupplierOrderItemType })
            }
            disabled={isSubmitting}
            required
          >
            {SUPPLIER_ORDER_ITEM_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>
      )}

      <SupplierOrderSizeQuantityFields
        rows={item.sizeRows}
        onRowsChange={(sizeRows) => onChange(item.key, { sizeRows })}
        disabled={isSubmitting}
        idPrefix={`order-size-${item.key}`}
        sizeOptions={productOptions.sizes}
        required
      />

      {showReservationSection && reservationConfig && (
        <Box display="flex" direction="col" gap="3" align="stretch" className="w-full min-w-0 self-stretch">
          <AdminLineItemReservationField
            idPrefix={`order-reservation-${item.key}`}
            reserved={item.reserveProduct}
            onReservedChange={handleReserveProductChange}
            reservationSellerValue={item.reservationSellerValue}
            onReservationSellerChange={(reservationSellerValue) =>
              onChange(item.key, { reservationSellerValue })
            }
            assignableUsers={reservationConfig.assignableUsers}
            externalSellers={reservationConfig.externalSellers}
            canAssignUser={reservationConfig.canAssignUser}
            currentUserId={reservationConfig.currentUserId}
            disabled={isSubmitting}
            inheritSellerLabel={
              reservationConfig.mode === "inherit"
                ? reservationConfig.inheritSellerLabel
                : undefined
            }
            showSellerField={false}
            pendingCatalogProduct={item.isCustomProduct || !item.productId}
          />

          {item.reserveProduct && (
            <AdminLineItemSizeReservationFields
              idPrefix={`order-reservation-qty-${item.key}`}
              reservationRows={item.reservationRows}
              onReservationRowsChange={(reservationRows) =>
                onChange(item.key, { reservationRows })
              }
              orderSizeRows={item.sizeRows}
              disabled={isSubmitting}
              catalogProduct={matchedProduct}
              showSellerField={reservationConfig.mode === "line"}
              assignableUsers={reservationConfig.assignableUsers}
              externalSellers={reservationConfig.externalSellers}
              canAssignUser={reservationConfig.canAssignUser}
              currentUserId={reservationConfig.currentUserId}
            />
          )}
        </Box>
      )}

      <Box display="grid" cols={2} gap={4} className="w-full min-w-0">
        <FormField htmlFor={`order-dorsal-${item.key}`} label="Dorsal" className={fieldLabelClassName}>
          <Input
            id={`order-dorsal-${item.key}`}
            value={item.dorsal}
            onChange={(event) => onChange(item.key, { dorsal: event.target.value })}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField htmlFor={`order-link-${item.key}`} label="Link" className={fieldLabelClassName}>
          <Input
            id={`order-link-${item.key}`}
            type="url"
            value={item.link}
            onChange={(event) => onChange(item.key, { link: event.target.value })}
            disabled={isSubmitting}
            placeholder="https://..."
          />
        </FormField>
      </Box>

      <FormField htmlFor={`order-description-${item.key}`} label="Descripción" className={fieldLabelClassName}>
        <Textarea
          id={`order-description-${item.key}`}
          value={item.description}
          onChange={(event) => onChange(item.key, { description: event.target.value })}
          disabled={isSubmitting}
          rows={2}
        />
      </FormField>

      <FormField
        htmlFor={`order-price-${item.key}`}
        label="Precio unitario"
        required
        className={fieldLabelClassName}
      >
          <CurrencyInput
            id={`order-price-${item.key}`}
            value={item.price}
            onChange={(price) =>
              onChange(item.key, {
                price: normalizeSupplierOrderPriceValue(price),
                ...(isPriceAllocationEnabled ? { isCustomPrice: true } : {}),
              })
            }
            onBlur={() => {
              if (item.price === "") {
                onChange(item.key, { price: "0" });
              }
            }}
            disabled={isSubmitting || (isPriceAllocationEnabled && !item.isCustomPrice)}
            required
          />
        </FormField>
      {isPriceAllocationEnabled ? (
          <div className="mt-2">
            <Label
              htmlFor={`order-custom-price-${item.key}`}
              display="inline"
              spacing="none"
              className="flex w-fit max-w-full items-center gap-2"
            >
              <input
                id={`order-custom-price-${item.key}`}
                type="checkbox"
                checked={item.isCustomPrice}
                onChange={(event) => onChange(item.key, { isCustomPrice: event.target.checked })}
                disabled={isSubmitting}
                className="size-4 shrink-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <Typography variant="body2" as="span">
                Precio diferenciado
              </Typography>
            </Label>
          </div>
        ) : null}

      <Typography variant="body2" className="text-right">
        Cantidad total: {totalQuantity} · Subtotal: {formatPrice(lineTotal)}
      </Typography>
    </Box>
  );
}
