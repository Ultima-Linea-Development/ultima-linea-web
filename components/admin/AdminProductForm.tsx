"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Box from "@/components/layout/Box";
import Form from "@/components/ui/Form";
import Textarea from "@/components/ui/Textarea";
import Div from "@/components/ui/Div";
import { InlineAlert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/button";
import ImageUploadDropzone from "@/components/ui/ImageUploadDropzone";
import ProductSizeStockFields from "@/components/admin/ProductSizeStockFields";
import AdminProductIdentityFields, {
  type ProductVersionFieldValue,
} from "@/components/admin/AdminProductIdentityFields";
import Typography from "@/components/ui/Typography";
import { getToken } from "@/lib/auth";
import {
  adminProductsApi,
  adminUploadApi,
  productsApi,
  type CreateProductRequest,
  type ProductOptionsResponse,
} from "@/lib/api";
import { generateSlug } from "@/lib/utils";
import FormField from "@/components/ui/FormField";
import { validateRequiredProductFields } from "@/lib/product-form-validation";
import { emptySizeStockRow, rowsToPayload, type SizeStockRow } from "@/lib/product-inventory";
import { buildProductName, DEFAULT_PRODUCT_TYPE } from "@/lib/product-name";

type AdminProductFormProps = {
  onSuccess: () => void;
  onCancel?: () => void;
};

function getInitialFormState() {
  return {
    name: "",
    productType: DEFAULT_PRODUCT_TYPE,
    kitType: "",
    description: "",
    team: "",
    league: "",
    isCustomTeam: false,
    isCustomLeague: false,
    isCustomProductType: false,
    isCustomKitType: false,
    isCustomSeason: false,
    season: "",
    price: "",
    sizeRows: [emptySizeStockRow()] as SizeStockRow[],
    imageFiles: [] as File[],
    shirtType: "" as ProductVersionFieldValue,
  };
}

export default function AdminProductForm({ onSuccess, onCancel }: AdminProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(false);
  const [productType, setProductType] = useState(DEFAULT_PRODUCT_TYPE);
  const [kitType, setKitType] = useState("");
  const [description, setDescription] = useState("");
  const [team, setTeam] = useState("");
  const [league, setLeague] = useState("");
  const [isCustomTeam, setIsCustomTeam] = useState(false);
  const [isCustomLeague, setIsCustomLeague] = useState(false);
  const [isCustomProductType, setIsCustomProductType] = useState(false);
  const [isCustomKitType, setIsCustomKitType] = useState(false);
  const [isCustomSeason, setIsCustomSeason] = useState(false);
  const [season, setSeason] = useState("");
  const [price, setPrice] = useState("");
  const [sizeRows, setSizeRows] = useState<SizeStockRow[]>(() => [emptySizeStockRow()]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [shirtType, setShirtType] = useState<ProductVersionFieldValue>("");
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

  const resetForm = () => {
    const initial = getInitialFormState();
    setName(initial.name);
    setIsNameManuallyEdited(false);
    setProductType(initial.productType);
    setKitType(initial.kitType);
    setDescription(initial.description);
    setTeam(initial.team);
    setLeague(initial.league);
    setIsCustomTeam(initial.isCustomTeam);
    setIsCustomLeague(initial.isCustomLeague);
    setIsCustomProductType(initial.isCustomProductType);
    setIsCustomKitType(initial.isCustomKitType);
    setIsCustomSeason(initial.isCustomSeason);
    setSeason(initial.season);
    setPrice(initial.price);
    setSizeRows(initial.sizeRows);
    setImageFiles(initial.imageFiles);
    setShirtType(initial.shirtType);
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const token = getToken();
    if (!token) {
      setError("Sesión expirada. Volvé a iniciar sesión.");
      setIsSubmitting(false);
      return;
    }

    const requiredError = validateRequiredProductFields({ name });
    if (requiredError) {
      setError(requiredError);
      setIsSubmitting(false);
      return;
    }

    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setError("Precio debe ser un número válido.");
      setIsSubmitting(false);
      return;
    }

    const inventory = rowsToPayload(sizeRows);
    if (!inventory) {
      setError("Completá al menos un talle con stock válido (número ≥ 0).");
      setIsSubmitting(false);
      return;
    }

    if (imageFiles.length === 0) {
      setError("Subí al menos una imagen.");
      setIsSubmitting(false);
      return;
    }

    const teamSlug = generateSlug(team) || "producto";
    const productSlug = generateSlug(name) || `producto-${Date.now()}`;

    const formData = new FormData();
    formData.append("team_slug", teamSlug);
    formData.append("product_slug", productSlug);
    imageFiles.forEach((file) => formData.append("images", file));

    try {
      const uploadResponse = await adminUploadApi.uploadProductImages(formData, token);

      if (uploadResponse.error || !uploadResponse.data?.urls?.length) {
        const msg =
          uploadResponse.status === 401
            ? "Sesión expirada o token inválido. Volvé a iniciar sesión."
            : uploadResponse.error || "Error al subir las imágenes.";
        setError(msg);
        setIsSubmitting(false);
        return;
      }

      const payload: CreateProductRequest = {
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
        image_urls: uploadResponse.data.urls,
        type: shirtType,
      };

      const response = await adminProductsApi.create(payload, token);

      if (response.error || !response.data) {
        setError(response.error || "Error al crear el producto");
        setIsSubmitting(false);
        return;
      }

      resetForm();
      onSuccess();
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit} spacing="md">
      <AdminProductIdentityFields
        idPrefix="add"
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
        <FormField htmlFor="description" label="Descripción">
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>
      </Div>

      <Div spacing="md">
        <ProductSizeStockFields
          idPrefix="add"
          rows={sizeRows}
          onRowsChange={setSizeRows}
          disabled={isSubmitting}
          sizeOptions={productOptions.sizes}
          required
          priceField={{
            id: "price",
            value: price,
            onChange: setPrice,
          }}
        />
      </Div>

      <Div spacing="md" className="space-y-2">
        <FormField label="Imágenes del producto" required>
          <ImageUploadDropzone files={imageFiles} onFilesChange={setImageFiles} />
        </FormField>
      </Div>

      {error && (
        <InlineAlert variant="destructive">
          <Typography variant="body2" color="destructive">
            {error}
          </Typography>
        </InlineAlert>
      )}

      <Box display="flex" gap="2" className="flex-wrap">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creando..." : "Crear producto"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        )}
      </Box>
    </Form>
  );
}
