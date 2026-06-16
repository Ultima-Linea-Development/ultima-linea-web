import type { Metadata } from "next";
import type { Product } from "@/lib/api";
import {
  optimizeProductImageUrl,
  optimizeProductImageUrls,
  PRODUCT_IMAGE_GALLERY_WIDTH,
} from "@/lib/product-image-url";
import { generateSlug } from "@/lib/utils";

export const PUBLIC_STATIC_PATHS = [
  "/",
  "/contact",
  "/guia-de-talles",
] as const;

export const NOINDEX_METADATA: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export const NOINDEX_FOLLOW_METADATA: Metadata = {
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
    },
  },
};

export function resolvePublicSiteUrl(originFromHeaders = ""): string {
  const normalizedOrigin = originFromHeaders.replace(/\/$/, "");
  if (normalizedOrigin && !normalizedOrigin.includes("localhost")) {
    return normalizedOrigin;
  }

  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (envUrl && !envUrl.includes("localhost")) {
    return envUrl;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return normalizedOrigin || envUrl || "";
}

export function getMetadataBaseUrl(): URL | undefined {
  const siteUrl = resolvePublicSiteUrl();
  if (!siteUrl) return undefined;

  try {
    return new URL(siteUrl);
  } catch {
    return undefined;
  }
}

export function buildProductPath(product: {
  id: string;
  slug?: string;
  name?: string;
}): string {
  const slugPart =
    product.slug || (product.name ? generateSlug(product.name) : "");
  return slugPart ? `${slugPart}-${product.id}` : product.id;
}

export function buildProductDescription(product: Product): string {
  if (product.description?.trim()) {
    return product.description.trim();
  }

  const parts = [product.name];
  if (product.team) parts.push(product.team);
  if (product.season) parts.push(product.season);
  parts.push("en Última Línea");
  return parts.join(" - ");
}

export function buildProductMetadata(
  product: Product,
  siteOrigin: string
): Metadata {
  const canonicalPath = buildProductPath(product);
  const canonicalUrl = siteOrigin
    ? `${siteOrigin}/product/${canonicalPath}`
    : undefined;
  const description = buildProductDescription(product);
  const imageUrl = product.image_urls?.[0]
    ? optimizeProductImageUrl(product.image_urls[0], PRODUCT_IMAGE_GALLERY_WIDTH)
    : undefined;

  return {
    title: product.name,
    description,
    alternates: canonicalUrl ? { canonical: canonicalUrl } : undefined,
    openGraph: {
      title: product.name,
      description,
      url: canonicalUrl,
      siteName: "Última Línea",
      locale: "es_AR",
      type: "website",
      ...(imageUrl ? { images: [{ url: imageUrl, alt: product.name }] } : {}),
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: product.name,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

type ProductJsonLd = {
  "@context": "https://schema.org";
  "@type": "Product";
  name: string;
  description: string;
  image?: string[];
  sku?: string;
  brand?: { "@type": "Brand"; name: string };
  offers: {
    "@type": "Offer";
    url?: string;
    priceCurrency: "ARS";
    price: string;
    availability: string;
  };
};

function getProductAvailability(product: Product): string {
  const stockBySizes = product.stock_by_sizes;
  if (stockBySizes && Object.values(stockBySizes).some((qty) => qty > 0)) {
    return "https://schema.org/InStock";
  }

  if ((product.stock ?? 0) > 0) {
    return "https://schema.org/InStock";
  }

  return "https://schema.org/OutOfStock";
}

export function buildProductJsonLd(
  product: Product,
  siteOrigin: string
): ProductJsonLd {
  const canonicalPath = buildProductPath(product);
  const productUrl = siteOrigin
    ? `${siteOrigin}/product/${canonicalPath}`
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: buildProductDescription(product),
    ...(product.image_urls?.length
      ? {
          image: optimizeProductImageUrls(
            product.image_urls,
            PRODUCT_IMAGE_GALLERY_WIDTH
          ),
        }
      : {}),
    brand: {
      "@type": "Brand",
      name: product.team || "Última Línea",
    },
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "ARS",
      price: product.price.toFixed(2),
      availability: getProductAvailability(product),
    },
  };
}
