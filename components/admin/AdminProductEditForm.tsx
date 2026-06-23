"use client";

import { useState, useEffect, useMemo, FormEvent } from "react";
import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import Form from "@/components/ui/Form";
import FormField from "@/components/ui/FormField";
import Label from "@/components/ui/Label";
import Textarea from "@/components/ui/Textarea";
import Div from "@/components/ui/Div";
import { InlineAlert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/button";
import ImageUploadDropzone from "@/components/ui/ImageUploadDropzone";
import SortableImageGrid, { type SortableImageItem } from "@/components/ui/SortableImageGrid";
import AdminProductIdentityFields, {
  type ProductVersionFieldValue,
} from "@/components/admin/AdminProductIdentityFields";
import type { Product, ProductOptionsResponse, UpdateProductRequest } from "@/lib/api";
import { adminUploadApi, productsApi } from "@/lib/api";
import { generateSlug, normalizeShirtType } from "@/lib/utils";
import { validateRequiredProductFields } from "@/lib/product-form-validation";
import {
  productToRows,
  rowsToPayload,
  type SizeStockRow,
} from "@/lib/product-inventory";
import ProductSizeStockFields from "@/components/admin/ProductSizeStockFields";
import {
  buildProductName,
  DEFAULT_PRODUCT_TYPE,
  extractKitTypeFromName,
  extractProductTypeFromName,
} from "@/lib/product-name";

function resolveOptionValue(
  value: string,
  options: string[]
): { value: string; isCustom: boolean } {
  const trimmed = value.trim();
  if (!trimmed) return { value: "", isCustom: false };

  const match = options.find(
    (option) => option.trim().toLocaleLowerCase() === trimmed.toLocaleLowerCase()
  );
  if (match) return { value: match, isCustom: false };

  return { value: trimmed, isCustom: true };
}

type AdminProductEditFormProps = {
  product: Product;
  onSave: (payload: UpdateProductRequest) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: string;
  getToken: () => string | null;
};

export default function AdminProductEditForm({
  product,
  onSave,
  onCancel,
  isSubmitting = false,
  error = "",
  getToken,
}: AdminProductEditFormProps) {
  const initialShirtType = normalizeShirtType(product.type) ?? "";
  const initialProductType = extractProductTypeFromName(product.name) ?? DEFAULT_PRODUCT_TYPE;
  const initialKitType = extractKitTypeFromName(product.name) ?? "";
  const [name, setName] = useState(product.name);
  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(
    () =>
      product.name.trim() !==
      buildProductName({
        productType: initialProductType,
        kitType: initialKitType,
        team: product.team ?? "",
        season: product.season ?? "",
        type: initialShirtType,
      }).trim()
  );
  const [productType, setProductType] = useState(initialProductType);
  const [kitType, setKitType] = useState(initialKitType);
  const [description, setDescription] = useState(product.description ?? "");
  const [team, setTeam] = useState(product.team ?? "");
  const [league, setLeague] = useState(product.league ?? "");
  const [isCustomTeam, setIsCustomTeam] = useState(false);
  const [isCustomLeague, setIsCustomLeague] = useState(false);
  const [isCustomProductType, setIsCustomProductType] = useState(false);
  const [isCustomKitType, setIsCustomKitType] = useState(false);
  const [isCustomSeason, setIsCustomSeason] = useState(false);
  const [season, setSeason] = useState(product.season ?? "");
  const [price, setPrice] = useState(String(product.price));
  const [sizeRows, setSizeRows] = useState<SizeStockRow[]>(() => productToRows(product));
  const [inventoryError, setInventoryError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [shirtType, setShirtType] = useState<ProductVersionFieldValue>(initialShirtType);
  const [isActive, setIsActive] = useState(product.is_active);
  const [currentImageUrls, setCurrentImageUrls] = useState<string[]>(product.image_urls ?? []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [imageError, setImageError] = useState("");
  const [productOptions, setProductOptions] = useState<ProductOptionsResponse>({
    teams: [],
    leagues: [],
    sizes: [],
    seasons: [],
    productTypes: [],
    kitTypes: [],
  });

  const generatedName = useMemo(
    () => buildProductName({ productType, kitType, team, season, type: shirtType }),
    [productType, kitType, team, season, shirtType]
  );

  useEffect(() => {
    let isMounted = true;

    const loadProductOptions = async () => {
      const response = await productsApi.getOptions();
      if (isMounted && response.data) {
        setProductOptions(response.data);
      }
    };

    void loadProductOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const teamValue = product.team ?? "";
    const leagueValue = product.league ?? "";
    const seasonValue = product.season ?? "";
    const shirtTypeValue = normalizeShirtType(product.type) ?? "";
    const productTypeValue = extractProductTypeFromName(product.name) ?? DEFAULT_PRODUCT_TYPE;
    const kitTypeValue = extractKitTypeFromName(product.name) ?? "";
    const resolvedTeam = resolveOptionValue(teamValue, productOptions.teams);
    const resolvedLeague = resolveOptionValue(leagueValue, productOptions.leagues);
    const resolvedSeason = resolveOptionValue(seasonValue, productOptions.seasons);
    const resolvedProductType = resolveOptionValue(productTypeValue, productOptions.productTypes);
    const resolvedKitType = resolveOptionValue(kitTypeValue, productOptions.kitTypes);
    const expectedName = buildProductName({
      productType: productTypeValue,
      kitType: kitTypeValue,
      team: teamValue,
      season: seasonValue,
      type: shirtTypeValue,
    });

    /* eslint-disable react-hooks/set-state-in-effect */
    setName(product.name);
    setIsNameManuallyEdited(product.name.trim() !== expectedName.trim());
    setProductType(resolvedProductType.value || productTypeValue);
    setKitType(resolvedKitType.value || kitTypeValue);
    setDescription(product.description ?? "");
    setTeam(resolvedTeam.value);
    setLeague(resolvedLeague.value);
    setIsCustomTeam(resolvedTeam.isCustom);
    setIsCustomLeague(resolvedLeague.isCustom);
    setIsCustomProductType(resolvedProductType.isCustom);
    setIsCustomKitType(resolvedKitType.isCustom);
    setIsCustomSeason(resolvedSeason.isCustom);
    setSeason(resolvedSeason.value);
    setPrice(String(product.price));
    setSizeRows(productToRows(product));
    setInventoryError("");
    setFieldError("");
    setShirtType(shirtTypeValue);
    setIsActive(product.is_active);
    setCurrentImageUrls(product.image_urls ?? []);
    setNewFiles([]);
    setImageError("");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [product, productOptions]);

  const removeCurrentImage = (index: number) => {
    setCurrentImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const currentImageItems: SortableImageItem[] = currentImageUrls.map((url, index) => ({
    id: `${url}-${index}`,
    src: url,
  }));

  const handleCurrentImagesReorder = (items: SortableImageItem[]) => {
    setCurrentImageUrls(items.map((item) => item.src));
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setIsNameManuallyEdited(value.trim() !== generatedName.trim());
  };

  const syncNameFromFields = (next: {
    productType?: string;
    kitType?: string;
    team?: string;
    season?: string;
    shirtType?: ProductVersionFieldValue;
  }) => {
    if (isNameManuallyEdited) return;

    setName(
      buildProductName({
        productType: next.productType ?? productType,
        kitType: next.kitType ?? kitType,
        team: next.team ?? team,
        season: next.season ?? season,
        type: next.shirtType ?? shirtType,
      })
    );
  };

  const handleProductTypeChange = (value: string) => {
    setProductType(value);
    syncNameFromFields({ productType: value });
  };

  const handleKitTypeChange = (value: string) => {
    setKitType(value);
    syncNameFromFields({ kitType: value });
  };

  const handleTeamChange = (value: string) => {
    setTeam(value);
    syncNameFromFields({ team: value });
  };

  const handleSeasonChange = (value: string) => {
    setSeason(value);
    syncNameFromFields({ season: value });
  };

  const handleShirtTypeChange = (value: ProductVersionFieldValue) => {
    setShirtType(value);
    syncNameFromFields({ shirtType: value });
  };

  const regenerateName = () => {
    setName(generatedName);
    setIsNameManuallyEdited(false);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setImageError("");
    setInventoryError("");
    setFieldError("");

    const requiredError = validateRequiredProductFields({ name });
    if (requiredError) {
      setFieldError(requiredError);
      return;
    }

    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) return;
    const inventory = rowsToPayload(sizeRows, { allowEmpty: true });
    if (!inventory) {
      setInventoryError("Revisá el stock de cada talle (número ≥ 0).");
      return;
    }

    let finalUrls = [...currentImageUrls];
    if (newFiles.length > 0) {
      const token = getToken();
      if (!token) {
        setImageError("Sesión expirada. Volvé a iniciar sesión.");
        return;
      }
      const teamSlug = generateSlug(team) || "producto";
      const productSlug = generateSlug(name) || `producto-${Date.now()}`;
      const formData = new FormData();
      formData.append("team_slug", teamSlug);
      formData.append("product_slug", productSlug);
      newFiles.forEach((file) => formData.append("images", file));
      const uploadResponse = await adminUploadApi.uploadProductImages(formData, token);
      if (uploadResponse.error || !uploadResponse.data?.urls?.length) {
        setImageError(uploadResponse.error ?? "Error al subir las imágenes.");
        return;
      }
      finalUrls = [...currentImageUrls, ...uploadResponse.data.urls];
    }
    if (finalUrls.length === 0) {
      setImageError("El producto debe tener al menos una imagen.");
      return;
    }

    const payload: UpdateProductRequest = {
      name: name.trim(),
      product_type: productType.trim(),
      kit_type: kitType.trim() || undefined,
      preserve_name: isNameManuallyEdited,
      description: description.trim() || undefined,
      team: team.trim(),
      league: league.trim(),
      season: season.trim(),
      price: priceNum,
      sizes: inventory.sizes,
      stock_by_sizes: inventory.stock_by_sizes,
      type: shirtType,
      is_active: isActive,
      image_urls: finalUrls,
    };
    onSave(payload);
  };

  return (
    <Box display="flex" direction="col" gap="4">
      <Form onSubmit={handleSubmit} spacing="md">
        <AdminProductIdentityFields
          idPrefix="edit"
          disabled={isSubmitting}
          name={name}
          onNameChange={handleNameChange}
          onRegenerateName={regenerateName}
          isNameManuallyEdited={isNameManuallyEdited}
          productType={productType}
          productTypeOptions={productOptions.productTypes}
          isCustomProductType={isCustomProductType}
          onProductTypeChange={handleProductTypeChange}
          onCustomProductTypeChange={setIsCustomProductType}
          kitType={kitType}
          kitTypeOptions={productOptions.kitTypes}
          isCustomKitType={isCustomKitType}
          onKitTypeChange={handleKitTypeChange}
          onCustomKitTypeChange={setIsCustomKitType}
          team={team}
          teamOptions={productOptions.teams}
          isCustomTeam={isCustomTeam}
          onTeamChange={handleTeamChange}
          onCustomTeamChange={setIsCustomTeam}
          league={league}
          leagueOptions={productOptions.leagues}
          isCustomLeague={isCustomLeague}
          onLeagueChange={setLeague}
          onCustomLeagueChange={setIsCustomLeague}
          season={season}
          seasonOptions={productOptions.seasons}
          isCustomSeason={isCustomSeason}
          onSeasonChange={handleSeasonChange}
          onCustomSeasonChange={setIsCustomSeason}
          shirtType={shirtType}
          onShirtTypeChange={handleShirtTypeChange}
        />

        <Div spacing="md">
          <FormField htmlFor="edit-description" label="Descripción">
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormField>
        </Div>

        <Div spacing="md" className="flex items-center gap-2">
          <input
            id="edit-is-active"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="size-4"
          />
          <Label htmlFor="edit-is-active">
            <Typography variant="body2">Activo</Typography>
          </Label>
        </Div>

        <Div spacing="md">
          <ProductSizeStockFields
            idPrefix="edit"
            rows={sizeRows}
            onRowsChange={setSizeRows}
            disabled={isSubmitting}
            sizeOptions={productOptions.sizes}
            minRows={0}
            priceField={{
              id: "edit-price",
              value: price,
              onChange: setPrice,
            }}
          />
        </Div>

        <Div spacing="md">
          <FormField label="Imágenes actuales">
            {currentImageUrls.length === 0 && newFiles.length === 0 ? (
              <Typography variant="body2" color="muted">
                No hay imágenes. Agregá nuevas abajo.
              </Typography>
            ) : (
              <>
                {currentImageUrls.length > 0 && (
                  <>
                    <Typography variant="caption" color="muted" mb={1}>
                      Arrastrá las imágenes para cambiar el orden de aparición.
                    </Typography>
                    <SortableImageGrid
                      items={currentImageItems}
                      onReorder={handleCurrentImagesReorder}
                      onRemove={removeCurrentImage}
                      showOrderBadge
                    />
                  </>
                )}
              </>
            )}
          </FormField>
        </Div>

        <Div spacing="md">
          <FormField label="Agregar o reemplazar imágenes" required>
            <ImageUploadDropzone files={newFiles} onFilesChange={setNewFiles} />
          </FormField>
        </Div>

        {(error || fieldError || imageError || inventoryError) && (
          <InlineAlert variant="destructive">
            <Typography variant="body2" color="destructive">
              {error || fieldError || imageError || inventoryError}
            </Typography>
          </InlineAlert>
        )}
        <Box display="flex" gap="2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        </Box>
      </Form>
    </Box>
  );
}
