import Link from "next/link";
import type { IconType } from "react-icons";
import {
  HiOutlineCalendarDays,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
  HiOutlineTag,
  HiOutlineTrophy,
} from "react-icons/hi2";
import Typography from "@/components/ui/Typography";
import { cn } from "@/lib/utils";

export type ProductFeatureItem = {
  id: string;
  label: string;
  value: string;
};

const FEATURE_ICONS: Record<string, IconType> = {
  team: HiOutlineShieldCheck,
  league: HiOutlineTrophy,
  season: HiOutlineCalendarDays,
  category: HiOutlineTag,
  "shirt-type": HiOutlineSparkles,
};

type ProductFeatureHighlightsProps = {
  features: ProductFeatureItem[];
  className?: string;
};

/** Columnas según ancho disponible; min(100%, 10rem) fuerza 1 col en contenedores angostos. */
const FEATURES_GRID_CLASS =
  "grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))]";

function featureSearchHref(value: string) {
  return `/search?q=${encodeURIComponent(value)}`;
}

export default function ProductFeatureHighlights({
  features,
  className,
}: ProductFeatureHighlightsProps) {
  if (features.length === 0) return null;

  return (
    <section
      aria-label="Características del producto"
      className={cn("w-full min-w-0", className)}
    >
      <Typography
        variant="caption"
        uppercase
        className="mb-1.5 block text-[10px] tracking-[0.14em] text-muted-foreground sm:mb-2 sm:text-[11px]"
      >
        Características
      </Typography>
      <ul
        className={cn(
          "m-0 grid list-none gap-x-1.5 gap-y-2.5 p-0 sm:gap-x-2 sm:gap-y-3",
          FEATURES_GRID_CLASS
        )}
      >
        {features.map(({ id, label, value }) => {
          const Icon = FEATURE_ICONS[id];
          if (!Icon) return null;

          return (
            <li key={id} className="flex min-w-0">
              <Link
                href={featureSearchHref(value)}
                aria-label={`Buscar ${label.toLowerCase()}: ${value}`}
                className={cn(
                  "flex w-full min-w-0 items-start gap-1 border border-border/90 bg-card px-2 py-1.5 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.03] transition-all duration-200",
                  "hover:border-black hover:bg-muted/40 hover:shadow-[0_6px_24px_-10px_rgba(0,0,0,0.18)]",
                  "sm:gap-1.5 sm:px-2.5 sm:py-2"
                )}
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center border border-border/80 bg-muted/50 sm:h-8 sm:w-8"
                  aria-hidden
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-foreground sm:h-4 sm:w-4" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0 sm:gap-0.5">
                  <span className="break-words text-xs font-normal leading-tight text-muted-foreground sm:text-[13px]">
                    {label}
                  </span>
                  <span className="break-words text-xs font-bold uppercase leading-snug tracking-tight text-foreground [font-family:var(--font-archivo-black)] sm:text-sm">
                    {value}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
