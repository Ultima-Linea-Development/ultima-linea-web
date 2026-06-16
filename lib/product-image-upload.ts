export const PRODUCT_IMAGE_ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
] as const;

export const PRODUCT_IMAGE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const PRODUCT_IMAGE_ACCEPT_ATTRIBUTE =
  ".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif";

export const PRODUCT_IMAGE_FORMATS_LABEL = "JPG, PNG, WebP o HEIC";

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

export function isHeicProductImageFile(
  file: Pick<File, "name" | "type">
): boolean {
  const mime = file.type.toLowerCase();
  if (mime === "image/heic" || mime === "image/heif") return true;

  const ext = getProductImageExtension(file.name);
  return ext === ".heic" || ext === ".heif";
}

const HEIC_FTYP_BRANDS = new Set([
  "heic",
  "heix",
  "hevc",
  "hevx",
  "mif1",
  "msf1",
]);

function readAscii(bytes: Uint8Array): string {
  return new TextDecoder("ascii").decode(bytes);
}

export function isHeicProductImageBuffer(buffer: Uint8Array): boolean {
  if (buffer.length < 12) return false;
  if (readAscii(buffer.subarray(4, 8)) !== "ftyp") return false;

  const brand = readAscii(buffer.subarray(8, 12)).toLowerCase();
  return HEIC_FTYP_BRANDS.has(brand);
}
