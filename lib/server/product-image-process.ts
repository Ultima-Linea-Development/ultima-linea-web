import { PRODUCT_IMAGE_UPLOAD_MAX_WIDTH } from "@/lib/product-image-url";

const WEBP_QUALITY = 82;

export async function optimizeProductImageBuffer(input: Buffer): Promise<Buffer> {
  try {
    const sharp = (await import("sharp")).default;
    return sharp(input)
      .rotate()
      .resize(PRODUCT_IMAGE_UPLOAD_MAX_WIDTH, PRODUCT_IMAGE_UPLOAD_MAX_WIDTH, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
  } catch {
    return input;
  }
}
