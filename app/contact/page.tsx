import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/layout/Container";
import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import { Button } from "@/components/ui/button";
import {
  WHATSAPP_CONSULT_URL,
  WHATSAPP_DISPLAY_NUMBER,
  WHATSAPP_TEL_HREF,
} from "@/lib/whatsapp";
import { INSTAGRAM_URL } from "@/lib/social";
import { FaInstagram } from "react-icons/fa";
import { FaWhatsapp } from "react-icons/fa6";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Canales de contacto de Última Línea: teléfono, WhatsApp e Instagram.",
};

export default function ContactPage() {
  return (
    <Container>
      <section className="mx-auto w-full max-w-2xl py-2">
        <Typography
          variant="h1"
          uppercase
          align="center"
          mb={6}
          className="text-2xl leading-tight sm:text-3xl md:text-4xl"
        >
          Contacto
        </Typography>

        <Box
          display="flex"
          direction="col"
          gap="6"
          className="border border-border/80 bg-muted/40 px-4 py-5 sm:px-6 sm:py-6"
        >
          <div>
            <Typography variant="h5" mb={2}>
              Teléfono de contacto
            </Typography>
            <a
              href={WHATSAPP_TEL_HREF}
              className="text-base underline-offset-4 hover:underline"
            >
              {WHATSAPP_DISPLAY_NUMBER}
            </a>
          </div>

          <div>
            <Typography variant="h5" mb={3}>
              WhatsApp
            </Typography>
            <Button variant="ctaSolid" size="cta" className="w-fit" asChild>
              <Link href={WHATSAPP_CONSULT_URL} target="_blank" rel="noopener noreferrer">
                <FaWhatsapp aria-hidden />
                Escribir por WhatsApp
              </Link>
            </Button>
          </div>

          <div>
            <Typography variant="h5" mb={3}>
              Redes sociales
            </Typography>
            <Link
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 text-base transition-opacity hover:opacity-80"
              aria-label="Instagram Última Línea"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black">
                <FaInstagram className="h-5 w-5" aria-hidden />
              </span>
              <span className="underline-offset-4 hover:underline">
                @ultimalineastore
              </span>
            </Link>
          </div>
        </Box>
      </section>
    </Container>
  );
}
