export const PRODUCT_IMAGE_ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

export const PRODUCT_IMAGE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export const PRODUCT_IMAGE_ACCEPT_ATTRIBUTE =
  ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

export const PRODUCT_IMAGE_FORMATS_LABEL = "JPG, PNG o WebP";

export function getProductImageExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot === -1) return "";
  return fileName.slice(dot).toLowerCase();
}

export function isAllowedProductImageFile(
  file: Pick<File, "name" | "type">
): boolean {
  const mime = file.type.toLowerCase();
  if (
    PRODUCT_IMAGE_ALLOWED_MIME_TYPES.includes(
      mime as (typeof PRODUCT_IMAGE_ALLOWED_MIME_TYPES)[number]
    )
  ) {
    return true;
  }

  const ext = getProductImageExtension(file.name);
  return PRODUCT_IMAGE_ALLOWED_EXTENSIONS.includes(
    ext as (typeof PRODUCT_IMAGE_ALLOWED_EXTENSIONS)[number]
  );
}
