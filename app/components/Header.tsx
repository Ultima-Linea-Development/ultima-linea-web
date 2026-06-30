"use client";

import { useEffect, useState } from "react";
import Container from "@/components/layout/Container";
import NavBar from "@/components/layout/NavBar";
import NavLinks from "@/components/layout/NavLinks";
import NavLink from "@/components/navigation/NavLink";
import MobileMenu from "@/components/layout/MobileMenu";
import MobileSearch from "@/components/layout/MobileSearch";
import Logo from "@/components/brand/Logo";
import SearchInput from "@/components/ui/SearchInput";
import Nav from "@/components/ui/Nav";
// import Icon from "@/components/ui/Icons";
// import { Button } from "@/components/ui/button";
// import Link from "next/link";
import Box from "@/components/layout/Box";
import { getToken } from "@/lib/auth";

export default function Header() {
  const [hasAuthToken, setHasAuthToken] = useState(false);

  useEffect(() => {
    setHasAuthToken(Boolean(getToken()));
  }, []);

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
            {hasAuthToken && <NavLink href="/admin">Admin</NavLink>}
          </NavLinks>
          <Box display="flex" align="center" gap="4">
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
                {hasAuthToken && (
                  <NavLink href="/admin" mobile>
                    Admin
                  </NavLink>
                )}
              </NavLinks>
            </MobileMenu>
          </Box>
        </NavBar>
      </Container>
    </Nav>
  );
}
