"use client";

import Link from "next/link";
import Icon from "@/components/ui/Icons";
import { cn } from "@/lib/utils";

export default function AdminLogoutLink() {
  return (
    <Link
      href="/logout"
      className={cn(
        "flex flex-col items-center gap-1 px-2 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer md:flex-row md:gap-3 md:px-3 md:text-sm",
        "text-muted-foreground w-full md:text-left"
      )}
    >
      <Icon name="logout" className="size-5 shrink-0" />
      <span className="truncate">Cerrar Sesión</span>
    </Link>
  );
}
