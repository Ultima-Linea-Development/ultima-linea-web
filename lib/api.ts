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

export type AuthUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
  must_change_password?: boolean;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type CompleteSetupRequest = {
  password: string;
  phone?: string;
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
  created_by?: string;
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

export type AdminSalesSearchResponse = {
  query: string;
  total: number;
  results: Sale[];
};

export type AdminUsersSearchResponse = {
  query: string;
  total: number;
  results: AdminUser[];
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
  type?: "fan" | "player" | "retro";
  is_active?: boolean;
};

export type UpdateProductRequest = Partial<CreateProductRequest>;

export type SaleLineItem = {
  product_id: string;
  product_name: string;
  product_sku?: string;
  size: string;
  quantity: number;
  unit_price: number;
  total: number;
};

export type SaleSellerType = "internal" | "external";

export type ExternalSeller = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type ExternalSellersResponse = {
  sellers: ExternalSeller[];
};

export type SupplierOrderItemType = "FAN" | "PLAYER" | "RETRO";

export type SupplierOrderStatus = "draft" | "sent" | "partial" | "completed" | "cancelled";

export type SupplierOrderLineItem = {
  id: string;
  product_id?: string;
  shirt_name: string;
  quantity: number;
  type: SupplierOrderItemType;
  sizes: string;
  quantity_by_sizes?: Record<string, number>;
  dorsal?: string;
  description?: string;
  link?: string;
  downloaded: boolean;
  cleaned: boolean;
  price: number;
  ordered: boolean;
};

export type Supplier = {
  id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  link?: string;
  created_at: string;
  updated_at: string;
};

export type SuppliersResponse = {
  suppliers: Supplier[];
};

export type SupplierOrder = {
  id: string;
  name: string;
  supplier_id?: string;
  supplier_name?: string;
  status: SupplierOrderStatus;
  notes?: string;
  tracking_number?: string;
  tracking_link?: string;
  paid_at?: string;
  sent_at?: string;
  received_at?: string;
  items: SupplierOrderLineItem[];
  created_by?: string;
  created_at: string;
  updated_at: string;
};

export type CreateSupplierOrderItemRequest = {
  id?: string;
  product_id?: string;
  shirt_name: string;
  quantity: number;
  type: SupplierOrderItemType;
  sizes: string;
  quantity_by_sizes?: Record<string, number>;
  dorsal?: string;
  description?: string;
  link?: string;
  downloaded?: boolean;
  cleaned?: boolean;
  price: number;
  ordered?: boolean;
};

export type CreateSupplierOrderRequest = {
  name: string;
  supplier_id?: string;
  supplier_name?: string;
  supplier_contact_name?: string;
  supplier_email?: string;
  supplier_phone?: string;
  supplier_notes?: string;
  supplier_link?: string;
  status?: SupplierOrderStatus;
  notes?: string;
  order_date?: string;
  tracking_number?: string;
  tracking_link?: string;
  paid_at?: string;
  sent_at?: string;
  received_at?: string;
  items: CreateSupplierOrderItemRequest[];
};

export type UpdateSupplierOrderRequest = Partial<CreateSupplierOrderRequest>;

export type CreateSupplierRequest = {
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  link?: string;
};

export type UpdateSupplierRequest = Partial<CreateSupplierRequest>;

export type PaginatedSupplierOrdersResponse = {
  orders: SupplierOrder[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

export type AdminSupplierOrdersSearchResponse = {
  query: string;
  total: number;
  results: SupplierOrder[];
};

export type CommissionStatus = "pending" | "exported" | "cancelled";

export type CommissionLineItem = Omit<
  SupplierOrderLineItem,
  "downloaded" | "cleaned" | "ordered"
>;

export type Commission = {
  id: string;
  name: string;
  customer_name: string;
  customer_contact?: string;
  seller_user_id?: string;
  external_seller_id?: string;
  external_seller_name?: string;
  status: CommissionStatus;
  supplier_order_id?: string;
  supplier_order_name?: string;
  notes?: string;
  items: CommissionLineItem[];
  created_by?: string;
  created_at: string;
  updated_at: string;
};

export type CreateCommissionItemRequest = Omit<
  CreateSupplierOrderItemRequest,
  "downloaded" | "cleaned" | "ordered"
>;

export type CreateCommissionRequest = {
  customer_name: string;
  customer_contact?: string;
  commission_date?: string;
  seller_type?: SaleSellerType;
  seller_user_id?: string;
  external_seller_id?: string;
  external_seller_name?: string;
  notes?: string;
  items: CreateCommissionItemRequest[];
};

export type UpdateCommissionRequest = Partial<CreateCommissionRequest> & {
  status?: CommissionStatus;
};

export type ExportCommissionRequest = {
  supplier_order_id: string;
};

export type PaginatedCommissionsResponse = {
  commissions: Commission[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

export type AdminCommissionsSearchResponse = {
  query: string;
  total: number;
  results: Commission[];
};

export type Sale = {
  id: string;
  items: SaleLineItem[];
  total: number;
  created_by?: string;
  external_seller_id?: string;
  external_seller_name?: string;
  transfer_alias?: string;
  description?: string;
  created_at: string;
  updated_at: string;
};

export type SaleAssignableUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
};

export type SaleAssignableUsersResponse = {
  users: SaleAssignableUser[];
};

export type CreateSaleItemRequest = {
  product_id: string;
  size?: string;
  quantity: number;
  unit_price?: number;
};

export type CreateSaleRequest = {
  items: CreateSaleItemRequest[];
  sale_date?: string;
  seller_type?: SaleSellerType;
  created_by?: string;
  external_seller_id?: string;
  external_seller_name?: string;
  transfer_alias?: string;
  description?: string;
};

export type UpdateSaleRequest = {
  sale_date?: string;
  seller_type?: SaleSellerType;
  created_by?: string;
  external_seller_id?: string;
  external_seller_name?: string;
  transfer_alias?: string;
  description?: string;
};

export type CreateSaleResponse = {
  sale: Sale;
  products?: Product[];
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

export type AdminUser = AdminProfile & {
  created_at: string;
  updated_at: string;
  is_primary_admin?: boolean;
  must_change_password?: boolean;
};

export type PaginatedUsersResponse = {
  users: AdminUser[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

export type UserRole = "admin" | "vendedor";

export type CreateUserRequest = {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  password: string;
  role: UserRole;
};

export type UpdateUserRequest = {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
};

export type UpdateProfileRequest = {
  first_name?: string;
  last_name?: string;
  phone?: string;
};

export const authApi = {
  login: (credentials: LoginRequest) =>
    api.post<LoginResponse>("/auth/login", credentials),

  completeSetup: (payload: CompleteSetupRequest, token: string) =>
    api.post<LoginResponse>("/auth/complete-setup", payload, token),
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

  search: (token: string, query: string) => {
    const params = new URLSearchParams();
    params.append("q", query);
    return api.get<AdminSalesSearchResponse>(`/admin/sales/search?${params.toString()}`, token);
  },

  create: (sale: CreateSaleRequest, token: string) =>
    api.post<CreateSaleResponse>("/admin/sales", sale, token),

  update: (id: string, sale: UpdateSaleRequest, token: string) =>
    api.put<{ sale: Sale }>(`/admin/sales/${id}`, sale, token),

  delete: (id: string, token: string) =>
    api.delete<{ message: string; product?: Product }>(`/admin/sales/${id}`, token),

  getAvailableProducts: (token: string) =>
    api.get<AvailableProductsResponse>("/admin/sales/products", token),

  getAssignableUsers: (token: string) =>
    api.get<SaleAssignableUsersResponse>("/admin/sales/users", token),

  getExternalSellers: (token: string) =>
    api.get<ExternalSellersResponse>("/admin/sales/external-sellers", token),
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

export const adminUsersApi = {
  getAll: (token: string, filters?: { page?: number; per_page?: number }) => {
    const params = new URLSearchParams();
    if (filters?.page != null) params.append("page", String(filters.page));
    if (filters?.per_page != null) params.append("per_page", String(filters.per_page));

    const query = params.toString();
    return api.get<PaginatedUsersResponse>(`/admin/users${query ? `?${query}` : ""}`, token);
  },

  search: (token: string, query: string) => {
    const params = new URLSearchParams();
    params.append("q", query);
    return api.get<AdminUsersSearchResponse>(`/admin/users/search?${params.toString()}`, token);
  },

  create: (user: CreateUserRequest, token: string) =>
    api.post<AdminUser>("/admin/users", user, token),

  getById: (id: string, token: string) => api.get<AdminUser>(`/admin/users/${id}`, token),

  update: (id: string, user: UpdateUserRequest, token: string) =>
    api.put<AdminUser>(`/admin/users/${id}`, user, token),

  requestPasswordChange: (id: string, token: string) =>
    api.post<AdminUser>(`/admin/users/${id}/request-password-change`, {}, token),

  delete: (id: string, token: string) =>
    api.delete<{ message: string }>(`/admin/users/${id}`, token),
};

export const adminOrdersApi = {
  getAll: (token: string, filters?: { page?: number; per_page?: number }) => {
    const params = new URLSearchParams();
    if (filters?.page != null) params.append("page", String(filters.page));
    if (filters?.per_page != null) params.append("per_page", String(filters.per_page));

    const query = params.toString();
    return api.get<PaginatedSupplierOrdersResponse>(
      `/admin/orders${query ? `?${query}` : ""}`,
      token
    );
  },

  search: (token: string, query: string) => {
    const params = new URLSearchParams();
    params.append("q", query);
    return api.get<AdminSupplierOrdersSearchResponse>(
      `/admin/orders/search?${params.toString()}`,
      token
    );
  },

  create: (order: CreateSupplierOrderRequest, token: string) =>
    api.post<{ order: SupplierOrder }>("/admin/orders", order, token),

  update: (id: string, order: UpdateSupplierOrderRequest, token: string) =>
    api.put<{ order: SupplierOrder }>(`/admin/orders/${id}`, order, token),

  delete: (id: string, token: string) =>
    api.delete<{ message: string }>(`/admin/orders/${id}`, token),
};

export const adminCommissionsApi = {
  getAll: (token: string, filters?: { page?: number; per_page?: number }) => {
    const params = new URLSearchParams();
    if (filters?.page != null) params.append("page", String(filters.page));
    if (filters?.per_page != null) params.append("per_page", String(filters.per_page));

    const query = params.toString();
    return api.get<PaginatedCommissionsResponse>(
      `/admin/commissions${query ? `?${query}` : ""}`,
      token
    );
  },

  search: (token: string, query: string) => {
    const params = new URLSearchParams();
    params.append("q", query);
    return api.get<AdminCommissionsSearchResponse>(
      `/admin/commissions/search?${params.toString()}`,
      token
    );
  },

  create: (commission: CreateCommissionRequest, token: string) =>
    api.post<{ commission: Commission }>("/admin/commissions", commission, token),

  update: (id: string, commission: UpdateCommissionRequest, token: string) =>
    api.put<{ commission: Commission }>(`/admin/commissions/${id}`, commission, token),

  exportToOrder: (id: string, payload: ExportCommissionRequest, token: string) =>
    api.post<{ commission: Commission; order: SupplierOrder }>(
      `/admin/commissions/${id}/export`,
      payload,
      token
    ),

  delete: (id: string, token: string) =>
    api.delete<{ message: string }>(`/admin/commissions/${id}`, token),
};

export const adminSuppliersApi = {
  getAll: (token: string) => api.get<SuppliersResponse>("/admin/suppliers", token),

  create: (supplier: CreateSupplierRequest, token: string) =>
    api.post<{ supplier: Supplier }>("/admin/suppliers", supplier, token),

  update: (id: string, supplier: UpdateSupplierRequest, token: string) =>
    api.put<{ supplier: Supplier }>(`/admin/suppliers/${id}`, supplier, token),
};

export const healthApi = {
  check: () => api.get<{ status: string; message: string }>("/health"),
};
