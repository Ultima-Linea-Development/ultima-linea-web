"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Typography from "@/components/ui/Typography";
import Icon from "@/components/ui/Icons";
import { zIndex } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

type AdminTableColumnFilterOption = {
  value: string;
  label: string;
};

type AdminTableColumnFilterProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: AdminTableColumnFilterOption[];
  allLabel?: string;
  className?: string;
};

export default function AdminTableColumnFilter({
  id,
  label,
  value,
  onChange,
  options,
  allLabel = "Todos",
  className,
}: AdminTableColumnFilterProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const activeOption = options.find((option) => option.value === value);
  const headerLabel = activeOption?.label ?? label;
  const isActive = Boolean(value);

  const updateMenuPosition = () => {
    if (!rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 8,
      left: rect.left,
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
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const selectValue = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  const optionClass = (selected: boolean) =>
    cn(
      "flex w-full cursor-pointer px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-200",
      selected && "bg-muted/50 font-medium"
    );

  return (
    <div ref={rootRef} className={cn("relative inline-flex items-center gap-1.5", className)}>
      <Typography variant="body2" className={cn(isActive && "font-medium")}>
        {headerLabel}
      </Typography>
      <button
        type="button"
        id={id}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex cursor-pointer items-center rounded-sm p-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isActive ? "text-foreground" : "text-muted-foreground"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={`Filtrar por ${label.toLowerCase()}`}
      >
        <Icon name={isActive ? "filterActive" : "filter"} className="size-[18px]" />
      </button>

      {open && menuPosition && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={`Filtrar por ${label.toLowerCase()}`}
          className="fixed min-w-40 border border-border bg-background py-1 shadow-sm"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            zIndex: zIndex.dropdown,
          }}
        >
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => selectValue("")}
            className={optionClass(!value)}
          >
            {allLabel}
          </button>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
              onClick={() => selectValue(option.value)}
              className={optionClass(value === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
