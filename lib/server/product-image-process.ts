import sharp from "sharp";
import {
  isHeicProductImageBuffer,
  isHeicProductImageFile,
} from "@/lib/product-image-upload";
import { decodeHeicToJpegBuffer } from "@/lib/server/heic-convert";
import { PRODUCT_IMAGE_UPLOAD_MAX_WIDTH } from "@/lib/product-image-url";

const WEBP_QUALITY = 82;

async function normalizeImageInput(
  input: Buffer,
  fileName?: string
): Promise<Buffer> {
  if (
    isHeicProductImageBuffer(input) ||
    (fileName && isHeicProductImageFile({ name: fileName, type: "" }))
  ) {
    return decodeHeicToJpegBuffer(input);
  }

  return input;
}

export async function optimizeProductImageBuffer(
  input: Buffer,
  fileName?: string
): Promise<Buffer> {
  const source = await normalizeImageInput(input, fileName);

  return sharp(source)
    .rotate()
    .resize(PRODUCT_IMAGE_UPLOAD_MAX_WIDTH, PRODUCT_IMAGE_UPLOAD_MAX_WIDTH, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}
