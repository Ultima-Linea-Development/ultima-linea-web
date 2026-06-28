import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Container from "@/components/layout/Container";
import Box from "@/components/layout/Box";
import ProductCard from "@/components/ui/ProductCard";
import Typography from "@/components/ui/Typography";
import Spinner from "@/components/ui/Spinner";
import Div from "@/components/ui/Div";
import CatalogPagination, { CATALOG_SEARCH_PER_PAGE } from "@/components/ui/CatalogPagination";
import { productsApi } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { NOINDEX_FOLLOW_METADATA } from "@/lib/seo";
import { Suspense } from "react";

type SearchPageProps = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

function parseSearchPage(value: string | undefined): number {
  const page = parseInt(value || "1", 10);
  if (Number.isNaN(page) || page < 1) return 1;
  return page;
}

function buildSearchHref(query: string, page: number): string {
  const params = new URLSearchParams({ q: query });
  if (page > 1) params.set("page", String(page));
  return `/search?${params.toString()}`;
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = params.q?.trim();

  return {
    ...NOINDEX_FOLLOW_METADATA,
    title: query ? `Búsqueda: ${query}` : "Búsqueda",
    description:
      "Busca camisetas de fútbol en nuestro catálogo. Encuentra las camisetas que estás buscando.",
  };
}

async function SearchResults({ query, page }: { query: string; page: number }) {
  if (!query) {
    return (
      <Div textAlign="center" py={8}>
        <Typography variant="body" color="muted">
          Ingresa un término de búsqueda
        </Typography>
      </Div>
    );
  }

  const response = await productsApi.search(query, {
    page,
    per_page: CATALOG_SEARCH_PER_PAGE,
  });

  if (response.error || !response.data) {
    return (
      <Div textAlign="center" py={8}>
        <Typography variant="body" color="muted">
          {response.error || "Error al realizar la búsqueda"}
        </Typography>
      </Div>
    );
  }

  const { total, results, total_pages: totalPages } = response.data;

  if (totalPages > 0 && page > totalPages) {
    redirect(buildSearchHref(query, totalPages));
  }

  if (total === 0) {
    return (
      <Div textAlign="center" py={8}>
        <Typography variant="h3" mb={2}>
          No se encontraron resultados
        </Typography>
        <Typography variant="body" color="muted">
          No hay artículos que coincidan con &quot;{query}&quot;
        </Typography>
      </Div>
    );
  }

  return (
    <>
      <Typography variant="body">
        Búsqueda de:
      </Typography>
      <Box display="flex" direction="row" align="end" gap="2">
        <Typography variant="h2" uppercase={true}>
          &quot;{query}&quot;
        </Typography>
        <Typography variant="body2" color="muted">
          [{total}]
        </Typography>
      </Box>
      <Box display="grid" cols={4} gap={8} className="w-full">
        {results.map((product) => (
          <ProductCard
            key={product.id}
            id={product.id}
            slug={product.slug}
            name={product.name}
            team={product.team || ""}
            price={formatPrice(product.price)}
            image={product.image_urls[0] || ""}
            hoverImage={product.image_urls?.[1]}
          />
        ))}
      </Box>
      <CatalogPagination
        page={page}
        totalPages={totalPages}
        getPageHref={(targetPage) => buildSearchHref(query, targetPage)}
        className="mt-4"
      />
    </>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || "";
  const page = parseSearchPage(params.page);

  return (
    <Container fullWidth>
      <Box display="flex" direction="col" justify="start" align="start" gap="2" className="w-full">
        <Suspense fallback={<Spinner />}>
          <SearchResults query={query} page={page} />
        </Suspense>
      </Box>
    </Container>
  );
}
