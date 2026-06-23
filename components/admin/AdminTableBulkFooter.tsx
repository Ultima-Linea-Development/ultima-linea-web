"use client";

import type { ReactNode } from "react";
import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import { Button } from "@/components/ui/button";

type AdminTableBulkFooterProps = {
  selectedCount: number;
  isSubmitting?: boolean;
  onCancelSelection: () => void;
  children?: ReactNode;
};

export default function AdminTableBulkFooter({
  selectedCount,
  isSubmitting = false,
  onCancelSelection,
  children,
}: AdminTableBulkFooterProps) {
  if (selectedCount <= 0) return null;

  return (
    <Box
      display="flex"
      className="items-center justify-between gap-4 flex-wrap border border-border bg-muted/30 p-3"
    >
      <Typography variant="body2">
        {selectedCount} seleccionado{selectedCount === 1 ? "" : "s"}
      </Typography>
      <Box display="flex" gap="2" className="flex-wrap">
        {children}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancelSelection}
          disabled={isSubmitting}
        >
          Cancelar selección
        </Button>
      </Box>
    </Box>
  );
}
