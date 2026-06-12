import Link from "next/link";
import type { IconType } from "react-icons";
import Typography from "@/components/ui/Typography";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WHATSAPP_SIZE_GUIDE_URL } from "@/lib/whatsapp";
import {
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineScale,
  HiOutlineArrowsUpDown,
  HiOutlineUser,
  HiOutlineRectangleStack,
} from "react-icons/hi2";
import { FaWhatsapp } from "react-icons/fa6";

type SizeRow = {
  size: string;
  chest: number;
  length: number;
  height: string;
  weight: string;
};

const SIZE_ROWS: SizeRow[] = [
  { size: "S", chest: 100, length: 72, height: "160–170", weight: "50–60" },
  { size: "M", chest: 104, length: 74, height: "170–175", weight: "60–70" },
  { size: "L", chest: 108, length: 76, height: "175–185", weight: "70–75" },
  { size: "XL", chest: 112, length: 78, height: "180–190", weight: "75–85" },
  { size: "XXL", chest: 116, length: 80, height: "185–200", weight: "85–90" },
  { size: "XXXL", chest: 120, length: 82, height: "195–210", weight: "90–100" },
  { size: "XXXXL", chest: 124, length: 84, height: "195–215", weight: "95–115" },
];

const TABLE_HEADERS: Array<{
  key: keyof SizeRow;
  label: string;
  icon?: IconType;
  className?: string;
}> = [
  { key: "size", label: "Talle", className: "w-16" },
  { key: "chest", label: "Contorno de pecho (cm)", icon: HiOutlineUser },
  { key: "length", label: "Largo de prenda (cm)", icon: HiOutlineArrowsUpDown },
  { key: "height", label: "Altura recom. (cm)", icon: HiOutlineRectangleStack },
  { key: "weight", label: "Peso recom. (kg)", icon: HiOutlineScale },
];

const CELL_CLASS = "px-3 py-2.5 align-middle text-sm sm:px-4 sm:py-3";
const TH_CLASS =
  "px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:px-4 sm:text-[11px]";

function getRowValue(row: SizeRow, key: keyof SizeRow) {
  if (key === "size") return row.size;
  if (key === "chest") return row.chest;
  if (key === "length") return row.length;
  if (key === "height") return row.height;
  return row.weight;
}

type SizeGuideContentProps = {
  className?: string;
};

export default function SizeGuideContent({ className }: SizeGuideContentProps) {
  return (
    <section
      aria-labelledby="tabla-talles"
      className={cn("flex min-w-0 flex-col gap-6", className)}
    >
      <div>
        <Typography
          variant="caption"
          uppercase
          id="tabla-talles"
          className="mb-2 block text-[10px] tracking-[0.14em] text-muted-foreground sm:text-[11px]"
        >
          Tabla de talles
        </Typography>

        <div className="overflow-x-auto border border-border/90 bg-card shadow-[0_4px_20px_-10px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.03]">
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                {TABLE_HEADERS.map(({ key, label, icon: Icon, className: colClass }) => (
                  <th key={key} scope="col" className={cn(TH_CLASS, colClass)}>
                    <span className="inline-flex items-center gap-1.5">
                      {Icon && (
                        <Icon
                          className="hidden h-3.5 w-3.5 shrink-0 sm:inline"
                          aria-hidden
                        />
                      )}
                      {label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SIZE_ROWS.map((row) => (
                <tr
                  key={row.size}
                  className="border-b border-border/80 last:border-b-0 even:bg-muted/20"
                >
                  {TABLE_HEADERS.map(({ key }) => (
                    <td
                      key={key}
                      className={cn(
                        CELL_CLASS,
                        key === "size" &&
                          "font-bold uppercase tracking-tight [font-family:var(--font-archivo-black)]"
                      )}
                    >
                      {getRowValue(row, key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border border-border/80 bg-muted/40 px-4 py-4 sm:px-5 sm:py-5">
        <div className="mb-4 flex items-start gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center border border-border/80 bg-background"
            aria-hidden
          >
            <HiOutlineExclamationTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <Typography variant="h6" mb={2} uppercase className="tracking-[0.08em]">
              Importante
            </Typography>
            <Typography variant="body2" className="leading-relaxed">
              Las medidas se toman a mano, así que puede haber una diferencia de{" "}
              <span className="font-semibold text-foreground">2 a 3 cm</span>.
            </Typography>
          </div>
        </div>

        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          <li className="flex items-start gap-3">
            <HiOutlineCheckCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-foreground"
              aria-hidden
            />
            <Typography variant="body2" className="leading-relaxed">
              El{" "}
              <span className="font-semibold text-foreground">contorno de pecho</span>{" "}
              es la vuelta completa del pecho.
            </Typography>
          </li>
          <li className="flex items-start gap-3">
            <HiOutlineCheckCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-foreground"
              aria-hidden
            />
            <Typography variant="body2" className="leading-relaxed">
              Estas medidas corresponden a camisetas{" "}
              <span className="font-semibold text-foreground">versión fan/retro</span>;
              las más entalladas son las de player.
            </Typography>
          </li>
        </ul>
      </div>

      <div className="flex flex-col gap-3 border border-border/80 bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-5">
        <Typography variant="body2" className="leading-relaxed">
          Si estás entre dos talles,{" "}
          <span className="font-semibold text-foreground">escribinos</span> y te damos
          una mano.
        </Typography>
        <Button variant="ctaSolid" size="cta" className="w-full shrink-0 sm:w-auto" asChild>
          <Link href={WHATSAPP_SIZE_GUIDE_URL} target="_blank" rel="noopener noreferrer">
            <FaWhatsapp aria-hidden />
            Consultar por WhatsApp
          </Link>
        </Button>
      </div>
    </section>
  );
}
