"use client";

import Link from "next/link";
import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import Icon from "@/components/ui/Icons";
import {
  ADMIN_TABLE_OUTER_BORDER_CLASS,
  adminTableRowClassName,
} from "@/components/admin/AdminTable";
import { getAdminNavItemsForRole } from "@/lib/admin-nav";
import { adminSurfaceInteractiveClassName } from "@/lib/admin-interactive-styles";
import { useAdminRole } from "@/components/admin/AdminRoleProvider";
import { cn } from "@/lib/utils";

export default function AdminSectionLinks() {
  const navItems = getAdminNavItemsForRole(useAdminRole());

  return (
    <div
      className={cn(
        "w-full",
        ADMIN_TABLE_OUTER_BORDER_CLASS,
        "lg:mx-auto lg:max-w-2xl lg:border-0"
      )}
    >
      <nav className="grid w-full grid-cols-2 gap-px bg-gray-200 lg:gap-3 lg:bg-transparent">
        {navItems.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-[4.5rem] items-center gap-3 bg-background px-3 py-2.5 text-muted-foreground sm:px-4 sm:py-3",
              adminTableRowClassName({ stripeIndex: Math.floor(index / 2) }),
              adminSurfaceInteractiveClassName(
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              ),
              "lg:border lg:border-border lg:bg-background"
            )}
          >
            <Box className="shrink-0 text-muted-foreground">
              <Icon name={item.icon} className="size-5" />
            </Box>
            <Typography variant="body2" className="font-medium">
              {item.label}
            </Typography>
          </Link>
        ))}
      </nav>
    </div>
  );
}
