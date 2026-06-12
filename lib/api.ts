/** API integrada en Next.js (migración desde Go). Usar /api como base. */
const resolveApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }

  if (typeof window === "undefined") {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
      `http://localhost:${process.env.PORT || "3000"}`;

    return `${siteUrl.replace(/\/$/, "")}/api`;
  }

  return "/api";
};

export const getApiBaseUrl = () => resolveApiBaseUrl();

/** Misma base que getApiBaseUrl; la API integrada maneja multipart en el mismo origen. */
export const getDirectApiUrl = () => resolveApiBaseUrl();

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  token?: string;
};

type ApiResponse<T> = {
  data?: T;
  error?: string;
  status: number;
};

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = "GET",
    headers = {},
    body,
    token,
  } = options;

  const url = `${getApiBaseUrl()}${endpoint}`;
  const requestHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (token) {
    requestHeaders["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit & { next?: { revalidate: number } } = {
    method,
    headers: requestHeaders,
  };

  if (method === "GET" && typeof window === "undefined") {
    config.next = { revalidate: 60 };
  }

  if (body && method !== "GET") {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        error: data.message || data.error || `Error ${response.status}`,
        status: response.status,
      };
    }

    return {
      data: data as T,
      status: response.status,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Error de conexión",
      status: 0,
    };
  }
}

export const api = {
  get: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: "GET", token }),

  post: <T>(endpoint: string, body: unknown, token?: string) =>
    request<T>(endpoint, { method: "POST", body, token }),

  put: <T>(endpoint: string, body: unknown, token?: string) =>
    request<T>(endpoint, { method: "PUT", body, token }),

  delete: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: "DELETE", token }),
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
};

export type Product = {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  team?: string;
  league?: string;
  season?: string;
  price: number;
  stock?: number;
  size?: string;
  sizes?: string[];
  stock_by_sizes?: Record<string, number>;
  image_urls: string[];
  category?: "club" | "national" | "retro";
  /** FAN / PLAYER (API puede enviar mayúsculas) */
  type?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ProductFilters = {
  team?: string;
  league?: string;
  category?: "club" | "national" | "retro";
  size?: string;
  season?: string;
  is_active?: boolean;
  page?: number;
  per_page?: number;
};

export type AdminProductSearchFilters = Pick<
  ProductFilters,
  "category" | "size" | "league" | "is_active"
>;

export type PaginatedProductsResponse = {
  products: Product[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

export type SearchResponse = {
  query: string;
  total: number;
  results: Product[];
};

export type ProductOptionsResponse = {
  teams: string[];
  leagues: string[];
  sizes: string[];
};

export type CreateProductRequest = {
  name: string;
  description?: string;
  team?: string;
  league?: string;
  season?: string;
  price: number;
  sizes: string[];
  stock_by_sizes: Record<string, number>;
  image_urls: string[];
  category?: "club" | "national" | "retro";
  type?: "fan" | "player";
  is_active?: boolean;
};

export type UpdateProductRequest = Partial<CreateProductRequest>;

export type Sale = {
  id: string;
  product_id: string;
  product_name: string;
  product_sku?: string;
  size: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
  updated_at: string;
};

export type CreateSaleRequest = {
  product_id: string;
  size?: string;
  quantity: number;
  sale_date?: string;
};

export type UpdateSaleRequest = {
  sale_date: string;
};

export type CreateSaleResponse = {
  sale: Sale;
  product: Product;
};

export type PaginatedSalesResponse = {
  sales: Sale[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

export type AvailableProductsResponse = {
  products: Product[];
};

export type AdminProfile = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
};

export type UpdateProfileRequest = {
  first_name?: string;
  last_name?: string;
  phone?: string;
};

export const authApi = {
  login: (credentials: LoginRequest) =>
    api.post<LoginResponse>("/auth/login", credentials),
};

export const productsApi = {
  getAll: (filters?: ProductFilters) => {
    const params = new URLSearchParams();
    if (filters?.team) params.append("team", filters.team);
    if (filters?.league) params.append("league", filters.league);
    if (filters?.category) params.append("category", filters.category);
    if (filters?.size) params.append("size", filters.size);
    if (filters?.season) params.append("season", filters.season);
    if (filters?.page != null) params.append("page", String(filters.page));
    if (filters?.per_page != null) params.append("per_page", String(filters.per_page));

    const query = params.toString();
    return api.get<PaginatedProductsResponse>(`/products${query ? `?${query}` : ""}`);
  },

  getById: (id: string) => api.get<Product>(`/products/${id}`),
  getBySlug: (slug: string) => api.get<Product>(`/products/slug/${slug}`),

  search: (query: string, filters?: Pick<ProductFilters, "category" | "size" | "league">) => {
    const params = new URLSearchParams();
    params.append("q", query);
    if (filters?.category) params.append("category", filters.category);
    if (filters?.size) params.append("size", filters.size);
    if (filters?.league) params.append("league", filters.league);
    return api.get<SearchResponse>(`/products/search?${params.toString()}`);
  },

  getOptions: () => api.get<ProductOptionsResponse>("/products/options"),
};

export type UploadProductImagesResponse = {
  urls: string[];
};

async function requestFormData<T>(
  endpoint: string,
  formData: FormData,
  token?: string
): Promise<ApiResponse<T>> {
  const url = `${getDirectApiUrl()}${endpoint}`;
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        error: data.error || data.message || `Error ${response.status}`,
        status: response.status,
      };
    }

    return { data: data as T, status: response.status };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Error de conexión",
      status: 0,
    };
  }
}

