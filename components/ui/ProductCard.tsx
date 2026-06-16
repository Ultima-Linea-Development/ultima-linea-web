import Typography from "@/components/ui/Typography";
import Image from "next/image";
import Link from "next/link";
import Div from "@/components/ui/Div";
import Box from "@/components/layout/Box";
import {
  optimizeProductImageUrl,
  PRODUCT_IMAGE_CARD_WIDTH,
} from "@/lib/product-image-url";
import { cn, generateSlug } from "@/lib/utils";

type ProductCardProps = {
  id: string;
  slug?: string;
  name: string;
  team: string;
  price: string;
  image: string;
  hoverImage?: string;
  className?: string;
};

export default function ProductCard({
  id,
  slug,
  name,
  team,
  price,
  image,
  hoverImage,
  className,
}: ProductCardProps) {
  const productSlug = slug || generateSlug(name);
  const productPath = `${productSlug}-${id}`;
  const displayImage = optimizeProductImageUrl(image, PRODUCT_IMAGE_CARD_WIDTH);
  const displayHoverImage = hoverImage
    ? optimizeProductImageUrl(hoverImage, PRODUCT_IMAGE_CARD_WIDTH)
    : undefined;
  return (
    <Link href={`/product/${productPath}`} className="block w-full h-full">
      <Box
        display="flex"
        direction="col"
        className={cn(
          "border border-transparent transition-colors hover:border-black w-full h-full",
          className
        )}
      >
        <Div
          position="relative"
          overflow="hidden"
          background="muted"
          transition={true}
          cursor="pointer"
          aspect="square"
          width="full"
        >
          <div className="group absolute inset-0">
            <Image
              src={displayImage}
              alt={`${name} - ${team}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            {displayHoverImage && (
              <Image
                src={displayHoverImage}
                alt=""
                fill
                className="object-cover opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                aria-hidden
              />
            )}
          </div>
        </Div>
        <Div p={4} spacing="md">
          <Typography variant="h6">
            {price}
          </Typography>
          <Typography variant="body2">
            {name.length > 50 ? `${name.substring(0, 50)}...` : name}
          </Typography>
          <Typography variant="body2" color="gray">
            {team}
          </Typography>
        </Div>
      </Box>
    </Link>
  );
}
