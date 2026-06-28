"use client";

import * as React from "react";
import Link from "next/link";
import Box from "@/components/layout/Box";
import ProductCard from "@/components/ui/ProductCard";
import Typography from "@/components/ui/Typography";
import Icon from "@/components/ui/Icons";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/api";
import { zIndex } from "@/lib/design-tokens";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

type ProductCarouselProps = {
  title: string;
  products: Product[];
  seeAllHref?: string;
  className?: string;
};

export default function ProductCarousel({
  title,
  products,
  seeAllHref,
  className,
}: ProductCarouselProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);

  const updateScrollState = React.useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;

    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    setCanScrollPrev(element.scrollLeft > 1);
    setCanScrollNext(element.scrollLeft < maxScrollLeft - 1);
  }, []);

  React.useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    updateScrollState();

    element.addEventListener("scroll", updateScrollState, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(element);

    return () => {
      element.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [products, updateScrollState]);

  const scrollByViewport = (direction: -1 | 1) => {
    const element = scrollRef.current;
    if (!element) return;

    element.scrollBy({
      left: direction * element.clientWidth,
      behavior: "smooth",
    });
  };

  if (products.length === 0) return null;

  const showNavigation = canScrollPrev || canScrollNext;

  return (
    <Box display="flex" direction="col" gap="2" className={cn("w-full min-w-0", className)}>
      <Box
        display="flex"
        className="items-end justify-between gap-4 flex-wrap w-full"
      >
        <Typography variant="h2" uppercase>
          {title}
        </Typography>
        {seeAllHref ? (
          <Link
            href={seeAllHref}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Ver todos
          </Link>
        ) : null}
      </Box>

      <div className="relative w-full min-w-0">
        {showNavigation ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={!canScrollPrev}
              onClick={() => scrollByViewport(-1)}
              aria-label="Ver productos anteriores"
              className="absolute left-0 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 bg-background shadow-sm sm:inline-flex"
              style={{ zIndex: zIndex.dropdown }}
            >
              <Icon name="chevronLeft" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={!canScrollNext}
              onClick={() => scrollByViewport(1)}
              aria-label="Ver más productos"
              className="absolute right-0 top-1/2 hidden translate-x-1/2 -translate-y-1/2 bg-background shadow-sm sm:inline-flex"
              style={{ zIndex: zIndex.dropdown }}
            >
              <Icon name="chevronRight" aria-hidden />
            </Button>
          </>
        ) : null}

        <div
          ref={scrollRef}
          className="flex gap-8 overflow-x-auto scroll-smooth snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="w-[calc(50%-1rem)] shrink-0 snap-start sm:w-[calc(33.333%-1.34rem)] lg:w-[calc(25%-1.5rem)]"
            >
              <ProductCard
                id={product.id}
                slug={product.slug}
                name={product.name}
                team={product.team || ""}
                price={formatPrice(product.price)}
                image={product.image_urls[0] || ""}
                hoverImage={product.image_urls?.[1]}
              />
            </div>
          ))}
        </div>

        {showNavigation ? (
          <Box
            display="flex"
            gap="2"
            className="mt-3 items-center justify-center sm:hidden"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canScrollPrev}
              onClick={() => scrollByViewport(-1)}
              aria-label="Ver productos anteriores"
            >
              <Icon name="chevronLeft" aria-hidden />
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canScrollNext}
              onClick={() => scrollByViewport(1)}
              aria-label="Ver más productos"
            >
              Siguiente
              <Icon name="chevronRight" aria-hidden />
            </Button>
          </Box>
        ) : null}
      </div>
    </Box>
  );
}
