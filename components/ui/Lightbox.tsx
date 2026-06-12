"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/Icons";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD_PX = 48;

type LightboxProps = {
  open: boolean;
  onClose: () => void;
  images: string[];
  currentIndex: number;
  onPrev?: () => void;
  onNext?: () => void;
  onSelectIndex?: (index: number) => void;
  alt?: string;
};

export default function Lightbox({
  open,
  onClose,
  images,
  currentIndex,
  onPrev,
  onNext,
  onSelectIndex,
  alt = "Imagen",
}: LightboxProps) {
  const [mounted, setMounted] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartXRef = React.useRef(0);
  const dragDeltaRef = React.useRef(0);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = React.useState(0);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) {
      setViewportWidth(0);
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateWidth = () => {
      const width = viewport.getBoundingClientRect().width;
      if (width > 0) {
        setViewportWidth(Math.round(width));
      }
    };

    updateWidth();
    requestAnimationFrame(updateWidth);

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(viewport);

    return () => resizeObserver.disconnect();
  }, [open, images.length]);

  React.useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && onPrev) onPrev();
      if (e.key === "ArrowRight" && onNext) onNext();
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose, onPrev, onNext]);

  React.useEffect(() => {
    if (!open) {
      setDragOffset(0);
      setIsDragging(false);
      dragDeltaRef.current = 0;
    }
  }, [open]);

  React.useEffect(() => {
    setDragOffset(0);
    dragDeltaRef.current = 0;
  }, [currentIndex]);

  const finishDrag = React.useCallback(() => {
    const delta = dragDeltaRef.current;

    if (delta > SWIPE_THRESHOLD_PX && onPrev) {
      onPrev();
    } else if (delta < -SWIPE_THRESHOLD_PX && onNext) {
      onNext();
    }

    dragDeltaRef.current = 0;
    setDragOffset(0);
    setIsDragging(false);
  }, [onNext, onPrev]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;

    dragStartXRef.current = e.clientX;
    dragDeltaRef.current = 0;
    setIsDragging(true);
    trackRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    dragDeltaRef.current = e.clientX - dragStartXRef.current;
    setDragOffset(dragDeltaRef.current);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    trackRef.current?.releasePointerCapture(e.pointerId);
    finishDrag();
  };

  const handlePointerCancel = () => {
    if (!isDragging) return;
    finishDrag();
  };

  if (!open || images.length === 0) return null;

  const hasMultiple = images.length > 1;

  const getSlideTransform = (index: number) => {
    const offset = (index - currentIndex) * viewportWidth + dragOffset;
    if (viewportWidth > 0) {
      return `translate3d(${offset}px, 0, 0)`;
    }
    return `translate3d(calc(${(index - currentIndex) * 100}% + ${dragOffset}px), 0, 0)`;
  };

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Vista ampliada"
      onClick={onClose}
    >
      <div
        className="relative flex h-full w-full max-h-[90vh] max-w-[90vw] flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          {hasMultiple && onPrev && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Imagen anterior"
              onClick={onPrev}
              className="absolute left-0 top-1/2 z-20 h-11 w-11 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70 sm:left-2 sm:h-12 sm:w-12"
            >
              <Icon name="chevronLeft" className="size-7 sm:size-8" />
            </Button>
          )}

          <div
            ref={viewportRef}
            className="relative h-full min-h-[50vh] w-full overflow-hidden sm:min-h-0"
          >
            <div
              ref={trackRef}
              className={cn(
                "relative h-full w-full touch-none select-none",
                hasMultiple && !isDragging && "cursor-grab",
                hasMultiple && isDragging && "cursor-grabbing"
              )}
              onPointerDown={hasMultiple ? handlePointerDown : undefined}
              onPointerMove={hasMultiple ? handlePointerMove : undefined}
              onPointerUp={hasMultiple ? handlePointerUp : undefined}
              onPointerCancel={hasMultiple ? handlePointerCancel : undefined}
            >
              {images.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className={cn(
                    "absolute top-0 left-0 h-full",
                    !isDragging && "transition-transform duration-300 ease-out"
                  )}
                  style={{
                    width: viewportWidth > 0 ? viewportWidth : "100%",
                    transform: hasMultiple ? getSlideTransform(index) : undefined,
                  }}
                >
                  <Image
                    src={url}
                    alt={`${alt} ${index + 1}`}
                    fill
                    className="pointer-events-none object-contain"
                    sizes="90vw"
                    priority={index === currentIndex}
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          </div>

          {hasMultiple && onNext && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Siguiente imagen"
              onClick={onNext}
              className="absolute right-0 top-1/2 z-20 h-11 w-11 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70 sm:right-2 sm:h-12 sm:w-12"
            >
              <Icon name="chevronRight" className="size-7 sm:size-8" />
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Cerrar"
            onClick={onClose}
            className="absolute right-0 top-0 z-20 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 sm:right-2 sm:top-2"
          >
            <Icon name="close" className="size-6" />
          </Button>
        </div>

        {hasMultiple && onSelectIndex && (
          <div className="relative z-20 mt-3 flex shrink-0 justify-center px-1 sm:mt-4">
            <div className="flex max-w-full gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {images.map((url, index) => (
                <button
                  key={`thumb-${url}-${index}`}
                  type="button"
                  onClick={() => onSelectIndex(index)}
                  aria-label={`Ver imagen ${index + 1} de ${images.length}`}
                  aria-current={index === currentIndex ? "true" : undefined}
                  className={cn(
                    "relative h-12 w-12 shrink-0 overflow-hidden border-2 transition-opacity sm:h-14 sm:w-14",
                    index === currentIndex
                      ? "border-white opacity-100"
                      : "border-white/20 opacity-60 hover:border-white/60 hover:opacity-100"
                  )}
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="56px"
                    draggable={false}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (mounted && typeof document !== "undefined") {
    return createPortal(content, document.body);
  }

  return content;
}