export const adminProductsApi = {
  getById: (id: string, token: string) =>
    api.get<Product>(`/admin/products/${id}`, token),

  getAll: (token: string, filters?: ProductFilters) => {
    const params = new URLSearchParams();
    if (filters?.team) params.append("team", filters.team);
    if (filters?.league) params.append("league", filters.league);
    if (filters?.category) params.append("category", filters.category);
    if (filters?.size) params.append("size", filters.size);
    if (filters?.season) params.append("season", filters.season);
    if (filters?.is_active !== undefined) {
      params.append("is_active", String(filters.is_active));
    }
    if (filters?.page != null) params.append("page", String(filters.page));
    if (filters?.per_page != null) params.append("per_page", String(filters.per_page));

    const query = params.toString();
    return api.get<PaginatedProductsResponse>(
      `/admin/products${query ? `?${query}` : ""}`,
      token
    );
  },

  search: (token: string, query: string, filters?: AdminProductSearchFilters) => {
    const params = new URLSearchParams();
    params.append("q", query);
    if (filters?.category) params.append("category", filters.category);
    if (filters?.size) params.append("size", filters.size);
    if (filters?.league) params.append("league", filters.league);
    if (filters?.is_active !== undefined) {
      params.append("is_active", String(filters.is_active));
    }
    return api.get<SearchResponse>(`/admin/products/search?${params.toString()}`, token);
  },

  create: (product: CreateProductRequest, token: string) =>
    api.post<Product>("/admin/products", product, token),

  update: (id: string, product: UpdateProductRequest, token: string) =>
    api.put<Product>(`/admin/products/${id}`, product, token),

  delete: (id: string, token: string) =>
    api.delete<{ message: string }>(`/admin/products/${id}`, token),
};

export const adminSalesApi = {
  getAll: (token: string, filters?: { page?: number; per_page?: number }) => {
    const params = new URLSearchParams();
    if (filters?.page != null) params.append("page", String(filters.page));
    if (filters?.per_page != null) params.append("per_page", String(filters.per_page));

    const query = params.toString();
    return api.get<PaginatedSalesResponse>(`/admin/sales${query ? `?${query}` : ""}`, token);
  },

  create: (sale: CreateSaleRequest, token: string) =>
    api.post<CreateSaleResponse>("/admin/sales", sale, token),

  update: (id: string, sale: UpdateSaleRequest, token: string) =>
    api.put<{ sale: Sale }>(`/admin/sales/${id}`, sale, token),

  delete: (id: string, token: string) =>
    api.delete<{ message: string; product?: Product }>(`/admin/sales/${id}`, token),

  getAvailableProducts: (token: string) =>
    api.get<AvailableProductsResponse>("/admin/sales/products", token),
};

export const adminUploadApi = {
  uploadProductImages: (formData: FormData, token: string) =>
    requestFormData<UploadProductImagesResponse>("/admin/upload/product-images", formData, token),
};

export const adminProfileApi = {
  get: (token: string) => api.get<AdminProfile>("/admin/profile", token),

  update: (profile: UpdateProfileRequest, token: string) =>
    api.put<AdminProfile>("/admin/profile", profile, token),
};

export const healthApi = {
  check: () => api.get<{ status: string; message: string }>("/health"),
};
