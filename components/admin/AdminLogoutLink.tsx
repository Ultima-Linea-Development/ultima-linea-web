"use client";

import Link from "next/link";
import Icon from "@/components/ui/Icons";
import { adminSurfaceInteractiveClassName } from "@/lib/admin-interactive-styles";
import { ADMIN_NAV_LINK_LAYOUT_CLASS } from "@/lib/admin-layout-styles";
import { cn } from "@/lib/utils";

const LOGOUT_LABEL = "Cerrar Sesión";

export default function AdminLogoutLink() {
  return (
    <Link
      href="/logout"
      aria-label={LOGOUT_LABEL}
      title={LOGOUT_LABEL}
      className={cn(
        ADMIN_NAV_LINK_LAYOUT_CLASS,
        "text-muted-foreground",
        adminSurfaceInteractiveClassName()
      )}
    >
      <Icon name="logout" className="size-5 shrink-0" />
      <span className="hidden truncate lg:inline">{LOGOUT_LABEL}</span>
    </Link>
  );
}
