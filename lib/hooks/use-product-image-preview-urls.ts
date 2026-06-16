"use client";

import { useEffect, useState } from "react";
import { adminUploadApi } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { isHeicProductImageFile } from "@/lib/product-image-upload";

async function buildPreviewUrl(file: File): Promise<string> {
  if (isHeicProductImageFile(file)) {
    const token = getToken();
    if (!token) return "";

    const blob = await adminUploadApi.previewProductImage(file, token);
    if (!blob) return "";

    return URL.createObjectURL(blob);
  }

  return URL.createObjectURL(file);
}

export function useProductImagePreviewUrls(files: File[]) {
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isPreparing, setIsPreparing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];

    const build = async () => {
      if (files.length === 0) {
        setPreviewUrls([]);
        setIsPreparing(false);
        return;
      }

      setIsPreparing(true);
      setPreviewUrls([]);

      const urls: string[] = [];

      for (const file of files) {
        if (cancelled) return;

        try {
          const url = await buildPreviewUrl(file);
          if (url) objectUrls.push(url);
          urls.push(url);
        } catch {
          urls.push("");
        }
      }

      if (!cancelled) {
        setPreviewUrls(urls);
        setIsPreparing(false);
      }
    };

    void build();

    return () => {
      cancelled = true;
      objectUrls.forEach(URL.revokeObjectURL);
    };
  }, [files]);

  return { previewUrls, isPreparing };
}
