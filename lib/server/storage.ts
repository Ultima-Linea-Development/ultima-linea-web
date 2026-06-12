import fs from "fs/promises";
import path from "path";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

const DEFAULT_DIR = "/data/storage";
const DEFAULT_URL = "https://storage.ultimalinea.com.ar";
const CLOUDINARY_FOLDER = "ultima-linea";
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

function loadCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  return { cloudName, apiKey, apiSecret };
}

function isCloudinaryStorageEnabled(): boolean {
  return Boolean(loadCloudinaryConfig());
}

function configureCloudinary(): void {
  const config = loadCloudinaryConfig();
  if (!config) {
    throw new Error("Cloudinary no está configurado");
  }

  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });
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

function assertFilesAreValid(files: File[]): void {
  if (files.length === 0) return;
  if (files.length > MAX_FILES_PER_BATCH) {
    throw new Error(`máximo ${MAX_FILES_PER_BATCH} archivos por subida`);
  }

  let totalSize = 0;
  for (const file of files) {
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
  }
}

function buildProductStoragePath(teamSlug: string, productSlug: string) {
  const team = sanitizeSlug(teamSlug);
  const product = sanitizeSlug(productSlug);

  if (!team || !product) {
    throw new Error("team_slug y product_slug son obligatorios");
  }

  return { team, product, relDir: path.posix.join("products", team, product) };
}

async function uploadBufferToCloudinary(
  buffer: Buffer,
  publicId: string
): Promise<UploadApiResponse> {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        overwrite: true,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result) {
          reject(new Error("Cloudinary no devolvió resultado de upload"));
          return;
        }
        resolve(result);
      }
    );

    stream.end(buffer);
  });
}

async function saveProductImagesToCloudinary(
  teamSlug: string,
  productSlug: string,
  files: File[]
): Promise<string[]> {
  const { product, relDir } = buildProductStoragePath(teamSlug, productSlug);
  const urls: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const buffer = Buffer.from(await file.arrayBuffer());
    const publicId = path.posix.join(CLOUDINARY_FOLDER, relDir, `${product}-${i + 1}`);
    const result = await uploadBufferToCloudinary(buffer, publicId);
    urls.push(result.secure_url);
  }

  return urls;
}

async function saveProductImagesToLocal(
  teamSlug: string,
  productSlug: string,
  files: File[]
): Promise<string[]> {
  const config = loadStorageConfig();
  const { product, relDir } = buildProductStoragePath(teamSlug, productSlug);
  const absDir = path.join(config.dir, relDir);
  await fs.mkdir(absDir, { recursive: true });

  const urls: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = path.extname(file.name).toLowerCase();
    const name = `${product}-${i + 1}${ext}`;
    const dstPath = path.join(absDir, name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(dstPath, buffer);

    const urlPath = `/${path.posix.join(relDir, name)}`;
    urls.push(`${config.url}${urlPath}`);
  }

  return urls;
}

export async function saveProductImages(
  teamSlug: string,
  productSlug: string,
  files: File[]
): Promise<string[]> {
  if (files.length === 0) return [];
  assertFilesAreValid(files);

  if (isCloudinaryStorageEnabled()) {
    return saveProductImagesToCloudinary(teamSlug, productSlug, files);
  }

  return saveProductImagesToLocal(teamSlug, productSlug, files);
}

async function deleteLocalProductImages(imageUrls: string[]): Promise<void> {
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

function parseCloudinaryPublicId(imageUrl: string): string | null {
  try {
    const url = new URL(imageUrl);
    if (url.hostname !== "res.cloudinary.com") return null;

    const segments = url.pathname.split("/").filter(Boolean);
    const uploadIndex = segments.indexOf("upload");
    if (uploadIndex === -1) return null;

    const publicIdSegments = segments.slice(uploadIndex + 1);
    if (publicIdSegments[0]?.startsWith("v")) {
      publicIdSegments.shift();
    }

    if (publicIdSegments.length === 0) return null;

    const last = publicIdSegments[publicIdSegments.length - 1];
    publicIdSegments[publicIdSegments.length - 1] = last.replace(/\.[^.]+$/, "");

    return publicIdSegments.join("/");
  } catch {
    return null;
  }
}

function getCloudinaryFolder(publicId: string): string | null {
  const lastSlash = publicId.lastIndexOf("/");
  if (lastSlash === -1) return null;
  return publicId.slice(0, lastSlash);
}

async function deleteCloudinaryProductImages(imageUrls: string[]): Promise<void> {
  configureCloudinary();

  const publicIds = imageUrls
    .map(parseCloudinaryPublicId)
    .filter((publicId): publicId is string => Boolean(publicId));
  const folders = [
    ...new Set(
      publicIds
        .map(getCloudinaryFolder)
        .filter((folder): folder is string => Boolean(folder))
    ),
  ];

  await Promise.all(
    publicIds.map(async (publicId) => {
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
      } catch {
        // archivo inexistente o URL no gestionada por Cloudinary
      }
    })
  );

  await Promise.all(
    folders.map(async (folder) => {
      try {
        await cloudinary.api.delete_resources_by_prefix(`${folder}/`, {
          resource_type: "image",
        });
        await cloudinary.api.delete_folder(folder);
      } catch {
        // carpeta inexistente, no vacía o no gestionada por Cloudinary
      }
    })
  );
}

export async function deleteProductImages(imageUrls: string[]): Promise<void> {
  if (imageUrls.length === 0) return;

  if (isCloudinaryStorageEnabled()) {
    await deleteCloudinaryProductImages(imageUrls);
  }

  await deleteLocalProductImages(imageUrls);
}

export function isLocalStorage(): boolean {
  if (isCloudinaryStorageEnabled()) return false;

  const dir = process.env.STORAGE_DIR || DEFAULT_DIR;
  return dir !== DEFAULT_DIR;
}
