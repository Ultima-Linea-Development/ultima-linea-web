import sharp from "sharp";
import { isHeicProductImageBuffer } from "@/lib/product-image-upload";
import { decodeHeicToJpegBuffer } from "@/lib/server/heic-convert";

const PREVIEW_MAX_SIZE = 480;
const PREVIEW_JPEG_QUALITY = 80;

async function toPreviewJpegBuffer(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize(PREVIEW_MAX_SIZE, PREVIEW_MAX_SIZE, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: PREVIEW_JPEG_QUALITY })
    .toBuffer();
}

export async function createProductImagePreviewBuffer(input: Buffer): Promise<Buffer> {
  if (isHeicProductImageBuffer(input)) {
    const jpeg = await decodeHeicToJpegBuffer(input, PREVIEW_JPEG_QUALITY / 100);
    return toPreviewJpegBuffer(jpeg);
  }

  try {
    return await toPreviewJpegBuffer(input);
  } catch (error) {
    if (!isHeicProductImageBuffer(input)) throw error;

    const jpeg = await decodeHeicToJpegBuffer(input, PREVIEW_JPEG_QUALITY / 100);
    return toPreviewJpegBuffer(jpeg);
  }
}
