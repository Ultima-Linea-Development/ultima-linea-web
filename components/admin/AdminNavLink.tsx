"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type AdminNavLinkProps = {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
};

export default function AdminNavLink({
  href,
  children,
  icon,
}: AdminNavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-1 px-2 py-2 rounded-md text-xs font-medium transition-colors md:flex-row md:gap-3 md:px-3 md:text-sm",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground"
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
    </Link>
  );
}
