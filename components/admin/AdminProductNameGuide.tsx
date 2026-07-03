"use client";

import { useState } from "react";
import Box from "@/components/layout/Box";
import Modal from "@/components/ui/Modal";
import Icon from "@/components/ui/Icons";
import Typography from "@/components/ui/Typography";
import { cn } from "@/lib/utils";

const NAME_EXAMPLES = [
  "Camiseta Titular Inter Milan 2010 Versión Retro",
  "Camiseta Suplente Argentina 2006 Versión Retro",
  "Camiseta Barcelona 2024/2025 Versión Fan",
  "Camiseta Titular Roma 2025/2026 Versión Jugador",
  "Camiseta Alternativa Arsenal 2025/2026 Versión Fan",
] as const;

type AdminProductNameGuideModalProps = {
  open: boolean;
  onClose: () => void;
};

export function AdminProductNameGuideModal({ open, onClose }: AdminProductNameGuideModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Guía de nomenclatura" className="max-w-xl">
      <Box display="flex" direction="col" gap="4" className="p-4">
        <Typography variant="body2" color="muted">
          Usá este formato para que los productos queden uniformes en el catálogo y en los
          enlaces. Al guardar, el sistema ajusta el nombre según equipo, temporada y versión.
        </Typography>

        <Box display="flex" direction="col" gap="2">
          <Typography variant="body2" className="font-medium">
            Estructura
          </Typography>
          <Typography variant="body2" as="p" className="rounded-sm bg-muted/40 px-3 py-2 font-mono text-sm">
            Camiseta [Tipo] [Equipo] [Temporada] Versión [Fan | Jugador | Retro]
          </Typography>
        </Box>

        <Box display="flex" direction="col" gap="2">
          <Typography variant="body2" className="font-medium">
            Partes del nombre
          </Typography>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground">
            <li>
              <Typography variant="body2" as="span">
                <strong>Tipo de camiseta</strong> (si aplica): Titular, Suplente, Alternativa,
                Edición Especial, Tricolor, etc.
              </Typography>
            </li>
            <li>
              <Typography variant="body2" as="span">
                <strong>Equipo</strong>: mismo nombre que cargás en el campo Equipo.
              </Typography>
            </li>
            <li>
              <Typography variant="body2" as="span">
                <strong>Temporada</strong>: año único (<code className="text-xs">2010</code>) o
                rango con años completos (<code className="text-xs">2024/2025</code>,{" "}
                <code className="text-xs">1997/1998</code>).
              </Typography>
            </li>
            <li>
              <Typography variant="body2" as="span">
                <strong>Versión</strong>: Fan, Jugador o Retro según el selector de versión.
              </Typography>
            </li>
          </ul>
        </Box>

        <Box display="flex" direction="col" gap="2">
          <Typography variant="body2" className="font-medium">
            Ejemplos
          </Typography>
          <ul className="space-y-1.5">
            {NAME_EXAMPLES.map((example) => (
              <li key={example}>
                <Typography variant="caption" as="p" className="text-foreground">
                  {example}
                </Typography>
              </li>
            ))}
          </ul>
        </Box>
      </Box>
    </Modal>
  );
}

type AdminProductNameGuideTriggerProps = {
  className?: string;
};

export default function AdminProductNameGuideTrigger({ className }: AdminProductNameGuideTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={cn(
          "inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground",
          "transition-colors hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
        title="Ver guía de nomenclatura"
        aria-label="Ver guía de nomenclatura de productos"
        onClick={() => setOpen(true)}
      >
        <Icon name="info" className="size-4" aria-hidden />
      </button>
      <AdminProductNameGuideModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function AdminProductNameFieldLabel() {
  return (
    <span className="inline-flex items-center gap-1.5">
      Nombre
      <AdminProductNameGuideTrigger />
    </span>
  );
}
