import { NextRequest, NextResponse } from "next/server";
import { isAdminRole, isStaffRole } from "@/lib/roles";
import { validateToken, JwtClaims } from "./jwt";

export type AuthContext = JwtClaims;

export function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status });
}

export function requireAuth(request: NextRequest): AuthContext | NextResponse {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return jsonError("Authorization header required", 401);
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return jsonError("Invalid authorization header format", 401);
  }

  try {
    return validateToken(parts[1]);
  } catch {
    return jsonError("Invalid or expired token", 401);
  }
}

export function requireAdmin(auth: AuthContext | NextResponse): AuthContext | NextResponse {
  if (auth instanceof NextResponse) return auth;
  if (!isAdminRole(auth.role)) {
    return jsonError("Admin access required", 403);
  }
  return auth;
}

type RequireStaffOptions = {
  skipSetupCheck?: boolean;
};

export function requireStaff(
  auth: AuthContext | NextResponse,
  options?: RequireStaffOptions
): AuthContext | NextResponse {
  if (auth instanceof NextResponse) return auth;
  if (!isStaffRole(auth.role)) {
    return jsonError("Access denied", 403);
  }
  if (!options?.skipSetupCheck && auth.must_change_password) {
    return jsonError("Debes completar la configuración inicial", 403);
  }
  return auth;
}

export function assertCanDeleteOwnedResource(
  auth: AuthContext,
  createdBy?: string | null
): NextResponse | null {
  if (isAdminRole(auth.role)) return null;
  if (!createdBy || createdBy !== auth.user_id) {
    return jsonError("No tenés permiso para eliminar este recurso", 403);
  }
  return null;
}

export function assertCanModifyOwnedResource(
  auth: AuthContext,
  createdBy?: string | null
): NextResponse | null {
  if (isAdminRole(auth.role)) return null;
  if (!createdBy || createdBy !== auth.user_id) {
    return jsonError("No tenés permiso para editar este recurso", 403);
  }
  return null;
}

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
