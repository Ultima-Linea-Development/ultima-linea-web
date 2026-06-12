"use client";

import Box from "@/components/layout/Box";
import Logo from "@/components/brand/Logo";
import Icon from "@/components/ui/Icons";
import { cn } from "@/lib/utils";
import AdminNavLink from "./AdminNavLink";
import AdminLogoutLink from "./AdminLogoutLink";

type AdminShellProps = {
  children: React.ReactNode;
};

export default function AdminShell({ children }: AdminShellProps) {
  return (
    <Box
      display="flex"
      align="stretch"
      className="h-full min-h-0 flex-col md:flex-row"
    >
      {/* Sidebar: solo desktop */}
      <aside
        className={cn(
          "hidden md:flex md:w-64 md:flex-col md:border-r md:border-border md:bg-background md:p-6 md:h-full md:overflow-y-auto"
        )}
      >
        <Box display="flex" direction="col" gap="8" className="flex-1">
          <Box>
            <Logo />
          </Box>
          <nav className="flex flex-col gap-1">
            <AdminNavLink
              href="/admin/products"
              icon={<Icon name="catalog" className="size-5" />}
            >
              Catálogo
            </AdminNavLink>
            <AdminNavLink
              href="/admin/sales"
              icon={<Icon name="sales" className="size-5" />}
            >
              Ventas
            </AdminNavLink>
          </nav>
        </Box>
        <Box className="mt-auto pt-4 border-t border-border">
          <AdminLogoutLink />
        </Box>
      </aside>

      {/* Main: espacio para bottom bar en mobile */}
      <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>

      {/* Barra inferior: solo mobile */}
      <aside
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 flex md:hidden flex-row items-center justify-around border-t border-border bg-background p-2 h-16",
          "pb-[env(safe-area-inset-bottom,0)]"
        )}
      >
        <nav className="flex flex-row items-center justify-around gap-1 w-full [&>a]:flex-1 [&>a]:justify-center [&>a]:text-center [&>a]:min-w-0 [&>a]:py-2 [&>a]:!text-center">
          <AdminNavLink
            href="/admin/products"
            icon={<Icon name="catalog" className="size-5" />}
          >
            Catálogo
          </AdminNavLink>
          <AdminNavLink
            href="/admin/sales"
            icon={<Icon name="sales" className="size-5" />}
          >
            Ventas
          </AdminNavLink>
          <AdminLogoutLink />
        </nav>
      </aside>
    </Box>
  );
}
