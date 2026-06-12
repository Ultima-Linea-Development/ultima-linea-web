"use client";

import Image from "next/image";
import Link from "next/link";
import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import { cn } from "@/lib/utils";

type AdminTableProductNameProps = {
  name: string;
  imageUrl?: string;
  href?: string;
  imageClassName?: string;
  className?: string;
};

export default function AdminTableProductName({
  name,
  imageUrl,
  href,
  imageClassName = "h-10 w-10 sm:h-12 sm:w-12",
  className,
}: AdminTableProductNameProps) {
  const content = (
    <Box display="flex" className={cn("items-center gap-2 sm:gap-3 min-w-0", className)}>
      {imageUrl ? (
        <div className={cn("relative shrink-0", imageClassName)}>
          <Image
            src={imageUrl}
            alt=""
            fill
            className="object-cover"
            sizes="48px"
            unoptimized
          />
        </div>
      ) : (
        <span className="text-muted-foreground text-xs shrink-0 w-10 sm:w-12 text-center">—</span>
      )}
      <span className="min-w-0 line-clamp-2">
        <Typography variant="body2" as="span">
          {name}
        </Typography>
      </span>
    </Box>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block max-w-full text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </Link>
    );
  }

  return content;
}
