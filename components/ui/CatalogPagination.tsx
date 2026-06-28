import Link from "next/link";
import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import Icon from "@/components/ui/Icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const CATALOG_SEARCH_PER_PAGE = 16;

type CatalogPaginationProps = {
  page: number;
  totalPages: number;
  getPageHref: (page: number) => string;
  className?: string;
};

export default function CatalogPagination({
  page,
  totalPages,
  getPageHref,
  className,
}: CatalogPaginationProps) {
  if (totalPages <= 1) return null;

  const prevHref = getPageHref(page - 1);
  const nextHref = getPageHref(page + 1);
  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;

  return (
    <Box
      display="flex"
      className={cn(
        "flex-col sm:flex-row items-stretch sm:items-center justify-center sm:justify-end gap-3 sm:gap-4 flex-wrap w-full",
        className
      )}
    >
      <Box display="flex" gap="2" className="items-center justify-center shrink-0">
        {isFirstPage ? (
          <Button variant="outline" size="sm" disabled>
            <Icon name="chevronLeft" aria-hidden />
            Anterior
          </Button>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link href={prevHref}>
              <Icon name="chevronLeft" aria-hidden />
              Anterior
            </Link>
          </Button>
        )}

        <Typography variant="body2">
          Página: {page} de {totalPages}
        </Typography>

        {isLastPage ? (
          <Button variant="outline" size="sm" disabled>
            Siguiente
            <Icon name="chevronRight" aria-hidden />
          </Button>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link href={nextHref}>
              Siguiente
              <Icon name="chevronRight" aria-hidden />
            </Link>
          </Button>
        )}
      </Box>
    </Box>
  );
}
