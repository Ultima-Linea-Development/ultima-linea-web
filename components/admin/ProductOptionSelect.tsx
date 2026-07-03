"use client";

import { useMemo } from "react";
import Div from "@/components/ui/Div";
import Input from "@/components/ui/Input";
import FormField from "@/components/ui/FormField";
import Select from "@/components/ui/Select";

const CUSTOM_OPTION_VALUE = "__custom__";

type ProductOptionSelectProps = {
  id: string;
  label: string;
  value: string;
  options: string[];
  isCustom: boolean;
  onChange: (value: string) => void;
  onCustomChange: (isCustom: boolean) => void;
  placeholder?: string;
  customPlaceholder?: string;
  customOptionLabel?: string;
  disabled?: boolean;
  required?: boolean;
};

export default function ProductOptionSelect({
  id,
  label,
  value,
  options,
  isCustom,
  onChange,
  onCustomChange,
  placeholder = "Seleccionar",
  customPlaceholder = "Ingresá una opción",
  customOptionLabel,
  disabled = false,
  required = false,
}: ProductOptionSelectProps) {
  const normalizedOptions = useMemo(() => {
    const seen = new Set<string>();

    return options
      .map((option) => option.trim())
      .filter(Boolean)
      .filter((option) => {
        const key = option.toLocaleLowerCase();
        if (seen.has(key)) return false;

        seen.add(key);
        return true;
      });
  }, [options]);

  return (
    <FormField htmlFor={id} label={label} required={required} className="w-full min-w-0">
      <Select
        id={id}
        value={isCustom ? CUSTOM_OPTION_VALUE : value}
        onChange={(e) => {
          if (e.target.value === CUSTOM_OPTION_VALUE) {
            onCustomChange(true);
            onChange("");
            return;
          }

          onCustomChange(false);
          onChange(e.target.value);
        }}
        disabled={disabled}
        required={required && !isCustom}
      >
        <option value="">{placeholder}</option>
        {normalizedOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value={CUSTOM_OPTION_VALUE}>
          {customOptionLabel ?? `Agregar ${label.toLocaleLowerCase()}`}
        </option>
      </Select>
      {isCustom && (
        <Div mt={2}>
          <Input
            id={`${id}-custom`}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={customPlaceholder}
            disabled={disabled}
            required={required}
          />
        </Div>
      )}
    </FormField>
  );
}
