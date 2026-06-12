"use client";

import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
import Icon from "@/components/ui/Icons";
import Input from "@/components/ui/Input";
import Form from "@/components/ui/Form";
import Div from "@/components/ui/Div";
import Box from "@/components/layout/Box";
import { cn } from "@/lib/utils";

type SearchInputProps = {
  className?: string;
  onBlur?: () => void;
  onSubmit?: () => void;
};

export default function SearchInput({ className, onBlur, onSubmit }: SearchInputProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      onSubmit?.();
    }
  };

  return (
    <Form onSubmit={handleSubmit} className={cn("w-full", className)}>
      <Box display="flex" direction="row" align="center" gap="2" className="w-full">
        <Div position="relative" width="full">
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={onBlur}
            placeholder="Buscar..."
            style={{ paddingRight: query ? "5rem" : "2.75rem" }}
          />
          {query && (
            <button
              type="button"
              className="absolute right-10 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1 text-gray-500 transition-colors hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Limpiar búsqueda"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setQuery("")}
            >
              <Icon name="close" size={20} />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-1 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1 text-gray-500 transition-colors hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Buscar"
          >
            <Icon name="search" size={28} />
          </button>
        </Div>
      </Box>
    </Form>
  );
}
