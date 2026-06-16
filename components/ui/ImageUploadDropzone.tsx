"use client";

import { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import Typography from "@/components/ui/Typography";
import SortableImageGrid, { type SortableImageItem } from "@/components/ui/SortableImageGrid";
import {
  isAllowedProductImageFile,
  PRODUCT_IMAGE_ACCEPT_ATTRIBUTE,
  PRODUCT_IMAGE_FORMATS_LABEL,
} from "@/lib/product-image-upload";
import { useProductImagePreviewUrls } from "@/lib/hooks/use-product-image-preview-urls";

const MAX_FILES = 20;

type ImageUploadDropzoneProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  className?: string;
};

export default function ImageUploadDropzone({
  files,
  onFilesChange,
  className,
}: ImageUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const { previewUrls, isPreparing } = useProductImagePreviewUrls(files);

  const addFiles = useCallback(
    (newFiles: FileList | null) => {
      if (!newFiles?.length) return;

      const allowed = Array.from(newFiles).filter(isAllowedProductImageFile);
      if (allowed.length === 0) {
        setError(`Solo se permiten imágenes ${PRODUCT_IMAGE_FORMATS_LABEL}.`);
        return;
      }

      const total = files.length + allowed.length;
      if (total > MAX_FILES) {
        setError(`Máximo ${MAX_FILES} imágenes.`);
        return;
      }

      setError("");
      onFilesChange([...files, ...allowed]);
    },
    [files, onFilesChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const previewItems: SortableImageItem[] = files.map((file, index) => ({
    id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
    src: previewUrls[index] ?? "",
    alt: file.name,
  }));

  const handlePreviewReorder = (items: SortableImageItem[]) => {
    const fileById = new Map(previewItems.map((item, index) => [item.id, files[index]]));
    onFilesChange(
      items
        .map((item) => fileById.get(item.id))
        .filter((file): file is File => file !== undefined)
    );
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center border-2 border-dashed p-4 transition-colors outline-none",
          isDragging && "border-primary bg-muted",
          !isDragging && "border-input hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={PRODUCT_IMAGE_ACCEPT_ATTRIBUTE}
          multiple
          onChange={handleChange}
          className="sr-only"
          aria-hidden
        />
        <Typography variant="body2" color="muted">
          Arrastrá imágenes aquí o hacé clic para elegir
        </Typography>
        <Typography variant="body2" color="muted">
          {PRODUCT_IMAGE_FORMATS_LABEL}. Máx. {MAX_FILES} imágenes.
        </Typography>
      </div>

      {error && (
        <Typography variant="body2" color="destructive">
          {error}
        </Typography>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <Typography variant="body2" color="muted">
            {isPreparing
              ? "Preparando vista previa..."
              : "Vista previa. Arrastrá para reordenar antes de guardar."}
          </Typography>
          <SortableImageGrid
            items={previewItems}
            onReorder={handlePreviewReorder}
            onRemove={removeFile}
            preparing={isPreparing}
            itemClassName="h-24 w-24 sm:h-28 sm:w-28"
          />
        </div>
      )}
    </div>
  );
}
