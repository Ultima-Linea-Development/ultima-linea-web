import { cn } from "@/lib/utils";

/** Breakpoint desktop del panel admin (Tailwind `lg`, 1024px). */

export const ADMIN_LAYOUT_MOBILE_CLASS = "lg:hidden";
export const ADMIN_LAYOUT_DESKTOP_CLASS = "hidden lg:block";
export const ADMIN_LAYOUT_DESKTOP_FLEX_CLASS = "hidden lg:flex";

export const ADMIN_SHELL_ROOT_CLASS =
  "h-full min-h-0 min-w-0 flex flex-col overflow-x-hidden lg:flex-row";

export const ADMIN_SHELL_SIDEBAR_CLASS = cn(
  ADMIN_LAYOUT_DESKTOP_FLEX_CLASS,
  "lg:w-64 lg:flex-col lg:border-r lg:border-border lg:bg-background lg:p-6 lg:h-full lg:overflow-y-auto"
);

export const ADMIN_SHELL_MOBILE_BAR_CLASS = cn(
  ADMIN_LAYOUT_MOBILE_CLASS,
  "fixed bottom-0 left-0 right-0 z-40 flex flex-row items-center justify-around",
  "border-t border-border bg-background p-2 h-16 pb-[env(safe-area-inset-bottom,0)]"
);

export const ADMIN_NAV_LINK_LAYOUT_CLASS =
  "flex w-full flex-col items-center justify-center gap-0 px-1 py-2 text-xs font-medium lg:flex-row lg:items-center lg:justify-start lg:gap-3 lg:px-3 lg:text-left lg:text-sm";

export const ADMIN_MAIN_CONTENT_CLASS = cn(
  "flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto pt-4 sm:pt-6",
  "pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-6"
);

export const ADMIN_MAIN_CONTENT_INNER_CLASS =
  "mx-auto flex w-full max-w-7xl flex-col px-0 lg:px-6";

export const ADMIN_PAGE_PADDING_CLASS = "w-full px-4 sm:px-6 lg:px-0";

export const ADMIN_TABLE_MODAL_WRAPPER_CLASS = "w-full border border-border";

/** Alias de tablas: misma regla `lg` que el shell. */
export const ADMIN_TABLE_DESKTOP_CLASS = ADMIN_LAYOUT_DESKTOP_CLASS;
export const ADMIN_TABLE_MOBILE_CLASS = ADMIN_LAYOUT_MOBILE_CLASS;
