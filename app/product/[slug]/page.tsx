import type { Metadata } from "next";
import { productsApi, type Product } from "@/lib/api";
import Container from "@/components/layout/Container";
import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import Div from "@/components/ui/Div";
import ProductImageGallery from "@/components/ui/ProductImageGallery";
import {
  cn,
  formatPrice,
  labelShirtType,
  normalizeShirtType,
} from "@/lib/utils";
import { getSiteOrigin } from "@/lib/site-origin";
import { buildWhatsAppConsultUrl } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import ProductFeatureHighlights, {
  type ProductFeatureItem,
} from "@/components/ui/ProductFeatureHighlights";
import ProductTags, { type ProductTagItem } from "@/components/ui/ProductTags";
import Link from "next/link";
import { notFound } from "next/navigation";

const categoryDisplay: Record<NonNullable<Product["category"]>, string> = {
  club: "Club",
  national: "Selección",
  retro: "Retro",
};

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const response = await productsApi.getBySlug(slug);

  if (response.error || !response.data) {
    return {
      title: "Producto no encontrado",
      description: "El producto que buscas no está disponible",
    };
  }

  const product = response.data;
  const title = product.name;
  const description =
    product.description ||
    `${product.name}${product.team ? ` - ${product.team}` : ""}${product.season ? ` ${product.season}` : ""
    } en Última Línea`;

  return {
    title,
    description,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const response = await productsApi.getBySlug(slug);

  if (response.error || !response.data) {
    notFound();
  }

  const product = response.data;
  const shirtType = normalizeShirtType(product.type);
  const hasProductAttributes = Boolean(
    product.team ||
      product.league ||
      product.season ||
      product.category ||
      shirtType
  );
  const imageUrls = product.image_urls ?? [];
  const origin = await getSiteOrigin();
  const productHref = origin ? `${origin}/product/${slug}` : "";
  const whatsappMessage = productHref
    ? `Hola, quisiera hacer una consulta sobre el producto: ${product.name}\n${productHref}`
    : `Hola, quisiera hacer una consulta sobre el producto: ${product.name}`;
  const whatsappProductUrl = buildWhatsAppConsultUrl(whatsappMessage);

  const featureItems: ProductFeatureItem[] = [];
  if (product.team) {
    featureItems.push({
      id: "team",
      label: "Equipo",
      value: product.team,
    });
  }
  if (product.league) {
    featureItems.push({
      id: "league",
      label: "Liga",
      value: product.league,
    });
  }
  if (product.season) {
    featureItems.push({
      id: "season",
      label: "Temporada",
      value: product.season,
    });
  }

  const productTags = [
    product.category
      ? { id: "category" as const, label: categoryDisplay[product.category] }
      : null,
    shirtType
      ? { id: "shirt-type" as const, label: labelShirtType(shirtType) }
      : null,
  ].filter((tag): tag is ProductTagItem => tag !== null);

  return (
    <Container className="pt-0">
      <Box className="grid grid-cols-1 gap-8 md:grid-cols-[1.5fr_1fr] lg:grid-cols-[2fr_1fr] md:grid-rows-[auto_1fr]">
        <Box
          display="flex"
          direction="col"
          gap="2"
          className="order-1 min-w-0 pt-4 md:col-start-2 md:row-start-1 md:pt-6"
        >
          {productTags.length > 0 && <ProductTags tags={productTags} />}
          <Typography
            variant="h1"
            uppercase
            className="text-xl leading-tight sm:text-2xl md:text-3xl lg:text-4xl"
          >
            {product.name}
          </Typography>
          <Typography
            variant="h3"
            as="p"
            className="text-lg md:text-2xl"
          >
            {formatPrice(product.price)}
          </Typography>
        </Box>

        <Box className="order-2 min-w-0 md:col-start-1 md:row-start-1 md:row-span-2 md:self-start">
          <ProductImageGallery
            imageUrls={imageUrls}
            productName={product.name}
          />
        </Box>

        <Box
          display="flex"
          direction="col"
          gap="6"
          className="order-3 w-full min-w-0 md:col-start-2 md:row-start-2"
        >
          {product.description && (
            <Div spacing="md">
              <Typography variant="body">{product.description}</Typography>
            </Div>
          )}

          {hasProductAttributes && (
            <Div border="top" pt={6} className="w-full min-w-0">
              <ProductFeatureHighlights features={featureItems} />
            </Div>
          )}

          <div
            className={cn(
              "grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-2",
              product.description &&
                !hasProductAttributes &&
                "border-t border-border pt-4"
            )}
          >
            <Button
              variant="ctaOutline"
              size="cta"
              className="w-full min-w-0 whitespace-normal leading-tight"
              asChild
            >
              <Link
                href="/guia-de-talles"
                target="_blank"
                rel="noopener noreferrer"
              >
                Guía de talles
              </Link>
            </Button>
            <Button
              variant="ctaSolid"
              size="cta"
              className="w-full min-w-0 whitespace-normal leading-tight"
              asChild
            >
              <a
                href={whatsappProductUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Quiero este producto
              </a>
            </Button>
          </div>
        </Box>
      </Box>
    </Container>
  );
}
