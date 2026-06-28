import Box from "@/components/layout/Box";
import ProductCarousel from "@/components/ui/ProductCarousel";
import Typography from "@/components/ui/Typography";
import Div from "@/components/ui/Div";
import { productsApi } from "@/lib/api";
import {
  HOME_CAROUSEL_COUNT,
  HOME_LATEST_COUNT,
  HOME_PRODUCT_SECTIONS,
} from "@/lib/home-catalog";

async function HomeProducts() {
  const [latestResponse, ...sectionResponses] = await Promise.all([
    productsApi.getAll({ page: 1, per_page: HOME_LATEST_COUNT }),
    ...HOME_PRODUCT_SECTIONS.map((section) =>
      productsApi.getAll({
        type: section.type,
        page: 1,
        per_page: HOME_CAROUSEL_COUNT,
      })
    ),
  ]);

  if (latestResponse.error || !latestResponse.data) {
    return (
      <Div textAlign="center" py={8}>
        <Typography variant="body" color="muted">
          {latestResponse.error || "No se pudieron cargar los productos"}
        </Typography>
      </Div>
    );
  }

  const latestProducts = latestResponse.data.products.filter(
    (product) => product.is_active
  );

  const sections = HOME_PRODUCT_SECTIONS.map((section, index) => {
    const response = sectionResponses[index];
    const products =
      response.data?.products.filter((product) => product.is_active) ?? [];

    return {
      ...section,
      products,
    };
  }).filter((section) => section.products.length > 0);

  if (latestProducts.length === 0 && sections.length === 0) {
    return (
      <Div textAlign="center" py={8}>
        <Typography variant="body" color="muted">
          No hay productos disponibles
        </Typography>
      </Div>
    );
  }

  return (
    <Box display="flex" direction="col" gap="8" className="w-full min-w-0">
      {latestProducts.length > 0 ? (
        <ProductCarousel title="Últimos ingresos" products={latestProducts} />
      ) : null}

      {sections.map((section) => (
        <ProductCarousel
          key={section.id}
          title={section.title}
          products={section.products}
          seeAllHref={`/search?q=${encodeURIComponent(section.searchQuery)}`}
        />
      ))}
    </Box>
  );
}

export default HomeProducts;
