"use client";

import Box from "@/components/layout/Box";
import FormField from "@/components/ui/FormField";
import Input, { InputAdornment } from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Icon from "@/components/ui/Icons";
import ProductOptionSelect from "@/components/admin/ProductOptionSelect";
import { AdminProductNameFieldLabel } from "@/components/admin/AdminProductNameGuide";
import { type ShirtType } from "@/lib/utils";

export type ProductVersionFieldValue = ShirtType | "";

const SHIRT_TYPE_OPTIONS: Array<{ value: ShirtType; label: string }> = [
  { value: "fan", label: "Fan" },
  { value: "player", label: "Jugador" },
  { value: "retro", label: "Retro" },
];

type AdminProductIdentityFieldsProps = {
  idPrefix: string;
  disabled?: boolean;
  name: string;
  onNameChange: (value: string) => void;
  onRegenerateName: () => void;
  isNameManuallyEdited: boolean;
  productType: string;
  productTypeOptions: string[];
  isCustomProductType: boolean;
  onProductTypeChange: (value: string) => void;
  onCustomProductTypeChange: (value: boolean) => void;
  kitType: string;
  kitTypeOptions: string[];
  isCustomKitType: boolean;
  onKitTypeChange: (value: string) => void;
  onCustomKitTypeChange: (value: boolean) => void;
  team: string;
  teamOptions: string[];
  isCustomTeam: boolean;
  onTeamChange: (value: string) => void;
  onCustomTeamChange: (value: boolean) => void;
  league: string;
  leagueOptions: string[];
  isCustomLeague: boolean;
  onLeagueChange: (value: string) => void;
  onCustomLeagueChange: (value: boolean) => void;
  season: string;
  seasonOptions: string[];
  isCustomSeason: boolean;
  onSeasonChange: (value: string) => void;
  onCustomSeasonChange: (value: boolean) => void;
  shirtType: ProductVersionFieldValue;
  onShirtTypeChange: (value: ProductVersionFieldValue) => void;
};

export default function AdminProductIdentityFields({
  idPrefix,
  disabled = false,
  name,
  onNameChange,
  onRegenerateName,
  isNameManuallyEdited,
  productType,
  productTypeOptions,
  isCustomProductType,
  onProductTypeChange,
  onCustomProductTypeChange,
  kitType,
  kitTypeOptions,
  isCustomKitType,
  onKitTypeChange,
  onCustomKitTypeChange,
  team,
  teamOptions,
  isCustomTeam,
  onTeamChange,
  onCustomTeamChange,
  league,
  leagueOptions,
  isCustomLeague,
  onLeagueChange,
  onCustomLeagueChange,
  season,
  seasonOptions,
  isCustomSeason,
  onSeasonChange,
  onCustomSeasonChange,
  shirtType,
  onShirtTypeChange,
}: AdminProductIdentityFieldsProps) {
  return (
    <Box display="flex" direction="col" gap="4" align="stretch" className="w-full min-w-0">
      <FormField
        htmlFor={`${idPrefix}-name`}
        label={<AdminProductNameFieldLabel />}
        required
        className="w-full min-w-0"
      >
        <Input
          id={`${idPrefix}-name`}
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          required
          placeholder="Camiseta Alternativa Arsenal 2025/2026 Versión Fan"
          disabled={disabled}
          endIcon={
            isNameManuallyEdited ? (
              <InputAdornment
                aria-label="Regenerar nombre"
                title="Regenerar nombre"
                onClick={onRegenerateName}
                disabled={disabled}
              >
                <Icon name="rollback" className="size-4" aria-hidden />
              </InputAdornment>
            ) : null
          }
        />
      </FormField>

      <div className="grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
        <ProductOptionSelect
          id={`${idPrefix}-product-type`}
          label="Tipo de producto"
          value={productType}
          options={productTypeOptions}
          isCustom={isCustomProductType}
          onChange={onProductTypeChange}
          onCustomChange={onCustomProductTypeChange}
          customPlaceholder="Ingresá el tipo de producto"
          disabled={disabled}
          required
        />
        <ProductOptionSelect
          id={`${idPrefix}-kit-type`}
          label="Tipo de camiseta"
          value={kitType}
          options={kitTypeOptions}
          isCustom={isCustomKitType}
          onChange={onKitTypeChange}
          onCustomChange={onCustomKitTypeChange}
          customPlaceholder="Ingresá el tipo de camiseta"
          disabled={disabled}
        />
        <FormField
          htmlFor={`${idPrefix}-shirt-type`}
          label="Versión"
          className="w-full min-w-0"
        >
          <Select
            id={`${idPrefix}-shirt-type`}
            value={shirtType}
            onChange={(e) => onShirtTypeChange(e.target.value as ProductVersionFieldValue)}
            disabled={disabled}
          >
            <option value="">Sin versión</option>
            {SHIRT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FormField>
        <ProductOptionSelect
          id={`${idPrefix}-team`}
          label="Equipo"
          value={team}
          options={teamOptions}
          isCustom={isCustomTeam}
          onChange={onTeamChange}
          onCustomChange={onCustomTeamChange}
          customPlaceholder="Ingresá el equipo"
          disabled={disabled}
        />
        <ProductOptionSelect
          id={`${idPrefix}-league`}
          label="Liga"
          value={league}
          options={leagueOptions}
          isCustom={isCustomLeague}
          onChange={onLeagueChange}
          onCustomChange={onCustomLeagueChange}
          customPlaceholder="Ingresá la liga"
          disabled={disabled}
        />
        <ProductOptionSelect
          id={`${idPrefix}-season`}
          label="Temporada"
          value={season}
          options={seasonOptions}
          isCustom={isCustomSeason}
          onChange={onSeasonChange}
          onCustomChange={onCustomSeasonChange}
          customPlaceholder="Ingresá la temporada"
          disabled={disabled}
        />
      </div>
    </Box>
  );
}
