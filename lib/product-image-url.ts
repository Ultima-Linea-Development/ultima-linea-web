const CLOUDINARY_HOST = "res.cloudinary.com";

export const PRODUCT_IMAGE_UPLOAD_MAX_WIDTH = 1600;
export const PRODUCT_IMAGE_CARD_WIDTH = 800;
export const PRODUCT_IMAGE_GALLERY_WIDTH = 1200;
export const PRODUCT_IMAGE_LIGHTBOX_WIDTH = 1600;

export function isCloudinaryImageUrl(url: string): boolean {
  try {
    return new URL(url).hostname === CLOUDINARY_HOST;
  } catch {
    return false;
  }
}

export function isCloudinaryTransformSegment(segment: string): boolean {
  if (/^v\d+$/.test(segment)) return false;
  return /^[a-z]_/.test(segment) || segment.includes(",");
}

export function optimizeProductImageUrl(
  url: string,
  width: number = PRODUCT_IMAGE_GALLERY_WIDTH
): string {
  if (!url || !isCloudinaryImageUrl(url)) return url;

  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1) return url;

    const transform = `f_auto,q_auto,w_${width}`;
    const afterUpload = parts.slice(uploadIndex + 1);

    while (
      afterUpload.length > 0 &&
      isCloudinaryTransformSegment(afterUpload[0])
    ) {
      afterUpload.shift();
    }

    const rebuilt = [...parts.slice(0, uploadIndex + 1), transform, ...afterUpload];
    parsed.pathname = `/${rebuilt.join("/")}`;
    return parsed.toString();
  } catch {
    return url;
  }
}

export function optimizeProductImageUrls(
  urls: string[],
  width: number = PRODUCT_IMAGE_GALLERY_WIDTH
): string[] {
  return urls.map((url) => optimizeProductImageUrl(url, width));
}
