"use client";

import Box from "@/components/layout/Box";
import Logo from "@/components/brand/Logo";
import Icon from "@/components/ui/Icons";
import AdminNavLink from "./AdminNavLink";
import AdminLogoutLink from "./AdminLogoutLink";
import AdminMainContent from "./AdminMainContent";
import { getAdminNavItemsForRole } from "@/lib/admin-nav";
import { useAdminRole } from "@/components/admin/AdminRoleProvider";
import {
  ADMIN_SHELL_MOBILE_BAR_CLASS,
  ADMIN_SHELL_ROOT_CLASS,
  ADMIN_SHELL_SIDEBAR_CLASS,
} from "@/lib/admin-layout-styles";

type AdminShellProps = {
  children: React.ReactNode;
};

export default function AdminShell({ children }: AdminShellProps) {
  const navItems = getAdminNavItemsForRole(useAdminRole());

  return (
    <Box display="flex" align="stretch" className={ADMIN_SHELL_ROOT_CLASS}>
      <aside className={ADMIN_SHELL_SIDEBAR_CLASS}>
        <Box display="flex" direction="col" gap="8" className="flex-1">
          <Box>
            <Logo />
          </Box>
          <nav className="flex w-full flex-col gap-1">
            {navItems.map((item) => (
              <AdminNavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={<Icon name={item.icon} className="size-5" />}
              >
                {item.label}
              </AdminNavLink>
            ))}
          </nav>
        </Box>
        <Box className="mt-auto w-full border-t border-border pt-4">
          <AdminLogoutLink />
        </Box>
      </aside>

      <AdminMainContent>{children}</AdminMainContent>

      <aside className={ADMIN_SHELL_MOBILE_BAR_CLASS}>
        <nav className="flex flex-row items-center justify-around gap-0.5 w-full [&>a]:flex-1 [&>a]:justify-center [&>a]:min-w-0 [&>a]:py-2">
          {navItems.map((item) => (
            <AdminNavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={<Icon name={item.icon} className="size-5" />}
            >
              {item.label}
            </AdminNavLink>
          ))}
          <AdminLogoutLink />
        </nav>
      </aside>
    </Box>
  );
}
