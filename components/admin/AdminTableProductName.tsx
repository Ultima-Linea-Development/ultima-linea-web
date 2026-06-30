"use client";

import Image from "next/image";
import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import AdminTextLink from "@/components/admin/AdminTextLink";
import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

type AdminTableProductNameProps = {
  name: string;
  imageUrl?: string;
  href?: string;
  onClick?: () => void;
  imageClassName?: string;
  className?: string;
  inactive?: boolean;
  titlePrefix?: ReactNode;
};

export default function AdminTableProductName({
  name,
  imageUrl,
  href,
  onClick,
  imageClassName = "h-10 w-10 sm:h-12 sm:w-12",
  className,
  inactive = false,
  titlePrefix,
}: AdminTableProductNameProps) {
  const content = (
    <Box display="flex" className={cn("items-center gap-2 sm:gap-3 min-w-0", className)}>
      {imageUrl ? (
        <div className={cn("relative shrink-0 overflow-hidden", imageClassName)}>
          <Image
            src={imageUrl}
            alt=""
            fill
            className="object-cover"
            sizes="48px"
            unoptimized
          />
          {inactive ? (
            <span className="absolute bottom-0 left-0 bg-black/70 px-1 text-[10px] text-white leading-tight">
              Inactivo
            </span>
          ) : null}
        </div>
      ) : (
        <span className="text-muted-foreground text-xs shrink-0 w-10 sm:w-12 text-center">—</span>
      )}
      <Box display="flex" direction="col" gap="1" className="min-w-0">
        {titlePrefix}
        <span className="min-w-0 line-clamp-2">
          <Typography variant="body2" as="span">
            {name}
          </Typography>
        </span>
      </Box>
    </Box>
  );

  if (href) {
    return (
      <AdminTextLink
        href={href}
        tone="default"
        className="block max-w-full"
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </AdminTextLink>
    );
  }

  if (onClick) {
    return (
      <AdminTextLink tone="default" onClick={onClick} className="block max-w-full text-left">
        {content}
      </AdminTextLink>
    );
  }

  return content;
}
