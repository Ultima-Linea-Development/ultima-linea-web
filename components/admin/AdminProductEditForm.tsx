"use client";

import { useState, useEffect, FormEvent } from "react";
import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import Form from "@/components/ui/Form";
import Label from "@/components/ui/Label";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Div from "@/components/ui/Div";
import { InlineAlert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/button";
import ImageUploadDropzone from "@/components/ui/ImageUploadDropzone";
import SortableImageGrid, { type SortableImageItem } from "@/components/ui/SortableImageGrid";
import ProductOptionSelect from "@/components/admin/ProductOptionSelect";
import type { Product, ProductOptionsResponse, UpdateProductRequest } from "@/lib/api";
import { adminUploadApi, productsApi } from "@/lib/api";
import { generateSlug, normalizeShirtType, type ShirtType } from "@/lib/utils";
import { formFieldClassName } from "@/lib/form-field-classes";
import { validateRequiredProductFields } from "@/lib/product-form-validation";
import {
  productToRows,
  rowsToPayload,
  type SizeStockRow,
} from "@/lib/product-inventory";
import ProductSizeStockFields from "@/components/admin/ProductSizeStockFields";

const CATEGORY_OPTIONS: Array<{ value: "club" | "national" | "retro"; label: string }> = [
  { value: "club", label: "Club" },
  { value: "national", label: "Selección" },
  { value: "retro", label: "Retro" },
];

const SHIRT_TYPE_OPTIONS: Array<{ value: ShirtType; label: string }> = [
  { value: "fan", label: "Fan" },
  { value: "player", label: "Jugador" },
];

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
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description ?? "");
  const [team, setTeam] = useState(product.team ?? "");
  const [league, setLeague] = useState(product.league ?? "");
  const [isCustomTeam, setIsCustomTeam] = useState(false);
  const [isCustomLeague, setIsCustomLeague] = useState(false);
  const [season, setSeason] = useState(product.season ?? "");
  const [price, setPrice] = useState(String(product.price));
  const [sizeRows, setSizeRows] = useState<SizeStockRow[]>(() => productToRows(product));
  const [inventoryError, setInventoryError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [category, setCategory] = useState<Product["category"]>(product.category ?? "club");
  const [shirtType, setShirtType] = useState<ShirtType>(
    () => normalizeShirtType(product.type) ?? "fan"
  );
  const [isActive, setIsActive] = useState(product.is_active);
  const [currentImageUrls, setCurrentImageUrls] = useState<string[]>(product.image_urls ?? []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [imageError, setImageError] = useState("");
  const [productOptions, setProductOptions] = useState<ProductOptionsResponse>({
    teams: [],
    leagues: [],
    sizes: [],
  });

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
    const resolvedTeam = resolveOptionValue(teamValue, productOptions.teams);
    const resolvedLeague = resolveOptionValue(leagueValue, productOptions.leagues);

    setName(product.name);
    setDescription(product.description ?? "");
    setTeam(resolvedTeam.value);
    setLeague(resolvedLeague.value);
    setIsCustomTeam(resolvedTeam.isCustom);
    setIsCustomLeague(resolvedLeague.isCustom);
    setSeason(product.season ?? "");
    setPrice(String(product.price));
    setSizeRows(productToRows(product));
    setInventoryError("");
    setFieldError("");
    setCategory(product.category ?? "club");
    setShirtType(normalizeShirtType(product.type) ?? "fan");
    setIsActive(product.is_active);
    setCurrentImageUrls(product.image_urls ?? []);
    setNewFiles([]);
    setImageError("");
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setImageError("");
    setInventoryError("");
    setFieldError("");

    const requiredError = validateRequiredProductFields({ name, team, league, season });
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
      description: description.trim() || undefined,
      team: team.trim(),
      league: league.trim(),
      season: season.trim(),
      price: priceNum,
      sizes: inventory.sizes,
      stock_by_sizes: inventory.stock_by_sizes,
      category,
      type: shirtType,
      is_active: isActive,
      image_urls: finalUrls,
    };
    onSave(payload);
  };

  return (
    <Box display="flex" direction="col" gap="4">
      <Form onSubmit={handleSubmit} spacing="md">
        <Div spacing="md">
          <Label htmlFor="edit-name" display="block" spacing="sm">
            <Typography variant="body2" mb={1}>
              Nombre *
            </Typography>
            <Input
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Label>
        </Div>

        <Div spacing="md">
          <Label htmlFor="edit-description" display="block" spacing="sm">
            <Typography variant="body2" mb={1}>
              Descripción
            </Typography>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Label>
        </Div>

        <Box display="flex" gap="4" className="flex-wrap">
          <Div spacing="md" className="flex-1 min-w-[200px]">
            <ProductOptionSelect
              id="edit-team"
              label="Equipo"
              value={team}
              options={productOptions.teams}
              isCustom={isCustomTeam}
              onChange={setTeam}
              onCustomChange={setIsCustomTeam}
              customPlaceholder="Ingresá el equipo"
              disabled={isSubmitting}
              required
            />
          </Div>
          <Div spacing="md" className="flex-1 min-w-[200px]">
            <ProductOptionSelect
              id="edit-league"
              label="Liga"
              value={league}
              options={productOptions.leagues}
              isCustom={isCustomLeague}
              onChange={setLeague}
              onCustomChange={setIsCustomLeague}
              customPlaceholder="Ingresá la liga"
              disabled={isSubmitting}
              required
            />
          </Div>
        </Box>

        <Box display="flex" gap="4" className="flex-wrap">
          <Div spacing="md" className="flex-1 min-w-[120px]">
            <Label htmlFor="edit-season" display="block" spacing="sm">
              <Typography variant="body2" mb={1}>
                Temporada *
              </Typography>
              <Input
                id="edit-season"
                type="text"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                placeholder="24/25"
                required
              />
            </Label>
          </Div>
          <Div spacing="md" className="flex-1 min-w-[120px]">
            <Label htmlFor="edit-category" display="block" spacing="sm">
              <Typography variant="body2" mb={1}>
                Categoría *
              </Typography>
              <select
                id="edit-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as Product["category"])}
                required
                className={formFieldClassName}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Label>
          </Div>
          <Div spacing="md" className="flex-1 min-w-[120px]">
            <Label htmlFor="edit-shirt-type" display="block" spacing="sm">
              <Typography variant="body2" mb={1}>
                Tipo *
              </Typography>
              <select
                id="edit-shirt-type"
                value={shirtType}
                onChange={(e) => setShirtType(e.target.value as ShirtType)}
                required
                className={formFieldClassName}
              >
                {SHIRT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Label>
          </Div>
        </Box>

        <Box display="flex" gap="4" className="flex-wrap items-end">
          <Div spacing="md" className="flex-1 min-w-[120px]">
            <Label htmlFor="edit-price" display="block" spacing="sm">
              <Typography variant="body2" mb={1}>
                Precio *
              </Typography>
              <Input
                id="edit-price"
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </Label>
          </Div>
          <Div spacing="md" className="flex items-center gap-2 pb-2">
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
        </Box>

        <Div spacing="md">
          <ProductSizeStockFields
            idPrefix="edit"
            rows={sizeRows}
            onRowsChange={setSizeRows}
            disabled={isSubmitting}
            sizeOptions={productOptions.sizes}
            minRows={0}
          />
        </Div>

        <Div spacing="md">
          <Typography variant="body2" mb={1}>
            Imágenes actuales
          </Typography>
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
        </Div>

        <Div spacing="md">
          <Typography variant="body2" mb={1}>
            Agregar o reemplazar imágenes *
          </Typography>
          <ImageUploadDropzone files={newFiles} onFilesChange={setNewFiles} />
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
