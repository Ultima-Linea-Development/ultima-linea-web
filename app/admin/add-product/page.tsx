"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Box from "@/components/layout/Box";
import Spinner from "@/components/ui/Spinner";
import Typography from "@/components/ui/Typography";
import Form from "@/components/ui/Form";
import Label from "@/components/ui/Label";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Div from "@/components/ui/Div";
import Alert from "@/components/ui/Alert";
import { Button } from "@/components/ui/button";
import AdminShell from "@/components/admin/AdminShell";
import ImageUploadDropzone from "@/components/ui/ImageUploadDropzone";
import { isAdmin, getUserFromToken, clearAuth, getToken } from "@/lib/auth";
import {
  adminProductsApi,
  adminUploadApi,
  productsApi,
  type CreateProductRequest,
  type ProductOptionsResponse,
} from "@/lib/api";
import { generateSlug } from "@/lib/utils";
import { formFieldClassName } from "@/lib/form-field-classes";
import { validateRequiredProductFields } from "@/lib/product-form-validation";
import { emptySizeStockRow, rowsToPayload, type SizeStockRow } from "@/lib/product-inventory";
import ProductSizeStockFields from "@/components/admin/ProductSizeStockFields";
import ProductOptionSelect from "@/components/admin/ProductOptionSelect";

const CATEGORY_OPTIONS: Array<{ value: CreateProductRequest["category"]; label: string }> = [
  { value: "club", label: "Club" },
  { value: "national", label: "Selección" },
  { value: "retro", label: "Retro" },
];

export default function AdminAddProductPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [team, setTeam] = useState("");
  const [league, setLeague] = useState("");
  const [isCustomTeam, setIsCustomTeam] = useState(false);
  const [isCustomLeague, setIsCustomLeague] = useState(false);
  const [season, setSeason] = useState("");
  const [price, setPrice] = useState("");
  const [sizeRows, setSizeRows] = useState<SizeStockRow[]>(() => [emptySizeStockRow()]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<CreateProductRequest["category"]>("club");
  const [productOptions, setProductOptions] = useState<ProductOptionsResponse>({
    teams: [],
    leagues: [],
    sizes: [],
  });

  useEffect(() => {
    const checkAuth = () => {
      const user = getUserFromToken();

      if (!user || !isAdmin()) {
        clearAuth();
        router.push("/login?redirect=/admin/add-product");
        return;
      }

      setIsAuthorized(true);
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    let isMounted = true;

    const loadProductOptions = async () => {
      const response = await productsApi.getOptions();

      if (isMounted && response.data) {
        setProductOptions(response.data);
      }
    };

    loadProductOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setIsSubmitting(true);

    const token = getToken();
    if (!token) {
      setError("Sesión expirada. Volvé a iniciar sesión.");
      setIsSubmitting(false);
      return;
    }

    const requiredError = validateRequiredProductFields({ name, team, league, season });
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
        description: description.trim() || undefined,
        team: team.trim(),
        league: league.trim(),
        season: season.trim(),
        price: priceNum,
        sizes: inventory.sizes,
        stock_by_sizes: inventory.stock_by_sizes,
        image_urls: uploadResponse.data.urls,
        category,
      };

      const response = await adminProductsApi.create(payload, token);

      if (response.error || !response.data) {
        setError(response.error || "Error al crear el producto");
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      setName("");
      setDescription("");
      setTeam("");
      setLeague("");
      setIsCustomTeam(false);
      setIsCustomLeague(false);
      setSeason("");
      setPrice("");
      setSizeRows([emptySizeStockRow()]);
      setImageFiles([]);
      setCategory("club");
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" direction="col" gap="4" className="min-h-[60vh] items-center justify-center">
        <Spinner />
      </Box>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <AdminShell>
      <Box display="flex" direction="col" gap="6" className="max-w-2xl">
        <Typography variant="h1">Subir producto</Typography>

        <Form onSubmit={handleSubmit} spacing="md">
          <Div spacing="md">
            <Label htmlFor="name" display="block" spacing="sm">
              <Typography variant="body2" mb={1}>
                Nombre *
              </Typography>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Nombre del producto"
              />
            </Label>
          </Div>

          <Div spacing="md">
            <Label htmlFor="description" display="block" spacing="sm">
              <Typography variant="body2" mb={1}>
                Descripción
              </Typography>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Label>
          </Div>

          <Box display="flex" gap="4" className="flex-wrap">
            <Div spacing="md" className="flex-1 min-w-[200px]">
              <ProductOptionSelect
                id="team"
                label="Equipo"
                value={team}
                options={productOptions.teams}
                isCustom={isCustomTeam}
                onChange={setTeam}
                onCustomChange={setIsCustomTeam}
                customPlaceholder="Ingresá el equipo"
                required
              />
            </Div>
            <Div spacing="md" className="flex-1 min-w-[200px]">
              <ProductOptionSelect
                id="league"
                label="Liga"
                value={league}
                options={productOptions.leagues}
                isCustom={isCustomLeague}
                onChange={setLeague}
                onCustomChange={setIsCustomLeague}
                customPlaceholder="Ingresá la liga"
                required
              />
            </Div>
          </Box>

          <Box display="flex" gap="4" className="flex-wrap">
            <Div spacing="md" className="flex-1 min-w-[120px]">
              <Label htmlFor="season" display="block" spacing="sm">
                <Typography variant="body2" mb={1}>
                  Temporada *
                </Typography>
                <Input
                  id="season"
                  type="text"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  placeholder="24/25"
                  required
                />
              </Label>
            </Div>
            <Div spacing="md" className="flex-1 min-w-[120px]">
              <Label htmlFor="category" display="block" spacing="sm">
                <Typography variant="body2" mb={1}>
                  Categoría *
                </Typography>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CreateProductRequest["category"])}
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
          </Box>

          <Box display="flex" gap="4" className="flex-wrap">
            <Div spacing="md" className="flex-1 min-w-[120px]">
              <Label htmlFor="price" display="block" spacing="sm">
                <Typography variant="body2" mb={1}>
                  Precio *
                </Typography>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  placeholder="50000"
                />
              </Label>
            </Div>
          </Box>

          <Div spacing="md">
            <ProductSizeStockFields
              idPrefix="add"
              rows={sizeRows}
              onRowsChange={setSizeRows}
              disabled={isSubmitting}
              sizeOptions={productOptions.sizes}
              required
            />
          </Div>

          <Div spacing="md" className="space-y-2">
            <Typography variant="body2" mb={1}>
              Imágenes del producto *
            </Typography>
            <ImageUploadDropzone
              files={imageFiles}
              onFilesChange={setImageFiles}
            />
          </Div>

          <Alert
            open={!!error}
            message={error}
            variant="destructive"
            onClose={() => setError("")}
          />

          <Alert
            open={!!success}
            message="Producto creado correctamente."
            variant="default"
            onClose={() => setSuccess(false)}
          />

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creando..." : "Crear producto"}
          </Button>
        </Form>
      </Box>
    </AdminShell>
  );
}
