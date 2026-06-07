import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { loadStorageConfig, isLocalStorage } from "@/lib/server/storage";

type RouteContext = { params: Promise<{ path: string[] }> };

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(_request: NextRequest, context: RouteContext) {
  if (!isLocalStorage()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { path: segments } = await context.params;
  const config = loadStorageConfig();
  const filePath = path.join(config.dir, ...segments);

  const resolvedDir = path.resolve(config.dir);
  const resolvedFile = path.resolve(filePath);
  if (!resolvedFile.startsWith(resolvedDir)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await fs.readFile(resolvedFile);
    const ext = path.extname(resolvedFile).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
