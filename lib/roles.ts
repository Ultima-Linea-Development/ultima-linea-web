export const ROLES = {
  ADMIN: "admin",
  VENDEDOR: "vendedor",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const USER_ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: ROLES.ADMIN, label: "Admin" },
  { value: ROLES.VENDEDOR, label: "Vendedor" },
];

export function isAdminRole(role?: string | null): boolean {
  return role === ROLES.ADMIN;
}

export function isVendedorRole(role?: string | null): boolean {
  return role === ROLES.VENDEDOR;
}

export function isStaffRole(role?: string | null): boolean {
  return isAdminRole(role) || isVendedorRole(role);
}

export function formatUserRole(role?: string | null): string {
  if (!role) return "—";
  const option = USER_ROLE_OPTIONS.find((item) => item.value === role);
  return option?.label ?? role.charAt(0).toUpperCase() + role.slice(1);
}

export function canDeleteOwnedResource(
  role: string | undefined | null,
  userId: string | undefined | null,
  createdBy?: string | null
): boolean {
  if (isAdminRole(role)) return true;
  if (isVendedorRole(role)) {
    return Boolean(userId && createdBy && createdBy === userId);
  }
  return false;
}

export function canEditOwnedResource(
  role: string | undefined | null,
  userId: string | undefined | null,
  createdBy?: string | null
): boolean {
  return canDeleteOwnedResource(role, userId, createdBy);
}
