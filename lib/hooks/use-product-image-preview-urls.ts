"use client";

import { useEffect, useMemo } from "react";

export function useProductImagePreviewUrls(files: File[]) {
  const previewUrls = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files]
  );

  useEffect(() => {
    return () => previewUrls.forEach(URL.revokeObjectURL);
  }, [previewUrls]);

  return previewUrls;
}
