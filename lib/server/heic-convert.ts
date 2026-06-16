export async function decodeHeicToJpegBuffer(
  input: Buffer,
  quality = 0.92
): Promise<Buffer> {
  const convert = (await import("heic-convert")).default;
  const output = await convert({
    buffer: input,
    format: "JPEG",
    quality,
  });

  return Buffer.from(output);
}
