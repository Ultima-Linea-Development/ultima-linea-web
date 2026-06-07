import fs from "fs/promises";
import path from "path";

const DEFAULT_DIR = "/data/storage";
const DEFAULT_URL = "https://storage.ultimalinea.com.ar";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024;
const MAX_FILES_PER_BATCH = 10;

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export type StorageConfig = {
  dir: string;
  url: string;
};

export function loadStorageConfig(): StorageConfig {
  const dir = process.env.STORAGE_DIR || DEFAULT_DIR;
  const url = (process.env.STORAGE_URL || DEFAULT_URL).replace(/\/$/, "");
  return { dir, url };
}

function sanitizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .split("")
    .map((char) => {
      if (/[a-z0-9]/.test(char)) return char;
      if (char === " " || char === "_") return "-";
      return "";
    })
    .join("")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function saveProductImages(
  teamSlug: string,
  productSlug: string,
  files: File[]
): Promise<string[]> {
  if (files.length === 0) return [];
  if (files.length > MAX_FILES_PER_BATCH) {
    throw new Error(`máximo ${MAX_FILES_PER_BATCH} archivos por subida`);
  }

  const config = loadStorageConfig();
  const team = sanitizeSlug(teamSlug);
  const product = sanitizeSlug(productSlug);

  if (!team || !product) {
    throw new Error("team_slug y product_slug son obligatorios");
  }

  const relDir = path.join("products", team, product);
  const absDir = path.join(config.dir, relDir);
  await fs.mkdir(absDir, { recursive: true });

  let totalSize = 0;
  const urls: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = path.extname(file.name).toLowerCase();

    if (!ALLOWED_EXT.has(ext)) {
      throw new Error(`archivo "${file.name}": solo se permiten .jpg, .jpeg, .png, .webp`);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`archivo "${file.name}" supera el límite de 10 MiB`);
    }

    totalSize += file.size;
    if (totalSize > MAX_TOTAL_SIZE) {
      throw new Error("tamaño total supera el límite de 50 MiB");
    }

    const name = `${product}-${i + 1}${ext}`;
    const dstPath = path.join(absDir, name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(dstPath, buffer);

    const urlPath = `/${path.join(relDir, name).replace(/\\/g, "/")}`;
    urls.push(`${config.url}${urlPath}`);
  }

  return urls;
}

export async function deleteProductImages(imageUrls: string[]): Promise<void> {
  if (imageUrls.length === 0) return;

  const config = loadStorageConfig();
  const base = `${config.url}/`;
  let productDir: string | null = null;

  for (const url of imageUrls) {
    if (!url.startsWith(base)) continue;

    const relPath = url.slice(base.length).replace(/\//g, path.sep);
    const absPath = path.join(config.dir, relPath);

    try {
      await fs.unlink(absPath);
    } catch {
      // archivo inexistente
    }

    if (!productDir) {
      productDir = path.dirname(absPath);
    }
  }

  if (productDir) {
    try {
      await fs.rmdir(productDir);
    } catch {
      // directorio no vacío o inexistente
    }
  }
}

export function isLocalStorage(): boolean {
  const dir = process.env.STORAGE_DIR || DEFAULT_DIR;
  return dir !== DEFAULT_DIR;
}
