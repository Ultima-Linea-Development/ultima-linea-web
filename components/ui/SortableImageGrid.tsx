"use client";

import { useCallback, useEffect, useState } from "react";
import { cn, reorderArray } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/Icons";
import Typography from "@/components/ui/Typography";

export type SortableImageItem = {
  id: string;
  src: string;
  alt?: string;
};

type SortableImageTileProps = {
  item: SortableImageItem;
  index: number;
  showOrderBadge: boolean;
  preparing?: boolean;
  onRemove?: (index: number) => void;
};

function SortableImageTile({
  item,
  index,
  showOrderBadge,
  preparing = false,
  onRemove,
}: SortableImageTileProps) {
  const [hasError, setHasError] = useState(false);
  const isLoading = preparing && !item.src;
  const showPlaceholder = !isLoading && (!item.src || hasError);

  useEffect(() => {
    setHasError(false);
  }, [item.src]);

  return (
    <>
      {isLoading ? (
        <div
          className="h-full w-full animate-pulse bg-muted-foreground/15"
          aria-label="Cargando vista previa"
        />
      ) : showPlaceholder ? (
        <div className="flex h-full w-full items-center justify-center p-1 text-center">
          <Typography variant="body2" color="muted" className="line-clamp-3 text-[10px]">
            {item.alt ?? `Imagen ${index + 1}`}
          </Typography>
        </div>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={item.src}
          alt={item.alt ?? `Imagen ${index + 1}`}
          className="pointer-events-none h-full w-full object-cover"
          draggable={false}
          onError={() => setHasError(true)}
        />
      )}
      {showOrderBadge && index === 0 && (
        <span className="absolute bottom-0 left-0 bg-black/70 px-1 text-[10px] text-white">
          Principal
        </span>
      )}
      {showOrderBadge && index === 1 && (
        <span className="absolute bottom-0 left-0 bg-black/70 px-1 text-[10px] text-white">
          Secundaria
        </span>
      )}
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Quitar imagen"
          className="absolute top-0 right-0 h-6 w-6 bg-black/60 text-white hover:bg-black/80"
          onClick={() => onRemove(index)}
        >
          <Icon name="close" className="size-3" />
        </Button>
      )}
    </>
  );
}

type SortableImageGridProps = {
  items: SortableImageItem[];
  onReorder: (items: SortableImageItem[]) => void;
  onRemove?: (index: number) => void;
  className?: string;
  itemClassName?: string;
  showOrderBadge?: boolean;
  preparing?: boolean;
};

export default function SortableImageGrid({
  items,
  onReorder,
  onRemove,
  className,
  itemClassName,
  showOrderBadge = false,
  preparing = false,
}: SortableImageGridProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    return (event: React.DragEvent<HTMLDivElement>) => {
      setDragIndex(index);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(index));
    };
  }, []);

  const handleDragOver = useCallback(
    (index: number) => {
      return (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        if (dragIndex !== null && dragIndex !== index) {
          setOverIndex(index);
        }
      };
    },
    [dragIndex]
  );

  const handleDrop = useCallback(
    (index: number) => {
      return (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const fromIndex =
          dragIndex ?? Number.parseInt(event.dataTransfer.getData("text/plain"), 10);

        if (Number.isNaN(fromIndex) || fromIndex === index) {
          setDragIndex(null);
          setOverIndex(null);
          return;
        }

        onReorder(reorderArray(items, fromIndex, index));
        setDragIndex(null);
        setOverIndex(null);
      };
    },
    [dragIndex, items, onReorder]
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="list" aria-label="Imágenes ordenables">
      {items.map((item, index) => (
        <div
          key={item.id}
          role="listitem"
          draggable
          onDragStart={handleDragStart(index)}
          onDragOver={handleDragOver(index)}
          onDrop={handleDrop(index)}
          onDragEnd={handleDragEnd}
          aria-grabbed={dragIndex === index}
          aria-label={`Imagen ${index + 1}${
            showOrderBadge && index === 0
              ? ", principal"
              : showOrderBadge && index === 1
                ? ", secundaria"
                : ""
          }`}
          className={cn(
            "relative h-20 w-20 shrink-0 overflow-hidden border border-border bg-muted cursor-grab active:cursor-grabbing touch-none",
            dragIndex === index && "opacity-50",
            overIndex === index && "ring-2 ring-primary ring-offset-1",
            itemClassName
          )}
        >
          <SortableImageTile
            item={item}
            index={index}
            showOrderBadge={showOrderBadge}
            preparing={preparing}
            onRemove={onRemove}
          />
        </div>
      ))}
    </div>
  );
}
