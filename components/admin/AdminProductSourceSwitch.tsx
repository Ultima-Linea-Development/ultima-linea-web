"use client";

import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import Icon from "@/components/ui/Icons";
import { Button } from "@/components/ui/button";

type AdminProductSourceSwitchProps = {
  mode: "catalog" | "custom";
  disabled?: boolean;
  onSwitch: () => void;
};

export default function AdminProductSourceSwitch({
  mode,
  disabled = false,
  onSwitch,
}: AdminProductSourceSwitchProps) {
  const fromCatalog = mode === "catalog";

  return (
    <Box
      display="flex"
      direction="col"
      gap="2"
      align="stretch"
      className="w-full min-w-0 border border-border bg-muted/40 p-3"
    >
      <Typography variant="body2" className="text-muted-foreground">
        {fromCatalog
          ? "¿No encontrás el producto en el catálogo?"
          : "¿El producto ya está cargado en el catálogo?"}
      </Typography>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={disabled}
        onClick={onSwitch}
      >
        <Icon name={fromCatalog ? "add" : "catalog"} />
        {fromCatalog ? "No está en el catálogo — cargar manualmente" : "Buscar en el catálogo"}
      </Button>
    </Box>
  );
}
