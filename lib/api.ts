/** API integrada en Next.js (migración desde Go). Usar /api como base. */
const resolveApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
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
  season?: string;
  page?: number;
  per_page?: number;
};

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
    if (filters?.season) params.append("season", filters.season);
    if (filters?.page != null) params.append("page", String(filters.page));
    if (filters?.per_page != null) params.append("per_page", String(filters.per_page));

    const query = params.toString();
    return api.get<PaginatedProductsResponse>(`/products${query ? `?${query}` : ""}`);
  },

  getById: (id: string) => api.get<Product>(`/products/${id}`),
  getBySlug: (slug: string) => api.get<Product>(`/products/slug/${slug}`),

  search: (query: string) => {
    const params = new URLSearchParams();
    params.append("q", query);
    return api.get<SearchResponse>(`/products/search?${params.toString()}`);
  },
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
  create: (product: CreateProductRequest, token: string) =>
    api.post<Product>("/admin/products", product, token),

  update: (id: string, product: UpdateProductRequest, token: string) =>
    api.put<Product>(`/admin/products/${id}`, product, token),

  delete: (id: string, token: string) =>
    api.delete<{ message: string }>(`/admin/products/${id}`, token),
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
