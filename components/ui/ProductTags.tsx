import Link from "next/link";
import type { IconType } from "react-icons";
import { HiOutlineSparkles, HiOutlineTag } from "react-icons/hi2";
import { cn } from "@/lib/utils";

export type ProductTagItem = {
  id: "category" | "shirt-type";
  label: string;
};

const TAG_ICONS: Record<ProductTagItem["id"], IconType> = {
  category: HiOutlineTag,
  "shirt-type": HiOutlineSparkles,
};

type ProductTagsProps = {
  tags: ProductTagItem[];
  className?: string;
};

function tagSearchHref(label: string) {
  return `/search?q=${encodeURIComponent(label)}`;
}

export default function ProductTags({ tags, className }: ProductTagsProps) {
  if (tags.length === 0) return null;

  return (
    <ul
      className={cn(
        "m-0 flex list-none flex-wrap gap-1.5 p-0 sm:gap-2",
        className
      )}
    >
      {tags.map(({ id, label }) => {
        const Icon = TAG_ICONS[id];
        if (!Icon) return null;

        return (
          <li key={id}>
            <Link
              href={tagSearchHref(label)}
              className="inline-flex items-center gap-1 border border-border/90 bg-muted/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-foreground transition-colors hover:border-black hover:bg-muted/60 sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-[11px]"
            >
              <Icon
                className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5"
                aria-hidden
              />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
