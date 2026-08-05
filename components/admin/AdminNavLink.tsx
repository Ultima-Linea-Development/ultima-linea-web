"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNavLinkClassName } from "@/lib/admin-interactive-styles";
import { ADMIN_NAV_LINK_LAYOUT_CLASS } from "@/lib/admin-layout-styles";
import { cn } from "@/lib/utils";

type AdminNavLinkProps = {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  label: string;
};

export default function AdminNavLink({
  href,
  children,
  icon,
  label,
}: AdminNavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      title={label}
      className={cn(ADMIN_NAV_LINK_LAYOUT_CLASS, adminNavLinkClassName(isActive))}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="hidden truncate lg:inline">{children}</span>
    </Link>
  );
}
