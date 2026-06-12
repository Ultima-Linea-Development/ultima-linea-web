"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Icon, { type IconName } from "@/components/ui/Icons";
import { Button } from "@/components/ui/button";
import Typography from "@/components/ui/Typography";
import { zIndex } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export type AdminTableMobileAction = {
  id: string;
  label: string;
  icon: IconName;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  warning?: boolean;
  active?: boolean;
};

type AdminTableMobileActionsMenuProps = {
  actions: AdminTableMobileAction[];
  ariaLabel?: string;
};

export default function AdminTableMobileActionsMenu({
  actions,
  ariaLabel = "Opciones",
}: AdminTableMobileActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const updateMenuPosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }

    updateMenuPosition();
    window.addEventListener("scroll", updateMenuPosition, true);
    window.addEventListener("resize", updateMenuPosition);
    return () => {
      window.removeEventListener("scroll", updateMenuPosition, true);
      window.removeEventListener("resize", updateMenuPosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (actions.length === 0) return null;

  const handleAction = (action: AdminTableMobileAction) => {
    if (action.disabled) return;
    action.onClick();
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
      <Button
        ref={buttonRef}
        type="button"
        variant="ghost"
        size="icon"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        className="text-muted-foreground hover:text-foreground h-10 w-10"
      >
        <Icon name="more" className="size-5" />
      </Button>
      {open && menuPosition && (
        <div
          id={menuId}
          role="menu"
          className="fixed min-w-40 border border-border bg-background py-1 shadow-md"
          style={{
            top: menuPosition.top,
            right: menuPosition.right,
            zIndex: zIndex.dropdown,
          }}
        >
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              disabled={action.disabled}
              onClick={() => handleAction(action)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                action.destructive
                  ? "text-delete-foreground hover:bg-delete hover:text-delete-foreground"
                  : action.warning
                    ? "text-warning-foreground hover:bg-warning hover:text-warning-foreground"
                    : "text-foreground hover:bg-gray-200 hover:text-foreground",
                action.active && "bg-muted/50",
                action.disabled && "pointer-events-none opacity-50"
              )}
            >
              <Icon name={action.icon} className="size-4 shrink-0" />
              <Typography variant="body2" as="span">
                {action.label}
              </Typography>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
