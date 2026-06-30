"use client";

import Container from "@/components/layout/Container";
import NavBar from "@/components/layout/NavBar";
import NavLinks from "@/components/layout/NavLinks";
import NavLink from "@/components/navigation/NavLink";
import MobileMenu from "@/components/layout/MobileMenu";
import MobileSearch from "@/components/layout/MobileSearch";
import Logo from "@/components/brand/Logo";
import SearchInput from "@/components/ui/SearchInput";
import Nav from "@/components/ui/Nav";
import Icon from "@/components/ui/Icons";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Box from "@/components/layout/Box";

export default function Header() {
  return (
    <Nav position="sticky" border="bottom" background="white" uppercase={true}>
      <Container className="py-4">
        <NavBar>
          <Logo />
          <NavLinks>
            <NavLink href="/">Inicio</NavLink>
            <NavLink href="/guia-de-talles">Guía de talles</NavLink>
            <NavLink href="/contact">
              Contacto
            </NavLink>
          </NavLinks>
          <Box display="flex" align="center" gap="4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/login" aria-label="Iniciar sesión">
                <Icon name="profile" size={28} />
              </Link>
            </Button>
            <div className="hidden md:block">
              <SearchInput />
            </div>
            <MobileSearch />
            {/* <Button variant="ghost" size="icon" asChild>
              <Link href="/cart">
                <Icon name="cart" size={28} />
              </Link>
            </Button> */}
            <MobileMenu>
              <NavLinks mobile>
                <NavLink href="/" mobile>Inicio</NavLink>
                <NavLink href="/guia-de-talles" mobile>
                  Guía de talles
                </NavLink>
                <NavLink href="/contact" mobile>
                  Contacto
                </NavLink>
              </NavLinks>
            </MobileMenu>
          </Box>
        </NavBar>
      </Container>
    </Nav>
  );
}
