import type { Metadata } from "next";
import Container from "@/components/layout/Container";
import Typography from "@/components/ui/Typography";
import Box from "@/components/layout/Box";
import SizeGuideContent from "@/components/guia-de-talles/SizeGuideContent";

export const metadata: Metadata = {
  title: "Guía de talles",
  description:
    "Tabla de talles y medidas recomendadas para camisetas Última Línea: contorno de pecho, largo de prenda, altura y peso.",
};

export default function GuiaDeTallesPage() {
  return (
    <Container>
      <Typography
        variant="h1"
        uppercase
        align="center"
        mb={6}
        className="text-2xl leading-tight sm:text-3xl md:text-4xl"
      >
        Guía de talles
      </Typography>

      <Box
        display="grid"
        cols={2}
        gap={8}
        className="mx-auto w-full max-w-7xl items-start md:grid-cols-1 lg:grid-cols-[1.2fr_1fr]"
      >
        <SizeGuideContent />

        <section
          aria-labelledby="instructivo-medidas"
          className="min-w-0 border border-border/80 bg-muted/40 px-4 py-5 sm:px-6 sm:py-6"
        >
          <Typography variant="h4" id="instructivo-medidas" mb={4}>
            Instructivo para medirte correctamente
          </Typography>
          <Typography variant="body" mb={6} color="muted">
            Usá una cinta métrica flexible y medí con la prenda o ropa liviana
            puesta. No ajustes demasiado la cinta: debe rodear el cuerpo sin
            apretar.
          </Typography>

          <Box display="flex" direction="col" gap="6">
            <article>
              <Typography variant="h5" mb={3}>
                1. Contorno de pecho
              </Typography>
              <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed">
                <li>Pasá la cinta alrededor del pecho, por la parte más ancha.</li>
                <li>
                  La cinta debe quedar recta, a la misma altura adelante y atrás.
                  Esta medida es la vuelta completa del pecho.
                </li>
                <li>
                  Ejemplo: si la cinta marca 104 cm, tu contorno de pecho es 104
                  cm.
                </li>
              </ul>
            </article>

            <article>
              <Typography variant="h5" mb={3}>
                2. Largo de prenda
              </Typography>
              <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed">
                <li>Tomá una camiseta que te quede bien.</li>
                <li>
                  Medí desde la parte más alta del hombro, junto al cuello, hasta
                  el final de la prenda.
                </li>
                <li>
                  Esa medida sirve para comparar con el largo indicado en la
                  tabla.
                </li>
              </ul>
            </article>

            <article>
              <Typography variant="h5" mb={3}>
                3. Altura recomendada
              </Typography>
              <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed">
                <li>Usá tu altura real para orientarte.</li>
                <li>
                  Ejemplo: si medís 1,78 m, estás dentro del rango 175–185 cm,
                  que corresponde a talle L según la tabla.
                </li>
              </ul>
            </article>

            <article>
              <Typography variant="h5" mb={3}>
                4. Peso recomendado
              </Typography>
              <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed">
                <li>Usá el peso como referencia secundaria.</li>
                <li>
                  No elijas el talle solo por peso. El contorno de pecho y el
                  largo de prenda son más importantes.
                </li>
              </ul>
            </article>
          </Box>
        </section>
      </Box>
    </Container>
  );
}
