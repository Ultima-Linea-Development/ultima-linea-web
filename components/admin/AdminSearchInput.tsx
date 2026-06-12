"use client";

import { KeyboardEvent, ReactNode, useEffect, useMemo, useState } from "react";
import Input from "@/components/ui/Input";
import Typography from "@/components/ui/Typography";
import Icon from "@/components/ui/Icons";
import { cn } from "@/lib/utils";

type AdminSearchInputProps<T> = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  label?: ReactNode;
  className?: string;
  suggestions: T[];
  getSuggestionKey: (item: T, index: number) => string;
  renderSuggestion: (item: T) => ReactNode;
  onSuggestionSelect: (item: T) => void;
  onSubmit?: (query: string) => void;
  emptyMessage?: string;
  listboxId?: string;
};

export default function AdminSearchInput<T>({
  id,
  value,
  onChange,
  onClear,
  placeholder = "Buscar...",
  disabled = false,
  required = false,
  label,
  className,
  suggestions,
  getSuggestionKey,
  renderSuggestion,
  onSuggestionSelect,
  onSubmit,
  emptyMessage = "No hay resultados",
  listboxId = "admin-search-listbox",
}: AdminSearchInputProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const visibleSuggestions = useMemo(() => {
    if (!value.trim()) return [];
    return suggestions;
  }, [suggestions, value]);

  const closeList = () => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const selectSuggestion = (item: T) => {
    onSuggestionSelect(item);
    closeList();
  };

  useEffect(() => {
    if (highlightedIndex < 0 || !isOpen) return;
    document
      .getElementById(`${listboxId}-option-${highlightedIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, isOpen, listboxId]);

  useEffect(() => {
    if (highlightedIndex >= visibleSuggestions.length) {
      setHighlightedIndex(visibleSuggestions.length > 0 ? visibleSuggestions.length - 1 : -1);
    }
  }, [highlightedIndex, visibleSuggestions.length]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const hasQuery = Boolean(value.trim());
    const hasSuggestions = visibleSuggestions.length > 0;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!hasQuery || !hasSuggestions) return;

      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((current) => {
        if (event.key === "ArrowDown") {
          if (current < visibleSuggestions.length - 1) return current + 1;
          return 0;
        }

        if (current > 0) return current - 1;
        return visibleSuggestions.length - 1;
      });
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeList();
      return;
    }

    if (event.key === "Enter") {
      if (hasQuery && hasSuggestions && highlightedIndex >= 0) {
        event.preventDefault();
        const item = visibleSuggestions[highlightedIndex];
        if (item) selectSuggestion(item);
        return;
      }

      if (hasQuery && onSubmit) {
        event.preventDefault();
        onSubmit(value.trim());
        closeList();
      }
    }
  };

  return (
    <div className={cn("w-full max-w-xl space-y-1", className)}>
      {label}
      <div className="relative">
        <Input
          id={id}
          type="text"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setHighlightedIndex(-1);
            setIsOpen(Boolean(event.target.value.trim()));
          }}
          onFocus={() => setIsOpen(Boolean(value.trim()))}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setTimeout(closeList, 100);
          }}
          role="combobox"
          aria-expanded={isOpen && Boolean(value.trim())}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={
            highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined
          }
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          style={{ paddingRight: value ? "2.75rem" : undefined }}
        />
        {value && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-gray-500 transition-colors hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Limpiar búsqueda"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onClear();
              closeList();
            }}
            disabled={disabled}
          >
            <Icon name="close" size={20} />
          </button>
        )}
        {isOpen && value.trim() && (
          <div
            id={listboxId}
            role="listbox"
            className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto border border-border bg-background"
          >
            {visibleSuggestions.length === 0 ? (
              <div className="px-4 py-3">
                <Typography variant="body2" color="muted">
                  {emptyMessage}
                </Typography>
              </div>
            ) : (
              visibleSuggestions.map((item, index) => {
                const isHighlighted = highlightedIndex === index;

                return (
                <button
                  key={getSuggestionKey(item, index)}
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isHighlighted}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-4 py-2 text-left transition-colors",
                    isHighlighted
                      ? "bg-gray-200 ring-1 ring-inset ring-gray-300"
                      : "hover:bg-muted/60"
                  )}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectSuggestion(item);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  disabled={disabled}
                >
                  {renderSuggestion(item)}
                </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
