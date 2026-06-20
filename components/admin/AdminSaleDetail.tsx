"use client";

import { useMemo } from "react";
import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import AdminTableProductName from "@/components/admin/AdminTableProductName";
import {
  AdminTableMobileCard,
  AdminTableMobileField,
  AdminTableMobileGrid,
  AdminTableMobileList,
  ADMIN_TABLE_CELL_CLASS,
  ADMIN_TABLE_TH_CLASS,
  ADMIN_TABLE_DESKTOP_CLASS,
  ADMIN_DETAIL_TABLE_CLASS,
  ADMIN_TABLE_MODAL_WRAPPER_CLASS,
  adminTableRowClassName,
} from "@/components/admin/AdminTable";
import type { Product, Sale, SaleAssignableUser } from "@/lib/api";
import { getSaleLineItems } from "@/lib/sale-items";
import { formatSaleDateDisplay } from "@/lib/sale-date";
import { getSaleSellerLabel } from "@/lib/sale-seller";
import { cn, formatPrice, generateSlug } from "@/lib/utils";
import AdminSizeStockChip from "@/components/admin/AdminSizeStockChip";

type AdminSaleDetailProps = {
  sale: Sale;
  products?: Product[];
  assignableUsers?: SaleAssignableUser[];
};

export default function AdminSaleDetail({
  sale,
  products = [],
  assignableUsers = [],
}: AdminSaleDetailProps) {
  const lineItems = getSaleLineItems(sale);

  const productById = useMemo(
    () => Object.fromEntries(products.map((product) => [product.id, product] as const)),
    [products]
  );

  const productImages = useMemo(
    () =>
      Object.fromEntries(
        products.map((product) => [product.id, product.image_urls?.[0]] as const)
      ),
    [products]
  );

  const getProductHref = (productId: string, productName: string) => {
    const product = productById[productId];
    const slug = product?.slug || generateSlug(productName);
    return `/product/${slug}-${productId}`;
  };

  const cellClass = ADMIN_TABLE_CELL_CLASS;
  const thClass = ADMIN_TABLE_TH_CLASS;

  const metadataItems = [
    {
      key: "date",
      label: "Fecha de venta",
      value: formatSaleDateDisplay(sale.created_at),
    },
    {
      key: "seller",
      label: "Vendedor",
      value: getSaleSellerLabel(sale, assignableUsers),
    },
    ...(sale.transfer_alias
      ? [
          {
            key: "alias",
            label: "Alias de quien transfirió",
            value: sale.transfer_alias,
          },
        ]
      : []),
    ...(sale.description
      ? [
          {
            key: "description",
            label: "Descripción",
            value: sale.description,
            preWrap: true,
          },
        ]
      : []),
  ];

  const metadataGridClass =
    metadataItems.length >= 4
      ? "md:grid-cols-4"
      : metadataItems.length === 3
        ? "md:grid-cols-3"
        : "md:grid-cols-2";

  return (
    <Box display="flex" direction="col" gap="4" className="w-full min-w-0">
      <div
        className={cn(
          "grid w-full grid-cols-1 gap-4 border border-border bg-muted/30 p-4",
          metadataGridClass,
          "md:gap-6"
        )}
      >
        {metadataItems.map((item) => (
          <div key={item.key} className="flex min-w-0 w-full flex-col gap-1">
            <Typography variant="caption" color="muted">
              {item.label}
            </Typography>
            <Typography
              variant="body2"
              className={item.preWrap ? "whitespace-pre-wrap break-words" : "break-words"}
            >
              {item.value}
            </Typography>
          </div>
        ))}
      </div>

      <AdminTableMobileList>
        {lineItems.map((item, index) => (
          <AdminTableMobileCard
            key={`${item.product_id}-${item.size}-${index}`}
            stripeIndex={index}
          >
            <Box display="flex" direction="col" gap="3">
              <AdminTableProductName
                name={item.product_name}
                imageUrl={productImages[item.product_id]}
                href={getProductHref(item.product_id, item.product_name)}
                className="items-start"
              />
              <AdminTableMobileGrid>
                <AdminTableMobileField label="Talle">
                  <Typography variant="body2">{item.size || "—"}</Typography>
                </AdminTableMobileField>
                <AdminTableMobileField label="Cantidad">
                  <Typography variant="body2">{item.quantity}</Typography>
                </AdminTableMobileField>
                <AdminTableMobileField label="Precio unit.">
                  <Typography variant="body2">{formatPrice(item.unit_price)}</Typography>
                </AdminTableMobileField>
                <AdminTableMobileField label="Subtotal">
                  <Typography variant="body2">{formatPrice(item.total)}</Typography>
                </AdminTableMobileField>
                {item.skip_stock_deduction && (
                  <AdminTableMobileField label="Stock" fullWidth>
                    <Typography variant="body2">No descontado</Typography>
                  </AdminTableMobileField>
                )}
                {item.product_sku && (
                  <AdminTableMobileField label="SKU" fullWidth>
                    <Typography variant="body2">{item.product_sku}</Typography>
                  </AdminTableMobileField>
                )}
              </AdminTableMobileGrid>
            </Box>
          </AdminTableMobileCard>
        ))}
        <div className="flex items-center justify-between bg-muted/30 px-4 py-3">
          <Typography variant="body2" className="font-medium">
            Total
          </Typography>
          <Typography variant="body2" className="font-medium">
            {formatPrice(sale.total)}
          </Typography>
        </div>
      </AdminTableMobileList>

      <div className={cn(ADMIN_TABLE_DESKTOP_CLASS, ADMIN_TABLE_MODAL_WRAPPER_CLASS)}>
        <table className={ADMIN_DETAIL_TABLE_CLASS}>
          <thead className="bg-muted/50">
            <tr>
              <th className={thClass}>
                <Typography variant="body2">Producto</Typography>
              </th>
              <th className={thClass}>
                <Typography variant="body2">Talles</Typography>
              </th>
              <th className={thClass}>
                <Typography variant="body2">P. unit.</Typography>
              </th>
              <th className={thClass}>
                <Typography variant="body2">Subtotal</Typography>
              </th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, index) => (
              <tr
                key={`${item.product_id}-${item.size}-${index}`}
                className={adminTableRowClassName({ stripeIndex: index })}
              >
                <td className={cellClass}>
                  <Box display="flex" direction="col" gap="1">
                    <AdminTableProductName
                      name={item.product_name}
                      imageUrl={productImages[item.product_id]}
                      href={getProductHref(item.product_id, item.product_name)}
                    />
                    {item.product_sku && (
                      <Typography variant="caption" color="muted">
                        SKU {item.product_sku}
                      </Typography>
                    )}
                    {item.skip_stock_deduction && (
                      <Typography variant="caption" color="muted">
                        Stock no descontado
                      </Typography>
                    )}
                  </Box>
                </td>
                <td className={cellClass}>
                  {item.size ? (
                    <AdminSizeStockChip
                      size={item.size}
                      stock={item.quantity}
                      badgeAriaLabel={`Cantidad ${item.quantity}`}
                    />
                  ) : (
                    <Typography variant="body2">—</Typography>
                  )}
                </td>
                <td className={cellClass}>
                  <Typography variant="body2" className="whitespace-nowrap tabular-nums">
                    {formatPrice(item.unit_price)}
                  </Typography>
                </td>
                <td className={cellClass}>
                  <Typography variant="body2" className="whitespace-nowrap tabular-nums">
                    {formatPrice(item.total)}
                  </Typography>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30">
              <td colSpan={3} className={cn(cellClass, "text-right")}>
                <Typography variant="body2" className="font-medium">
                  Total
                </Typography>
              </td>
              <td className={cellClass}>
                <Typography variant="body2" className="whitespace-nowrap font-medium tabular-nums">
                  {formatPrice(sale.total)}
                </Typography>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Box>
  );
}
