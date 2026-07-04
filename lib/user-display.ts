import type { SaleAssignableUser } from "@/lib/api";

export const UNKNOWN_USER_LABEL = "Usuario no disponible";

export function formatPersonName(
  firstName?: string | null,
  lastName?: string | null,
  fallback = "—"
): string {
  const name = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return name || fallback;
}

export function formatAssignableUserLabel(
  user: Pick<SaleAssignableUser, "first_name" | "last_name" | "email">
): string {
  const name = formatPersonName(user.first_name, user.last_name, "");
  return name || user.email;
}

export function getAssignableUserLabel(
  users: SaleAssignableUser[],
  userId?: string | null,
  missingLabel = "—"
): string {
  if (!userId) return "—";
  const normalizedId = userId.trim();
  const user = users.find(
    (item) => item.id === normalizedId || item.id.trim() === normalizedId
  );
  if (!user) return missingLabel;
  return formatAssignableUserLabel(user);
}

export function buildUserDisplayNameMap(
  users: Array<Pick<SaleAssignableUser, "id" | "first_name" | "last_name" | "email">>
): Map<string, string> {
  const map = new Map<string, string>();
  for (const user of users) {
    map.set(user.id, formatAssignableUserLabel(user));
    map.set(user.id.trim(), formatAssignableUserLabel(user));
  }
  return map;
}
